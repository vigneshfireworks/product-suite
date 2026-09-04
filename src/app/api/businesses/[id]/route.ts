import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Business } from "@/types";
import { slugify } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await redis.get<Business>(keys.business(id));
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(business);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Business>(keys.business(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated: Business = {
    ...existing,
    ...body,
    id,
    slug: body.name ? slugify(body.name) : existing.slug,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(keys.business(id), updated);
  await recordHistory("business", id, "update", { old: existing, new: updated }, auth.userId);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Business>(keys.business(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await redis.del(keys.business(id));
  await redis.srem(keys.businesses(), id);
  await recordHistory("business", id, "delete", { deleted: existing }, auth.userId);
  return NextResponse.json({ ok: true });
}
