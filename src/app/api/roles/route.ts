import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { generateId } from "@/lib/utils";

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;   // built-in roles can't be deleted
  createdAt: string;
  createdBy: string;
}

// Default system roles (always returned even if Redis is empty)
export const SYSTEM_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all features and settings.",
    color: "#ef4444",
    permissions: ["*"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "partner",
    name: "Partner",
    description: "Access to assigned business portals and analytics.",
    color: "#3b82f6",
    permissions: ["businesses.read", "orders.read", "products.read", "expenses.read"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "customer",
    name: "Customer",
    description: "Can browse, order and manage their own account.",
    color: "#22c55e",
    permissions: ["products.read", "orders.own", "profile.own"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
];

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
