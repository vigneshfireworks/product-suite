import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Business } from "@/types";

/** Finance businesses are disabled for all users by default; others are enabled. */
function defaultAccess(category: string): boolean {
  return category !== "finance";
}

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/users/[id]/business-access
 * Returns { [businessId]: boolean } — merged defaults + admin overrides.
 * Admin can query any user; a customer can only query themselves.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;

  const { id: userId } = await params;

  // Only admin or self
  if (auth.role !== "admin" && auth.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin always sees everything — return empty map (caller uses all businesses)
  if (auth.role === "admin" && auth.userId === userId) {
    // Still return real access so admin can preview what a user sees
  }

  const ids = (await redis.smembers<string[]>(keys.businesses())) || [];
  const businesses = (
    await Promise.all(ids.map(id => redis.get<Business>(keys.business(id))))
  ).filter(Boolean) as Business[];

  const stored =
    (await redis.get<Record<string, boolean>>(keys.userBusinessAccess(userId))) || {};

  const access: Record<string, boolean> = {};
  for (const b of businesses) {
    if (!b.isActive) continue; // inactive businesses never shown
    access[b.id] = stored[b.id] !== undefined ? stored[b.id] : defaultAccess(b.category);
  }

  return NextResponse.json(access);
}

/**
 * PATCH /api/users/[id]/business-access
 * Body: { businessId: string, enabled: boolean }
 * Admin-only — updates stored override for one business.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id: userId } = await params;
  const body = await req.json();
  const { businessId, enabled } = body as { businessId?: string; enabled?: boolean };

  if (!businessId || enabled === undefined) {
    return NextResponse.json({ error: "Missing businessId or enabled" }, { status: 400 });
  }

  const stored =
    (await redis.get<Record<string, boolean>>(keys.userBusinessAccess(userId))) || {};
  stored[businessId] = Boolean(enabled);
  await redis.set(keys.userBusinessAccess(userId), stored);

  return NextResponse.json({ success: true, businessId, enabled });
}
