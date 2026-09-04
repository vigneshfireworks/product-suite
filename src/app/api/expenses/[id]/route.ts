import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Expense } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const expense = await redis.get<Expense>(keys.expense(id));
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated: Expense = {
    ...expense,
    title:         body.title         ?? expense.title,
    amount:        body.amount        != null ? Number(body.amount) : expense.amount,
    description:   body.description   ?? expense.description,
    date:          body.date          ?? expense.date,
    paymentMode:   body.paymentMode   ?? expense.paymentMode,
    transactionId: body.transactionId ?? expense.transactionId,
    paymentStatus: body.paymentStatus ?? expense.paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(keys.expense(id), updated);
  await recordHistory("expense", id, "update", { before: expense, after: updated }, auth.userId, expense.businessId);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const expense = await redis.get<Expense>(keys.expense(id));
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await redis.del(keys.expense(id));
  await redis.srem(keys.expensesByBusiness(expense.businessId), id);
  await recordHistory("expense", id, "delete", expense, auth.userId, expense.businessId);
  return NextResponse.json({ ok: true });
}
