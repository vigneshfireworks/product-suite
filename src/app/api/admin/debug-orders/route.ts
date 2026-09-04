/**
 * Debug: show all orders for a business with their completedAt / updatedAt fields.
 * GET /api/admin/debug-orders?businessId=<id>  — admin only
 * Remove this file once the Revenue View is confirmed working.
 */
import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Order } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const orderIds = (await redis.smembers<string[]>(keys.ordersByBusiness(businessId))) || [];
  const orders   = (await Promise.all(orderIds.map(id => redis.get<Order>(keys.order(id))))).filter(Boolean) as Order[];

  return NextResponse.json(
    orders.map(o => ({
      id:          o.id,
      status:      o.status,
      totalAmount: o.totalAmount,
      createdAt:   o.createdAt,
      updatedAt:   o.updatedAt,
      completedAt: o.completedAt ?? null,
    }))
  );
}
