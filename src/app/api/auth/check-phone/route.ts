import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { signToken } from "@/lib/auth";
import { User } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const userId = await redis.get<string>(keys.userByPhone(phone));
    if (!userId) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const user = await redis.get<User>(keys.user(userId));
    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Silent Auth: Generate a token for this existing customer
    const token = await signToken({ userId: user.id, role: user.role });

    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      exists: true,
      token,
      user: safeUser,
    }, { status: 200 });
  } catch (err) {
    console.error("CheckPhoneError:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
