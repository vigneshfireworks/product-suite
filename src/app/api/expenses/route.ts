import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Expense } from "@/types";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const ids = await redis.smembers<string[]>(keys.expensesByBusiness(businessId));
  if (!ids || ids.length === 0) return NextResponse.json([]);
  const expenses = await Promise.all(ids.map((id) => redis.get<Expense>(keys.expense(id))));
  return NextResponse.json(expenses.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { businessId, title, amount, description, date, paymentMode, paymentStatus, transactionId } = body;
  if (!businessId || !title || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = generateId();
  const expense: Expense = {
    id,
    businessId,
    title,
    amount: Number(amount),
    description: description || "",
    date: date || new Date().toISOString(),
    paymentMode:   paymentMode   || undefined,
    paymentStatus: paymentStatus || undefined,
    transactionId: transactionId || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.expense(id), expense);
  await redis.sadd(keys.expensesByBusiness(businessId), id);
  await recordHistory("expense", id, "create", expense, auth.userId);
  return NextResponse.json(expense, { status: 201 });
}
