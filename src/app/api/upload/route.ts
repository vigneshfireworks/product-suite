import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const businessName = (formData.get("businessName") as string) || "misc";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext     = file.name.split(".").pop() || "bin";
  const safeBiz = businessName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const pathname = `uploads/${safeBiz}/${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ url: blob.url });
}
