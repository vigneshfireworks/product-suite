import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Partner } from "@/types";
import { generateId } from "@/lib/utils";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  // Public: find the partner contact for a specific business (name + phone only).
  // Used by customers on the checkout confirmation screen.
  if (businessId) {
    const ids = await redis.smembers<string[]>(keys.partners());
    if (!ids || ids.length === 0) return NextResponse.json(null);
    const all = await Promise.all(ids.map(id => redis.get<Partner>(keys.partner(id))));
    const match = all.filter(Boolean).find(p =>
      p?.businesses?.some((b: any) => b.businessId === businessId)
    );
    if (!match) return NextResponse.json(null);
    return NextResponse.json({ name: match.name, phone: match.phone });
  }

  // Admin-only: full partner list
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const ids = await redis.smembers<string[]>(keys.partners());
  if (!ids || ids.length === 0) return NextResponse.json([]);
  const partners = await Promise.all(ids.map((id) => redis.get<Partner>(keys.partner(id))));
  const safe = partners.filter(Boolean).map((p) => {
    if (!p) return null;
    const { passwordHash: _, ...rest } = p;
    return rest;
  });
  return NextResponse.json(safe.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, email, phone, password, businesses } = body;
  if (!name || !email || !phone || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await redis.get(keys.partnerByEmail(email));
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const id = generateId();
  const passwordHash = await hashPassword(password);
  const partner: Partner = {
    id,
    name,
    email,
    phone,
    passwordHash,
    businesses: businesses || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.partner(id), partner);
  await redis.set(keys.partnerByEmail(email), id);
  await redis.sadd(keys.partners(), id);
  const { passwordHash: _, ...safe } = partner;
  await recordHistory("partner", id, "create", safe, auth.userId);
  return NextResponse.json(safe, { status: 201 });
}
