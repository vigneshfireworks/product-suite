import { NextResponse } from "next/server";
import { seedSuperAdmin } from "@/lib/auth";

export async function GET() {
  await seedSuperAdmin();
  return NextResponse.json({ ok: true });
}
