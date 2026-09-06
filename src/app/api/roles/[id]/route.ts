import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Role } from "../route";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const role = await redis.get<Role>(keys.role(id));
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete a system role" }, { status: 403 });

  await redis.del(keys.role(id));
  await redis.srem(keys.roles(), id);
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const role = await redis.get<Role>(keys.role(id));
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot edit a system role" }, { status: 403 });

  const body = await req.json();
  const updated: Role = {
    ...role,
    name: body.name?.trim() ?? role.name,
    description: body.description?.trim() ?? role.description,
    color: body.color ?? role.color,
    permissions: Array.isArray(body.permissions) ? body.permissions : role.permissions,
  };

  await redis.set(keys.role(id), updated);
  return NextResponse.json(updated);
}
