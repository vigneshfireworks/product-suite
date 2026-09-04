import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Loan } from "@/types";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  let ids: string[] = [];
  if (auth.role === "customer") {
    ids = (await redis.smembers<string[]>(keys.loansByUser(auth.userId))) || [];
  } else if (businessId) {
    ids = (await redis.smembers<string[]>(keys.loansByBusiness(businessId))) || [];
  }

  if (!ids.length) return NextResponse.json([]);
  const loans = await Promise.all(ids.map((id) => redis.get<Loan>(keys.loan(id))));
  return NextResponse.json(loans.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["customer", "admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { businessId, amount, duration, interest } = body;
  if (!businessId || !amount || !duration || !interest) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = generateId();
  const loan: Loan = {
    id,
    businessId,
    userId: auth.userId,
    amount: Number(amount),
    duration: Number(duration),
    interest: Number(interest),
    status: "pending",
    repayments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.loan(id), loan);
  await redis.sadd(keys.loansByUser(auth.userId), id);
  await redis.sadd(keys.loansByBusiness(businessId), id);
  await recordHistory("loan", id, "create", loan, auth.userId);
  return NextResponse.json(loan, { status: 201 });
}
