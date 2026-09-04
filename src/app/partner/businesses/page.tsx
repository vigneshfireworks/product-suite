"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerBusinesses() {
  const router = useRouter();
  useEffect(() => { router.push("/partner"); }, []);
  return null;
}
