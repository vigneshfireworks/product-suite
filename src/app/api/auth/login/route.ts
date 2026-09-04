import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { verifyPassword, signToken } from "@/lib/auth";
import { User, Partner } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const isEmail = username.includes("@");

    // ── 1. Try customer / admin lookup (by email or phone) ──────────────
    let userId: string | null = null;
    if (isEmail) {
      userId = await redis.get<string>(keys.userByEmail(username));
    } else {
      userId = await redis.get<string>(keys.userByPhone(username));
    }

    if (userId) {
      const user = await redis.get<User>(keys.user(userId));
      if (user) {
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        const role = user.role === "admin" ? "admin" : "customer";
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const token = await signToken({ userId: user.id, role });
        await redis.set(keys.user(user.id), {
          ...user,
          lastLogin: new Date().toISOString(),
          lastIp: ip,
        });

        const { passwordHash: _, ...safeUser } = user;
        return NextResponse.json({ token, user: { ...safeUser, role } });
      }
    }

    // ── 2. Try partner lookup (email only) ───────────────────────────────
    if (isEmail) {
      const partnerId = await redis.get<string>(keys.partnerByEmail(username));
      if (partnerId) {
        const partner = await redis.get<Partner>(keys.partner(partnerId));
        if (partner) {
          const valid = await verifyPassword(password, partner.passwordHash);
          if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

          const token = await signToken({ userId: partner.id, role: "partner" });
          const { passwordHash: _, ...safePartner } = partner;
          return NextResponse.json({ token, user: { ...safePartner, role: "partner" } });
        }
      }
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
