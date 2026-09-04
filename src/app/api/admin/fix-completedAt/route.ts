/**
 * Data fix: stamp completedAt = NOW on every delivered_completed order
 * that is missing completedAt, OR where completedAt predates when the
 * status actually changed (i.e. was set by old code at a wrong lifecycle point).
 *
 * Also accepts GET so it can be triggered from a browser navigation URL.
 *
 * POST /api/admin/fix-completedAt  — admin only
 * GET  /api/admin/fix-completedAt  — admin only (same action, easier to call)
 */
import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Business, Order } from "@/types";

async function runFix(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const now = new Date().toISOString();

  const bizIds = (await redis.smembers<string[]>(keys.businesses())) || [];
  const businesses = (
    await Promise.all(bizIds.map(id => redis.get<Business>(keys.business(id))))
  ).filter(Boolean) as Business[];

  let fixed = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const biz of businesses) {
    const orderIds = (await redis.smembers<string[]>(keys.ordersByBusiness(biz.id))) || [];
    const orders = (
      await Promise.all(orderIds.map(id => redis.get<Order>(keys.order(id))))
    ).filter(Boolean) as Order[];

    for (const order of orders) {
      if (order.status !== "delivered_completed") { skipped++; continue; }

      // Use updatedAt if it's more recent than completedAt (it reflects when status was last changed),
      // otherwise stamp NOW to ensure the order appears in the current month's revenue.
      const bestDate = order.updatedAt && order.updatedAt > (order.completedAt || "")
        ? order.updatedAt
        : now;

      if (order.completedAt === bestDate) { skipped++; continue; }

      details.push(`${order.id} : ${order.completedAt ?? "none"} → ${bestDate}`);
      await redis.set(keys.order(order.id), { ...order, completedAt: bestDate });
      fixed++;
    }
  }

  return NextResponse.json({
    message: `Fixed ${fixed} order(s). Skipped ${skipped} (non-completed or already correct).`,
    fixed,
    skipped,
    details,
  });
}

export const GET  = runFix;
export const POST = runFix;
