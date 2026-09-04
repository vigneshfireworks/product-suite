"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, DollarSign, ScrollText, ArrowLeft, UserCircle, BarChart2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Business } from "@/types";

const subNav = [
  { label: "Dashboard",  href: "",          icon: <LayoutDashboard size={16} /> },
  { label: "Products",   href: "/products", icon: <Package size={16} /> },
  { label: "Orders",     href: "/orders",   icon: <ShoppingCart size={16} /> },
  { label: "Partners",   href: "/partners", icon: <Users size={16} /> },
  { label: "Users",      href: "/users",    icon: <UserCircle size={16} /> },
  { label: "Expenses",   href: "/expenses", icon: <DollarSign size={16} /> },
  { label: "Demand",     href: "/demand",   icon: <BarChart2 size={16} /> },
  { label: "Audit Logs", href: "/audit",    icon: <ScrollText size={16} /> },
];

export default function BusinessAdminLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetch(`/api/businesses/${id}`)
      .then(r => r.json())
      .then(d => setBusiness(d))
      .catch(() => {});
  }, [id]);

  const base = `/admin/businesses/${id}`;

  const isActive = (href: string) => {
    const full = base + href;
    if (href === "") return pathname === base;
    return pathname.startsWith(full);
  };

  return (
    <div>
      {/* Business header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/businesses"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          {business ? (
            <>
              <h1 className="font-heading text-xl font-bold text-brand-dark truncate">{business.name}</h1>
              <p className="text-xs text-gray-500 capitalize">{business.category.replace(/_/g, " ")} · {business.isActive ? "Active" : "Inactive"}</p>
            </>
          ) : (
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
          )}
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-card overflow-x-auto scrollbar-hide"
        style={{ border: "1px solid #f0f0f0" }}
      >
        {subNav.map(item => (
          <Link
            key={item.href}
            href={base + item.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
              isActive(item.href)
                ? "bg-accent text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
