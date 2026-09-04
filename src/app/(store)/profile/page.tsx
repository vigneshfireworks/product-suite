"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-2xl font-bold text-brand-dark mb-6">My Profile</h1>
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {user.name[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-brand-dark">{user.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "Email", value: user.email },
            { label: "Phone", value: (user as any).phone || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm font-semibold text-gray-500">{label}</span>
              <span className="text-sm text-brand-dark">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push("/orders")}>My Orders</Button>
          <Button variant="danger" onClick={() => { logout(); router.push("/"); }}>Logout</Button>
        </div>
      </div>
    </div>
  );
}
