import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { productId, quantity, userId } = await req.json();

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: "Missing productId or quantity" }, { status: 400 });
    }

    if (!userId) {
      // For guest users, we rely on client-side storage.
      // If you want to store guest carts in Redis, you'd need a guestSessionId.
      return NextResponse.json({ success: true, message: "Client-side update only" });
    }

    const cartKey = `cart:${userId}`;

    if (quantity <= 0) {
      await redis.hdel(cartKey, productId);
    } else {
      await redis.hset(cartKey, { [productId]: quantity.toString() });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
