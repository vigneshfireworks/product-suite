import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { generateId } from "@/lib/utils";
import { Category } from "@/types";

interface CategoryWithBiz extends Category { businessId: string; createdAt: string; }

export async function GET(req: NextRequest) {
  const businessId = new URL(req.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const ids = (await redis.smembers<string[]>(keys.categoriesByBusiness(businessId))) || [];
  if (!ids.length) return NextResponse.json([]);
  const cats = await Promise.all(ids.map(id => redis.get<CategoryWithBiz>(keys.category(id))));
  return NextResponse.json(cats.filter(Boolean).sort((a, b) => (a!.serialNumber ?? 0) - (b!.serialNumber ?? 0)));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { businessId, name, serialNumber } = await req.json();
  if (!businessId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = generateId();
  const cat: CategoryWithBiz = {
    id,
    businessId,
    name: name.trim(),
    serialNumber: serialNumber !== undefined ? Number(serialNumber) : 0,
    createdAt: new Date().toISOString()
  };
  await redis.set(keys.category(id), cat);
  await redis.sadd(keys.categoriesByBusiness(businessId), id);
  return NextResponse.json(cat, { status: 201 });
}
