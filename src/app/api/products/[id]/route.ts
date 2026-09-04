import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Product } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await redis.get<Product>(keys.product(id));
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Product>(keys.product(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated: Product = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  await redis.set(keys.product(id), updated);
  await recordHistory("product", id, "update", { old: existing, new: updated }, auth.userId, existing.businessId);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Product>(keys.product(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await redis.del(keys.product(id));
  await redis.srem(keys.productsByBusiness(existing.businessId), id);
  await recordHistory("product", id, "delete", { id, name: existing.name, businessId: existing.businessId }, auth.userId, existing.businessId);
  return NextResponse.json({ ok: true });
}
