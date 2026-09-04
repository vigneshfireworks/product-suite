import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

type Role = "admin" | "partner" | "customer";

export async function requireAuth(
  req: NextRequest,
  allowedRoles: Role[]
): Promise<{ userId: string; role: Role } | NextResponse> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7);
  const payload = await verifyToken(token);
  if (!payload || !payload.userId || !payload.role) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const role = payload.role as Role;
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: payload.userId as string, role };
}
