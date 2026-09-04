import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { Business, Product } from "@/types";

export interface SearchProduct extends Product {
  businessName: string;
  businessSlug: string;
}

export interface SearchResults {
  businesses: Business[];
  products: SearchProduct[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  // Fetch all businesses
  const bizIds = await redis.smembers<string[]>(keys.businesses());
  if (!bizIds || bizIds.length === 0) return NextResponse.json({ businesses: [], products: [] });

  const allBiz = (await Promise.all(bizIds.map(id => redis.get<Business>(keys.business(id))))).filter(Boolean) as Business[];
  const activeBiz = allBiz.filter(b => b.isActive);

  // Filter businesses
  const matchBiz = q
    ? activeBiz.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      )
    : activeBiz;

  // Fetch products for all active businesses (parallel per business)
  const allProducts: SearchProduct[] = [];
  await Promise.all(
    activeBiz.map(async biz => {
      const productIds = await redis.smembers<string[]>(keys.productsByBusiness(biz.id));
      if (!productIds || productIds.length === 0) return;
      const products = (await Promise.all(
        productIds.map(id => redis.get<Product>(keys.product(id)))
      )).filter(Boolean) as Product[];
      for (const p of products) {
        if (!p.isActive) continue;
        allProducts.push({ ...p, businessName: biz.name, businessSlug: biz.slug });
      }
    })
  );

  // Filter products
  const matchProducts = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q)
      )
    : allProducts;

  return NextResponse.json({ businesses: matchBiz, products: matchProducts } satisfies SearchResults);
}
