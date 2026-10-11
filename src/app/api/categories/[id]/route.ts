import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Category } from "@/types";

interface CategoryWithBiz extends Category { businessId: string; createdAt: string; }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const existing = await redis.get<CategoryWithBiz>(keys.category(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, serialNumber } = await req.json();
  const updated: CategoryWithBiz = {
    ...existing,
    name: name ? name.trim() : existing.name,
    serialNumber: serialNumber !== undefined ? Number(serialNumber) : existing.serialNumber
  };
  await redis.set(keys.category(id), updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<CategoryWithBiz>(keys.category(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await redis.del(keys.category(id));
  await redis.srem(keys.categoriesByBusiness(existing.businessId), id);
  return NextResponse.json({ ok: true });
}
