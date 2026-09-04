import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const businessName = (formData.get("businessName") as string) || "misc";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const safeBiz  = businessName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

  const dir  = path.join(process.cwd(), "public", "uploads", safeBiz);
  const dest = path.join(dir, safeName);

  await mkdir(dir, { recursive: true });
  await writeFile(dest, buffer);

  return NextResponse.json({ url: `/uploads/${safeBiz}/${safeName}` });
}
