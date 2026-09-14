import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import {
  getWalletBalance,
  getWalletTransactions,
  adjustWalletBalance,
  isWalletRedeemableNow,
  WALLET_CREDIT_PERCENT,
  WALLET_VALID_FROM,
  WALLET_VALID_TO,
} from "@/lib/wallet";

/**
 * GET /api/wallet            — the caller's own wallet
 * GET /api/wallet?userId=... — admin/partner viewing a specific customer's wallet
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("userId");

  let userId = auth.userId;
  if (queryUserId) {
    if (auth.role === "customer" && queryUserId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    userId = queryUserId;
  }

  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    getWalletTransactions(userId),
  ]);

  return NextResponse.json({
    userId,
    balance,
    transactions: transactions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    creditPercent: WALLET_CREDIT_PERCENT,
    validFrom: WALLET_VALID_FROM,
    validTo: WALLET_VALID_TO,
    isRedeemableNow: isWalletRedeemableNow(),
  });
}

/**
 * PATCH /api/wallet — admin/partner manual balance adjustment.
 * Body: { userId: string, amount: number, note?: string }
 * amount > 0 adds to the wallet, amount < 0 deducts.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId, amount, note } = body as { userId?: string; amount?: number; note?: string };
  const numAmount = Number(amount);

  if (!userId || amount === undefined || Number.isNaN(numAmount) || numAmount === 0) {
    return NextResponse.json({ error: "Missing or invalid userId/amount" }, { status: 400 });
  }

  const tx = await adjustWalletBalance({ userId, amount: numAmount, note, createdBy: auth.userId });
  return NextResponse.json(tx, { status: 201 });
}
