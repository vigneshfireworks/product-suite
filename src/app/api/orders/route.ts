import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Order, Product, OrderItem } from "@/types";
import { generateId } from "@/lib/utils";

// Adjust stock for each item: delta = -qty to reduce (on order), +qty to restore (on cancel)
async function adjustStock(items: OrderItem[], delta: number) {
  await Promise.all(items.map(async item => {
    const product = await redis.get<Product>(keys.product(item.productId));
    if (!product) return;
    const newStock = Math.max(0, (product.stock ?? 0) + delta * item.quantity);
    await redis.set(keys.product(item.productId), { ...product, stock: newStock, updatedAt: new Date().toISOString() });
  }));
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const userId = searchParams.get("userId");

  let ids: string[] = [];
  if (businessId) {
    // Admin/partner fetching orders for a specific business
    ids = (await redis.smembers<string[]>(keys.ordersByBusiness(businessId))) || [];
  } else if (userId) {
    // Admin fetching orders for a specific user
    ids = (await redis.smembers<string[]>(keys.ordersByUser(userId))) || [];
  } else {
    // Customer (or admin/partner) viewing their own orders — always use caller's userId
    ids = (await redis.smembers<string[]>(keys.ordersByUser(auth.userId))) || [];
  }

  if (!ids.length) return NextResponse.json([]);
  const orders = await Promise.all(ids.map((id) => redis.get<Order>(keys.order(id))));
  return NextResponse.json(orders.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["customer", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { businessId, items, totalAmount, paymentMode, deliveryAddress, invoiceId, transactionId } = body;
  if (!businessId || !items || !totalAmount || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = generateId();
  // invoiceId is shared across all orders placed in the same checkout session.
  // If none is provided (legacy), fall back to the order's own id.
  const resolvedInvoiceId = invoiceId || id;
  const order: Order = {
    id,
    invoiceId: resolvedInvoiceId,
    businessId,
    userId: auth.userId,
    items,
    totalAmount: Number(totalAmount),
    status: "pending",
    paymentMode: paymentMode || "cash",
    transactionId: transactionId || undefined,
    deliveryAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(keys.order(id), order);
  await redis.sadd(keys.ordersByUser(auth.userId), id);
  await redis.sadd(keys.ordersByBusiness(businessId), id);
  // Reduce stock for each ordered item
  await adjustStock(items, -1);
  await recordHistory("order", id, "create", order, auth.userId);
  return NextResponse.json(order, { status: 201 });
}
