import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Product } from "@/types";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const ids = await redis.smembers<string[]>(keys.productsByBusiness(businessId));
  if (!ids || ids.length === 0) return NextResponse.json([]);
  const products = await Promise.all(ids.map((id) => redis.get<Product>(keys.product(id))));
  return NextResponse.json(products.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { businessId, name, description, originalPrice, sellingPrice, discount, quantity, stock, category, subCategory, images } = body;
  if (!businessId || !name || !originalPrice || !sellingPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = generateId();
  const product: Product = {
    id,
    businessId,
    name,
    description: description || "",
    originalPrice: Number(originalPrice),
    sellingPrice: Number(sellingPrice),
    discount: Number(discount || 0),
    quantity: Number(quantity || 1),
    stock: Number(stock || 0),
    category: category || "general",
    subCategory: subCategory || "",
    images: images || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.product(id), product);
  await redis.sadd(keys.productsByBusiness(businessId), id);
  await recordHistory("product", id, "create", product, auth.userId, businessId);
  return NextResponse.json(product, { status: 201 });
}
