import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Business } from "@/types";
import { generateId, slugify } from "@/lib/utils";

export async function GET() {
  const ids = await redis.smembers<string[]>(keys.businesses());
  if (!ids || ids.length === 0) return NextResponse.json([]);
  const businesses = await Promise.all(ids.map((id) => redis.get<Business>(keys.business(id))));
  return NextResponse.json(businesses.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, category, description, logo, displayOrder } = body;
  if (!name || !category || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = generateId();
  const business: Business = {
    id,
    name,
    slug: slugify(name),
    logo: logo || "",
    category,
    description,
    isActive: true,
    ...(displayOrder != null ? { displayOrder: Number(displayOrder) } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.business(id), business);
  await redis.sadd(keys.businesses(), id);
  await recordHistory("business", id, "create", business, auth.userId);
  return NextResponse.json(business, { status: 201 });
}
