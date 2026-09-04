import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const ids = await redis.smembers<string[]>(keys.users());
  if (!ids || ids.length === 0) return NextResponse.json([]);
  const users = await Promise.all(ids.map((id) => redis.get<User>(keys.user(id))));
  const safe = users.filter(Boolean).map((u) => {
    if (!u) return null;
    const { passwordHash: _, ...rest } = u;
    return rest;
  });
  return NextResponse.json(safe.filter(Boolean));
}
