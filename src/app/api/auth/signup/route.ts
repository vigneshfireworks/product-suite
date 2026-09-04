import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { hashPassword, signToken } from "@/lib/auth";
import { User } from "@/types";
import { generateId, isValidEmail, isValidPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { name, age, sex, phone, email, address, password } = await req.json();

    if (!name || !age || !sex || !phone || !email || !address || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number (10 digits starting with 6-9)" }, { status: 400 });
    }

    const existingEmail = await redis.get(keys.userByEmail(email));
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const existingPhone = await redis.get(keys.userByPhone(phone));
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);
    const user: User = {
      id,
      name,
      email,
      phone,
      age: Number(age),
      sex,
      address,
      role: "customer",
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(keys.user(id), user);
    await redis.set(keys.userByEmail(email), id);
    await redis.set(keys.userByPhone(phone), id);
    await redis.sadd(keys.users(), id);

    const token = await signToken({ userId: id, role: "customer" });
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
