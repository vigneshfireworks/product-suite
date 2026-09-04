import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Loan } from "@/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { businessId } = await params;

  const ids = (await redis.smembers<string[]>(keys.loansByBusiness(businessId))) || [];
  if (!ids.length) return NextResponse.json([]);
  const loans = await Promise.all(ids.map((id) => redis.get<Loan>(keys.loan(id))));
  return NextResponse.json(loans.filter(Boolean));
}
