import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";

export interface AboutContent {
  headline: string;
  tagline: string;
  story: string;
  ceoName: string;
  ceoTitle: string;
  ceoPhone: string;
  email: string;
  mission: string;
  founded: string;
  ceoPhoto1?: string;
  ceoPhoto2?: string;
  updatedAt?: string;
}

const defaultContent: AboutContent = {
  headline: "About Vinks Crackers",
  tagline: "Quality, Trust, and Joy in every spark.",
  story: ``,
  ceoName: "Vigneshwaran Ramachandran",
  ceoTitle: "CEO & Founder",
  ceoPhone: "7373872638",
  email: "vignesh.crackersfireworks@gmail.com",
  mission: "Our mission is to make shopping, finance, and market insights simple and accessible for everyone — from festive crackers to wedding invitations, curated gifts to expert financial tools.",
  founded: "2024",
  ceoPhoto1: "",
  ceoPhoto2: "",
};

export async function GET() {
  // FORCED OVERRIDE: Bypass Redis to ensure new content is shown
  return NextResponse.json(defaultContent);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const content: AboutContent = {
    headline:   body.headline   ?? "",
    tagline:    body.tagline    ?? "",
    story:      body.story      ?? "",
    ceoName:    body.ceoName    ?? "",
    ceoTitle:   body.ceoTitle   ?? "",
    ceoPhone:   body.ceoPhone   ?? "",
    email:      body.email      ?? "",
    mission:    body.mission    ?? "",
    founded:    body.founded    ?? "",
    ceoPhoto1:  body.ceoPhoto1  ?? "",
    ceoPhoto2:  body.ceoPhoto2  ?? "",
    updatedAt:  new Date().toISOString(),
  };

  await redis.set(keys.aboutContent(), content);
  return NextResponse.json(content);
}
