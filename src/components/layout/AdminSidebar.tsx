"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Users, UserCheck, Menu, X, LogOut,
  ChevronDown, ChevronRight, Store, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface BusinessItem { id: string; name: string; slug: string; isActive: boolean; }

const adminTopItems = [
  { href: "/admin",            label: "Dashboard",  icon: <LayoutDashboard size={18} /> },
  { href: "/admin/businesses", label: "Businesses", icon: <Briefcase size={18} /> },
  { href: "/admin/partners",   label: "Partners",   icon: <UserCheck size={18} /> },
  { href: "/admin/users",      label: "Users",      icon: <Users size={18} /> },
];

const partnerNavItems = [
  { href: "/partner",            label: "Dashboard",     icon: <LayoutDashboard size={18} /> },
  { href: "/partner/businesses", label: "My Businesses", icon: <Briefcase size={18} /> },
];

export function AdminSidebar({ role = "admin" }: { role?: "admin" | "partner" }) {
  const pathname  = usePathname();
  const { user, logout } = useAuth();
  const router    = useRouter();
  const [open, setOpen]           = useState(false);
  const [bizOpen, setBizOpen]     = useState(true);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  useEffect(() => {
    fetch("/api/businesses")
      .then(r => r.json())
      .then(d => setBusinesses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Open biz dropdown if currently inside a business route
  useEffect(() => {
    if (pathname.includes("/admin/businesses/") && pathname.split("/").length > 3) {
      setBizOpen(true);
    }
  }, [pathname]);

  const items   = role === "admin" ? adminTopItems : partnerNavItems;
  const basePath = role === "admin" ? "/admin" : "/partner";
  const title    = role === "admin" ? "Admin Panel" : "Partner Panel";

  const handleLogout = () => { logout(); router.push("/"); };

  const isActive = (href: string) => {
    if (href === basePath) return pathname === href;
    return pathname.startsWith(href);
  };

  // Active business id from URL
  const activeBizId = pathname.match(/\/admin\/businesses\/([^/]+)/)?.[1];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
        >
          <ShoppingCart size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-heading font-bold text-brand-dark text-sm">Product Suite</div>
          <div className="text-xs text-gray-500">{title}</div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{user?.name?.[0]?.toUpperCase() || "A"}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-brand-dark truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 capitalize">{role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Top-level items */}
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              isActive(item.href)
                ? "bg-accent text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-brand-dark"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* Businesses dropdown (admin only) */}
        {role === "admin" && businesses.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setBizOpen(o => !o)}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Store size={14} /> Business Portals
              </span>
              {bizOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {bizOpen && (
              <div className="mt-1 ml-2 space-y-0.5 border-l-2 border-gray-100 pl-3">
                {businesses.map(b => {
                  const bizActive = activeBizId === b.id;
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/businesses/${b.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                        bizActive
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "text-gray-600 hover:bg-gray-100 hover:text-brand-dark"
                      )}
                      title={b.name}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        b.isActive ? "bg-green-400" : "bg-gray-300"
                      )} />
                      <span className="truncate">{b.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t space-y-1">
        <Link href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <span className="text-base">🏪</span> View Store
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-white shadow-lg rounded-xl p-2 border"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300",
        "w-64 shadow-xl",
        "lg:translate-x-0 lg:static lg:shadow-none lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
