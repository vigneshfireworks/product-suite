"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, isLoading]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar role="admin" />
      <main className="flex-1 lg:ml-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
