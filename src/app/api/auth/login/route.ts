import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { verifyPassword, signToken } from "@/lib/auth";
import { User, Partner } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const isEmail = username.includes("@");

    // ── 1. Try user lookup (by email or phone) ──────────────
    let userId: string | null = null;
    if (isEmail) {
      userId = await redis.get<string>(keys.userByEmail(username));
    } else {
      userId = await redis.get<string>(keys.userByPhone(username));
    }

    if (userId) {
      const user = await redis.get<User>(keys.user(userId));
      if (user) {
        // CUSTOMERS: login with phone as hidden password (automatic)
        if (user.role === "customer") {
          const ip = req.headers.get("x-forwarded-for") || "unknown";
          const token = await signToken({ userId: user.id, role: "customer" });
          await redis.set(keys.user(user.id), {
            ...user,
            lastLogin: new Date().toISOString(),
            lastIp: ip,
          });

          const { passwordHash: _, ...safeUser } = user;
          return NextResponse.json({ token, user: { ...safeUser, role: "customer" } });
        }

        // ADMINS: verify password
        if (user.role === "admin") {
          if (!password) return NextResponse.json({ error: "Password required for admin" }, { status: 401 });
          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });

          const token = await signToken({ userId: user.id, role: "admin" });
          const { passwordHash: _, ...safeUser } = user;
          return NextResponse.json({ token, user: { ...safeUser, role: "admin" } });
        }
      }
    }

    // ── 2. Try partner lookup (email only) ───────────────────────────────
    if (isEmail) {
      const partnerId = await redis.get<string>(keys.partnerByEmail(username));
      if (partnerId) {
        const partner = await redis.get<Partner>(keys.partner(partnerId));
        if (partner) {
          // Partners also require password verification
          if (!password) return NextResponse.json({ error: "Password required for partner" }, { status: 401 });
          const isValid = await verifyPassword(password, partner.passwordHash);
          if (!isValid) return NextResponse.json({ error: "Invalid partner password" }, { status: 401 });

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
