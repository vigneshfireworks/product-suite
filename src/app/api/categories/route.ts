import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { generateId } from "@/lib/utils";

interface Category { id: string; businessId: string; name: string; createdAt: string; }

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;
  const businessId = new URL(req.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const ids = (await redis.smembers<string[]>(keys.categoriesByBusiness(businessId))) || [];
  if (!ids.length) return NextResponse.json([]);
  const cats = await Promise.all(ids.map(id => redis.get<Category>(keys.category(id))));
  return NextResponse.json(cats.filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name)));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { businessId, name } = await req.json();
  if (!businessId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = generateId();
  const cat: Category = { id, businessId, name: name.trim(), createdAt: new Date().toISOString() };
  await redis.set(keys.category(id), cat);
  await redis.sadd(keys.categoriesByBusiness(businessId), id);
  return NextResponse.json(cat, { status: 201 });
}
