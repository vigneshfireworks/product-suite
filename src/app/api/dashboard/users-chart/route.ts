import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { User, Order } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const from       = searchParams.get("from");
  const to         = searchParams.get("to");

  const fromTs = from ? new Date(from).getTime()                       : null;
  const toTs   = to   ? new Date(to + "T23:59:59.999Z").getTime()      : null;

  const inRange = (dateStr: string) => {
    const ts = new Date(dateStr).getTime();
    if (fromTs && ts < fromTs) return false;
    if (toTs   && ts > toTs)   return false;
    return true;
  };

  // All registered users
  const userIds = (await redis.smembers<string[]>(keys.users())) || [];
  const users   = (await Promise.all(userIds.map(id => redis.get<User>(keys.user(id))))).filter(Boolean) as User[];
  const registeredUserIds = new Set(users.map(u => u.id));

  // Gather orders
  let allOrders: Order[] = [];
  if (businessId) {
    const oids = (await redis.smembers<string[]>(keys.ordersByBusiness(businessId))) || [];
    const orders = (await Promise.all(oids.map(id => redis.get<Order>(keys.order(id))))).filter(Boolean) as Order[];
    allOrders = orders.filter(o => inRange(o.createdAt));
  } else {
    const allOids: string[] = [];
    for (const u of users) {
      const oids = (await redis.smembers<string[]>(keys.ordersByUser(u.id))) || [];
      allOids.push(...oids);
    }
    const orders = (await Promise.all(allOids.map(id => redis.get<Order>(keys.order(id))))).filter(Boolean) as Order[];
    allOrders = orders.filter(o => inRange(o.createdAt));
  }

  const registeredOrders  = allOrders.filter(o => o.userId && registeredUserIds.has(o.userId));
  const anonymousOrders   = allOrders.filter(o => !o.userId || !registeredUserIds.has(o.userId));
  const usersWithOrders   = new Set(registeredOrders.map(o => o.userId));

  return NextResponse.json({
    registeredWithOrders: usersWithOrders.size,
    registeredNoOrders:   users.length - usersWithOrders.size,
    totalRegistered:      users.length,
    registeredOrders:     registeredOrders.length,
    anonymousOrders:      anonymousOrders.length,
    totalOrders:          allOrders.length,
  });
}
