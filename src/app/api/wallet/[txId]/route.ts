import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { WalletTransaction } from "@/types";
import { getWalletBalance, roundRupees } from "@/lib/wallet";

/**
 * DELETE /api/wallet/[txId]
 *
 * Admin/partner only. Permanently removes a single wallet transaction (a mistaken
 * manual adjustment, a duplicate credit, etc.) and reverses its effect on the
 * customer's balance so the running total stays correct.
 *
 * The transaction itself is gone, but the deletion is written to that customer's
 * history log (who deleted what, and the balance before/after) — so admins always
 * have an audit trail even for removed entries.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ txId: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { txId } = await params;

  const tx = await redis.get<WalletTransaction>(keys.walletTx(txId));
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reverse this transaction's effect on the running balance.
  const balanceBefore = await getWalletBalance(tx.userId);
  const balanceAfter = roundRupees(balanceBefore - tx.amount);
  await redis.set(keys.walletBalance(tx.userId), balanceAfter);

  // Remove the standalone record, then rewrite the user's transaction list without it.
  await redis.del(keys.walletTx(txId));
  const list = (await redis.lrange<WalletTransaction>(keys.walletTxsByUser(tx.userId), 0, -1)) || [];
  const filtered = list.filter((t) => t.id !== txId);
  await redis.del(keys.walletTxsByUser(tx.userId));
  if (filtered.length) {
    // lrange returns newest-first (writes use lpush); rpush in the same order preserves that.
    await redis.rpush(keys.walletTxsByUser(tx.userId), ...filtered);
  }

  await recordHistory(
    "wallet",
    tx.userId,
    "delete",
    { deletedTransaction: tx, balanceBefore, balanceAfter },
    auth.userId
  );

  return NextResponse.json({ deleted: true, balance: balanceAfter });
}
