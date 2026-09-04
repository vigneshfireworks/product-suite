"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, watchlistCount } = useCart();
  const { user } = useAuth();

  const tabs = [
    { href: "/",          label: "Home",    icon: Home,         active: pathname === "/" },
    { href: "/search",    label: "Search",  icon: Search,       active: pathname.startsWith("/search") },
    { href: "/checkout",  label: "Cart",    icon: ShoppingCart, active: pathname.startsWith("/checkout"), badge: cartCount },
    { href: "/watchlist", label: "Wishlist",icon: Heart,        active: pathname.startsWith("/watchlist"), badge: watchlistCount },
    { href: user ? "/orders" : "/login", label: user ? "Account" : "Login", icon: User, active: pathname.startsWith("/orders") || pathname.startsWith("/login") },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-[60px]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={tab.active ? 2.5 : 1.8}
                  style={{ color: tab.active ? "#FFC43F" : "#9ca3af" }}
                />
                {(tab.badge ?? 0) > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-white font-bold rounded-full flex items-center justify-center"
                    style={{ background: "#FFC43F", fontSize: "0.55rem", minWidth: "16px", height: "16px" }}
                  >
                    {(tab.badge ?? 0) > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: tab.active ? "#FFC43F" : "#9ca3af" }}
              >
                {tab.label}
              </span>
              {tab.active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: "#FFC43F" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
