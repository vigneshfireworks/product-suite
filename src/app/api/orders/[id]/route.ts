import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Order, Product, OrderItem } from "@/types";

async function adjustStock(items: OrderItem[], delta: number) {
  await Promise.all(items.map(async item => {
    const product = await redis.get<Product>(keys.product(item.productId));
    if (!product) return;
    await redis.set(keys.product(item.productId), {
      ...product,
      stock: Math.max(0, (product.stock ?? 0) + delta * item.quantity),
      updatedAt: new Date().toISOString(),
    });
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const order = await redis.get<Order>(keys.order(id));
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Order>(keys.order(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const now = new Date().toISOString();
  const updated: Order = {
    ...existing,
    ...body,
    id,
    updatedAt: now,
    updatedBy: auth.userId,
    // Set completedAt when transitioning INTO delivered_completed from any other status.
    // This handles cases where completedAt was set by old code (e.g. at payment_success).
    // If already at delivered_completed and just being edited, leave completedAt unchanged.
    ...(body.status === "delivered_completed" && existing.status !== "delivered_completed" ? { completedAt: now } : {}),
  };

  await redis.set(keys.order(id), updated);

  // Stock adjustments on status transitions
  const wasCancel = existing.status === "cancelled";
  const isCancel  = updated.status  === "cancelled";
  if (!wasCancel && isCancel) {
    // Order just cancelled → restore stock
    await adjustStock(existing.items || [], +1);
  } else if (wasCancel && !isCancel) {
    // Order un-cancelled → reduce stock again
    await adjustStock(existing.items || [], -1);
  }

  await recordHistory("order", id, "update", { old: existing, new: updated }, auth.userId, existing.businessId);
  return NextResponse.json(updated);
}
