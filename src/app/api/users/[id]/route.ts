import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const user = await redis.get<User>(keys.user(id));
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _, ...safe } = user;
  return NextResponse.json(safe);
}
