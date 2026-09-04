import { redis, keys } from "./redis";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { User } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "viki-suite-secret-key"
);

export async function signToken(payload: object): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSessionUser(token: string): Promise<User | null> {
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;
  const user = await redis.get<User>(keys.user(payload.userId as string));
  return user;
}

export async function seedSuperAdmin() {
  const existing = await redis.get(keys.userByEmail("admin@vikisuite.com"));
  if (!existing) {
    const { v4: uuidv4 } = await import("uuid");
    const id = uuidv4();
    const adminPassword = process.env.ADMIN_PASSWORD || "Vignesh@2795";
    const passwordHash = await hashPassword(adminPassword);
    const admin: User = {
      id,
      name: "Super Admin",
      email: "admin@vikisuite.com",
      phone: "9999999999",
      age: 30,
      sex: "other",
      address: "Admin HQ",
      role: "admin",
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await redis.set(keys.user(id), admin);
    await redis.set(keys.userByEmail("admin@vikisuite.com"), id);
    await redis.set(keys.userByPhone("9999999999"), id);
    await redis.sadd(keys.users(), id);
    console.log("Super admin seeded");
  }
}
