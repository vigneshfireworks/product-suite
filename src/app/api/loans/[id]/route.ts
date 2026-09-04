import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Loan, LoanRepayment } from "@/types";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const loan = await redis.get<Loan>(keys.loan(id));
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(loan);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await redis.get<Loan>(keys.loan(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Handle repayment addition
  if (body.addRepayment) {
    const repayment: LoanRepayment = {
      id: generateId(),
      amount: Number(body.addRepayment.amount),
      date: body.addRepayment.date || new Date().toISOString(),
      updatedBy: auth.userId,
    };
    const updated: Loan = {
      ...existing,
      repayments: [...existing.repayments, repayment],
      updatedAt: new Date().toISOString(),
      updatedBy: auth.userId,
    };
    await redis.set(keys.loan(id), updated);
    await recordHistory("loan", id, "update", { repayment }, auth.userId);
    return NextResponse.json(updated);
  }

  const updated: Loan = {
    ...existing,
    ...body,
    id,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.userId,
  };

  await redis.set(keys.loan(id), updated);
  await recordHistory("loan", id, "update", { old: existing, new: updated }, auth.userId);
  return NextResponse.json(updated);
}
