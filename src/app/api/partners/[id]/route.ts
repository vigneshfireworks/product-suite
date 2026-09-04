import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Partner } from "@/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const partner = await redis.get<Partner>(keys.partner(id));
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _, ...safe } = partner;
  return NextResponse.json(safe);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Partner>(keys.partner(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated: Partner = {
    ...existing,
    ...body,
    id,
    passwordHash: existing.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(keys.partner(id), updated);
  const { passwordHash: _, ...safe } = updated;
  // Record audit for each business this partner is linked to
  for (const biz of updated.businesses) {
    await recordHistory("partner", id, "update", { before: existing.businesses, after: updated.businesses }, auth.userId, biz.businessId);
  }
  return NextResponse.json(safe);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Partner>(keys.partner(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await redis.del(keys.partner(id));
  await redis.del(keys.partnerByEmail(existing.email));
  await redis.srem(keys.partners(), id);
  await recordHistory("partner", id, "delete", { id }, auth.userId);
  return NextResponse.json({ ok: true });
}
