import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { getBusinessAudit } from "@/lib/history";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const logs = await getBusinessAudit(businessId);
  return NextResponse.json(logs);
}
