import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";

export async function GET() {
  try {
    await redis.del(keys.aboutContent());
    return NextResponse.json({ success: true, message: "About cache cleared" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
