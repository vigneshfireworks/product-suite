import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { generateId } from "@/lib/utils";
import { Role, SYSTEM_ROLES } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const ids = await redis.smembers<string[]>(keys.roles());
  const custom: Role[] = [];
  if (ids && ids.length > 0) {
    const fetched = await Promise.all(ids.map(id => redis.get<Role>(keys.role(id))));
    custom.push(...(fetched.filter(Boolean) as Role[]));
  }

  return NextResponse.json([...SYSTEM_ROLES, ...custom]);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, description, color, permissions } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  const id = generateId();
  const role: Role = {
    id,
    name: name.trim(),
    description: description?.trim() ?? "",
    color: color ?? "#6366f1",
    permissions: Array.isArray(permissions) ? permissions : [],
    isSystem: false,
    createdAt: new Date().toISOString(),
    createdBy: auth.userId,
  };

  await redis.set(keys.role(id), role);
  await redis.sadd(keys.roles(), id);
  return NextResponse.json(role, { status: 201 });
}
