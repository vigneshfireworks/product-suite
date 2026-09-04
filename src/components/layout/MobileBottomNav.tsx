"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, ShoppingCart, Heart, User, X, LayoutDashboard, Package, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useMobileSearch } from "@/context/MobileSearchContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, watchlistCount } = useCart();
  const { user, logout } = useAuth();
  const { openMobileSearch, mobileSearchOpen } = useMobileSearch();
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    router.push("/");
  };

  const accountActive = !user
    ? pathname.startsWith("/login")
    : user.role === "admin"
    ? pathname.startsWith("/admin")
    : user.role === "partner"
    ? pathname.startsWith("/partner")
    : pathname.startsWith("/orders");

  const searchActive = pathname.startsWith("/search") || mobileSearchOpen;

  return (
    <>
      {/* ── Account slide-up sheet (logged-in users only) ── */}
      {accountOpen && user && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setAccountOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
                style={{ background: "#FFC43F" }}
              >
                {user.name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-400 capitalize mt-0.5">{user.role}</div>
              </div>
              <button
                onClick={() => setAccountOpen(false)}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-2">
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-4 px-6 py-3.5 text-gray-700 active:bg-gray-50"
                >
                  <LayoutDashboard size={18} className="text-gray-400" />
                  <span className="font-medium">Admin Dashboard</span>
                </Link>
              )}
              {user.role === "partner" && (
                <Link
                  href="/partner"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-4 px-6 py-3.5 text-gray-700 active:bg-gray-50"
                >
                  <LayoutDashboard size={18} className="text-gray-400" />
                  <span className="font-medium">Partner Dashboard</span>
                </Link>
              )}
              <Link
                href="/orders"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-4 px-6 py-3.5 text-gray-700 active:bg-gray-50"
              >
                <Package size={18} className="text-gray-400" />
                <span className="font-medium">My Orders</span>
              </Link>

              <div className="mx-6 my-1 border-t border-gray-100" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-red-500 active:bg-red-50"
              >
                <LogOut size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </div>

            {/* Safe area spacer */}
            <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
          </div>
        </div>
      )}

      {/* ── Bottom navigation bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
        style={{
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch h-[60px]">

          {/* Home */}
          <Link
            href="/"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
          >
            <div className="relative">
              <Home
                size={22}
                strokeWidth={pathname === "/" ? 2.5 : 1.8}
                style={{ color: pathname === "/" ? "#FFC43F" : "#9ca3af" }}
              />
            </div>
            <span className="text-[10px] font-semibold leading-none" style={{ color: pathname === "/" ? "#FFC43F" : "#9ca3af" }}>
              Home
            </span>
            {pathname === "/" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
            )}
          </Link>

          {/* Search — opens mobile search overlay */}
          <button
            type="button"
            onClick={openMobileSearch}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
          >
            <div className="relative">
              <Search
                size={22}
                strokeWidth={searchActive ? 2.5 : 1.8}
                style={{ color: searchActive ? "#FFC43F" : "#9ca3af" }}
              />
            </div>
            <span className="text-[10px] font-semibold leading-none" style={{ color: searchActive ? "#FFC43F" : "#9ca3af" }}>
              Search
            </span>
            {searchActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
            )}
          </button>

          {/* Cart */}
          <Link
            href="/checkout"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
          >
            <div className="relative">
              <ShoppingCart
                size={22}
                strokeWidth={pathname.startsWith("/checkout") ? 2.5 : 1.8}
                style={{ color: pathname.startsWith("/checkout") ? "#FFC43F" : "#9ca3af" }}
              />
              {(cartCount ?? 0) > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-white font-bold rounded-full flex items-center justify-center"
                  style={{ background: "#FFC43F", fontSize: "0.55rem", minWidth: "16px", height: "16px" }}
                >
                  {(cartCount ?? 0) > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold leading-none" style={{ color: pathname.startsWith("/checkout") ? "#FFC43F" : "#9ca3af" }}>
              Cart
            </span>
            {pathname.startsWith("/checkout") && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
            )}
          </Link>

          {/* Wishlist */}
          <Link
            href="/watchlist"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
          >
            <div className="relative">
              <Heart
                size={22}
                strokeWidth={pathname.startsWith("/watchlist") ? 2.5 : 1.8}
                style={{ color: pathname.startsWith("/watchlist") ? "#FFC43F" : "#9ca3af" }}
              />
              {(watchlistCount ?? 0) > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-white font-bold rounded-full flex items-center justify-center"
                  style={{ background: "#FFC43F", fontSize: "0.55rem", minWidth: "16px", height: "16px" }}
                >
                  {(watchlistCount ?? 0) > 9 ? "9+" : watchlistCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold leading-none" style={{ color: pathname.startsWith("/watchlist") ? "#FFC43F" : "#9ca3af" }}>
              Wishlist
            </span>
            {pathname.startsWith("/watchlist") && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
            )}
          </Link>

          {/* Login / Account */}
          {user ? (
            /* Logged in: open account sheet */
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: accountActive ? "#FFC43F" : "#9ca3af", fontSize: "0.65rem" }}
              >
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-[10px] font-semibold leading-none" style={{ color: accountActive ? "#FFC43F" : "#9ca3af" }}>
                Account
              </span>
              {accountActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
              )}
            </button>
          ) : (
            /* Not logged in: navigate to login */
            <Link
              href="/login"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-opacity active:opacity-60"
            >
              <User
                size={22}
                strokeWidth={pathname.startsWith("/login") ? 2.5 : 1.8}
                style={{ color: pathname.startsWith("/login") ? "#FFC43F" : "#9ca3af" }}
              />
              <span className="text-[10px] font-semibold leading-none" style={{ color: pathname.startsWith("/login") ? "#FFC43F" : "#9ca3af" }}>
                Login
              </span>
              {pathname.startsWith("/login") && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#FFC43F" }} />
              )}
            </Link>
          )}

        </div>
      </nav>
    </>
  );
}
