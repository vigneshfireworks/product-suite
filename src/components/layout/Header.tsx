"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, Heart, User, ShoppingCart, ChevronDown,
  Phone, LogOut, LayoutDashboard, Package, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useMobileSearch } from "@/context/MobileSearchContext";
import { Business } from "@/types";
import { formatCurrency } from "@/lib/utils";

function catEmoji(category: string) {
  if (category === "retail")          return "🎆";
  if (category === "finance")         return "💰";
  if (category === "market_analysis") return "📈";
  return "🏪";
}

/* ── per-business unique visual helpers (mirrors store page) ── */
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) ^ s.charCodeAt(i);
  return Math.abs(h);
}
function bizEmoji(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes("cracker") || n.includes("firecrack")) return "🎆";
  if (n.includes("invitation") || n.includes("invite") || n.includes("wedding")) return "💌";
  if (n.includes("gift") || n.includes("hamper"))       return "🎁";
  if (n.includes("royal") || n.includes("elegant"))     return "👑";
  if (n.includes("finance") || n.includes("loan"))      return "🏦";
  if (n.includes("market") || n.includes("analytics") || n.includes("analysis")) return "📊";
  if (n.includes("stock") || n.includes("share") || n.includes("invest")) return "📈";
  const fallbacks: Record<string, string[]> = {
    retail: ["🛍️", "🏪", "🏷️", "🎀"], finance: ["💼", "💰", "🏦", "📈"],
    market_analysis: ["📊", "📈", "💹", "🔭"], other: ["⭐", "🎯", "✨", "🚀"],
  };
  const arr = fallbacks[category] ?? ["🏪"];
  return arr[strHash(name) % arr.length];
}
function bizBg(id: string, category: string): string {
  const baseHue: Record<string, number> = { retail: 25, finance: 205, market_analysis: 148, other: 270 };
  const base = baseHue[category] ?? 200;
  const shift = (strHash(id) % 50) - 25;
  const hue = ((base + shift) % 360 + 360) % 360;
  return `hsl(${hue},65%,90%)`;
}

export function Header() {
  const { user, logout } = useAuth();
  const { cart, cartCount, cartTotal, watchlistCount, removeFromCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  // Detect if we're inside a specific business page
  const bizMatch = pathname.match(/^\/business\/([^/?]+)/);
  const isBusinessPage = !!bizMatch;

  const [businesses,       setBusinesses]       = useState<Business[]>([]);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedBizId,    setSelectedBizId]    = useState("all");
  const [catOpen,          setCatOpen]          = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [cartOpen,         setCartOpen]         = useState(false);
  const { mobileSearchOpen, openMobileSearch, closeMobileSearch, toggleMobileSearch } = useMobileSearch();

  const catRef     = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const cartRef    = useRef<HTMLDivElement>(null);

  /* Fetch businesses for the categories dropdown */
  useEffect(() => {
    fetch("/api/businesses")
      .then(r => r.json())
      .then((data: Business[]) => setBusinesses(data.filter(b => b.isActive)))
      .catch(() => {});
  }, []);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current     && !catRef.current.contains(e.target as Node))     setCatOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (cartRef.current    && !cartRef.current.contains(e.target as Node))    setCartOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    window.location.href = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    setProfileOpen(false);
  };

  const selectedLabel =
    selectedBizId === "all"
      ? "All Categories"
      : (businesses.find(b => b.id === selectedBizId)?.name ?? "All Categories");

  // Find current business name from pathname + fetched list
  const bizSlug = bizMatch?.[1] ?? null;
  const currentBiz = businesses.find(b => b.slug === bizSlug);
  const bizPageTitle = currentBiz?.name ?? "Business";

  return (
    <header
      className="bg-white sticky top-0 z-40"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}
    >
      {/* ── MOBILE APP BAR (business inner pages) ───────────────── */}
      {isBusinessPage && (
        <div className="md:hidden flex items-center h-[56px] px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} style={{ color: "#222" }} />
          </button>
          <h1 className="flex-1 font-heading font-bold text-center text-base truncate" style={{ color: "#222" }}>
            {bizPageTitle}
          </h1>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            onClick={() => toggleMobileSearch()}
          >
            <Search size={20} style={{ color: "#444" }} />
          </button>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart size={20} style={{ color: "#444" }} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-white font-bold rounded-full flex items-center justify-center"
                  style={{ background: "#FFC43F", fontSize: "0.55rem", minWidth: "16px", height: "16px" }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE APP BAR (home / non-business pages) ──────────── */}
      {!isBusinessPage && (
        <div className="md:hidden flex items-center h-[56px] px-4 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
            >
              <ShoppingCart size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-heading font-extrabold" style={{ fontSize: "1rem", color: "#222", letterSpacing: "0.04em" }}>
                PRODUCT <span style={{ color: "#FFC43F" }}>SUITE</span>
              </div>
              <div className="font-sans font-semibold tracking-widest" style={{ fontSize: "0.48rem", color: "#aaa", letterSpacing: "0.18em" }}>
                MULTI BUSINESS
              </div>
            </div>
          </Link>
          <div className="flex-1" />
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => toggleMobileSearch()}
          >
            <Search size={20} style={{ color: "#444" }} />
          </button>
          <div ref={cartRef} className="relative">
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart size={20} style={{ color: "#444" }} />
              {cartCount > 0 && (
                <span
                  className="absolute top-0 right-0 text-white font-bold rounded-full flex items-center justify-center"
                  style={{ background: "#FFC43F", fontSize: "0.55rem", minWidth: "15px", height: "15px" }}
                >
                  {cartCount}
                </span>
              )}
            </button>
            {/* cart dropdown (same as desktop but mobile-positioned) */}
            {cartOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-white rounded-2xl z-50 overflow-hidden"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: "1px solid #f0f0f0", width: "300px" }}
              >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <span className="font-heading font-bold text-base" style={{ color: "#FFC43F" }}>Your cart</span>
                  {cartCount > 0 && (
                    <span className="text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#FFC43F" }}>
                      {cartCount}
                    </span>
                  )}
                </div>
                {cartCount === 0 ? (
                  <div className="text-center py-8 px-5">
                    <ShoppingCart size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500 mb-3">Your cart is empty</p>
                    <Link href="/" onClick={() => setCartOpen(false)} className="text-xs font-semibold" style={{ color: "#FFC43F" }}>Browse Businesses →</Link>
                  </div>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto px-5 py-2 space-y-3">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">📦</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</div>
                            <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{formatCurrency(item.price * item.quantity)}</div>
                            <button onClick={() => removeFromCart(item.productId)} className="text-xs text-red-400">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="font-bold">{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="px-5 pb-4">
                      <Link href="/checkout" onClick={() => setCartOpen(false)} className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white" style={{ background: "#FFC43F" }}>
                        Continue to checkout
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DESKTOP MAIN BAR ────────────────────────────────────────── */}
      <div className="hidden md:block w-full px-6 lg:px-10">
        <div className="flex items-center gap-6 lg:gap-10 h-[80px]">

          {/* ── 1. LOGO ─────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0" style={{ minWidth: "160px" }}>
            {/* Icon: business logo/emoji on biz pages, default cart on home */}
            {isBusinessPage && currentBiz ? (
              currentBiz.logo ? (
                <img
                  src={currentBiz.logo}
                  alt={currentBiz.name}
                  className="w-12 h-12 object-contain rounded-2xl border border-gray-100 bg-white p-1 flex-shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300"
                  style={{ background: bizBg(currentBiz.id, currentBiz.category) }}
                >
                  {bizEmoji(currentBiz.name, currentBiz.category)}
                </div>
              )
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
              >
                <ShoppingCart size={24} className="text-white" strokeWidth={2.5} />
              </div>
            )}
            {/* Text: business name on biz pages, Viki Suite on home */}
            <div className="hidden sm:block leading-tight overflow-hidden">
              {isBusinessPage && currentBiz ? (
                <>
                  <div
                    className="font-heading font-extrabold truncate transition-all duration-300"
                    style={{ fontSize: "1.05rem", color: "#222", maxWidth: "140px" }}
                  >
                    {currentBiz.name}
                  </div>
                  <div
                    className="font-sans font-semibold tracking-widest"
                    style={{ fontSize: "0.55rem", color: "#FFC43F", letterSpacing: "0.18em" }}
                  >
                    PRODUCT SUITE
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="font-heading font-extrabold"
                    style={{ fontSize: "1.2rem", color: "#222", letterSpacing: "0.04em" }}
                  >
                    PRODUCT <span style={{ color: "#FFC43F" }}>SUITE</span>
                  </div>
                  <div
                    className="font-sans font-semibold tracking-widest"
                    style={{ fontSize: "0.58rem", color: "#aaa", letterSpacing: "0.2em" }}
                  >
                    MULTI BUSINESS
                  </div>
                </>
              )}
            </div>
          </Link>

          {/* ── 2. SEARCH BAR (desktop) ─────────────────────────── */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 items-center"
            style={{
              border:       "1.5px solid #e0e0e0",
              borderRadius: "12px",
              height:       "50px",
              overflow:     "visible",   /* must be visible so dropdown isn't clipped */
              background:   "#fafafa",
            }}
          >
            {/* Category dropdown */}
            <div ref={catRef} className="relative flex-shrink-0 h-full">
              <button
                type="button"
                onClick={() => setCatOpen(!catOpen)}
                className="flex items-center gap-2 h-full px-5 font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap border-r border-gray-200"
                style={{ fontSize: "0.84rem", background: "transparent", borderRadius: "12px 0 0 12px" }}
              >
                {selectedLabel}
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 text-gray-400 ${catOpen ? "rotate-180" : ""}`}
                />
              </button>

              {catOpen && (
                <div
                  className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl py-1.5 z-50"
                  style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: "220px" }}
                >
                  {/* All Categories */}
                  <button
                    type="button"
                    onClick={() => { setSelectedBizId("all"); setCatOpen(false); }}
                    className="w-full text-left px-5 py-3 text-sm font-medium transition-colors hover:bg-gray-50 border-b border-gray-100"
                    style={{ color: selectedBizId === "all" ? "#FFC43F" : "#333", fontWeight: selectedBizId === "all" ? 700 : 500 }}
                  >
                    🏪 All Categories
                  </button>
                  {/* Dynamic businesses */}
                  {businesses.map(biz => (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        setSelectedBizId(biz.id);
                        setCatOpen(false);
                        router.push(`/business/${biz.slug}`);
                      }}
                      className="w-full text-left px-5 py-3 text-sm font-medium transition-colors hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: selectedBizId === biz.id ? "#FFC43F" : "#333", fontWeight: selectedBizId === biz.id ? 700 : 500 }}
                    >
                      <span>{catEmoji(biz.category)}</span>
                      {biz.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <input
              name="q"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const q = e.currentTarget.value.trim();
                  window.location.href = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
                }
              }}
              type="text"
              placeholder="Search for businesses and products..."
              className="flex-1 px-5 bg-transparent text-gray-800 focus:outline-none placeholder-gray-400"
              style={{ fontSize: "0.88rem" }}
            />

            {/* Search icon button */}
            <button
              type="submit"
              className="flex-shrink-0 h-full px-5 flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ borderRadius: "0 12px 12px 0" }}
            >
              <Search size={20} className="text-gray-500" strokeWidth={2} />
            </button>
          </form>

          {/* ── 3. RIGHT SECTION ────────────────────────────────── */}
          <div className="flex items-center gap-5 lg:gap-7 ml-auto md:ml-0 flex-shrink-0">

            {/* Support (lg+) */}
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span style={{ fontSize: "0.72rem", color: "#999" }}>For Support?</span>
              <a
                href="tel:+917373872638"
                className="font-heading font-bold hover:text-accent transition-colors flex items-center gap-1"
                style={{ fontSize: "0.92rem", color: "#222" }}
              >
                <Phone size={13} strokeWidth={2.5} style={{ color: "#FFC43F" }} />
                +91-7373872638
              </a>
            </div>

            <div className="hidden lg:block w-px h-10 bg-gray-200" />

            {/* Mobile search toggle */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => toggleMobileSearch()}
            >
              <Search size={22} style={{ color: "#444" }} />
            </button>

            {/* User / Profile */}
            {user ? (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex flex-col items-center gap-0.5 hover:opacity-75 transition-opacity"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: "#FFC43F" }}
                  >
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:flex items-center gap-0.5">
                    <span style={{ fontSize: "0.72rem", color: "#555", fontWeight: 600 }}>
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown size={11} style={{ color: "#999" }} />
                  </div>
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 bg-white rounded-2xl py-2 z-50"
                    style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.13)", border: "1px solid #f0f0f0", minWidth: "210px" }}
                  >
                    <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                      <div className="text-sm font-bold" style={{ color: "#222" }}>{user.name}</div>
                      <div className="text-xs text-gray-400 capitalize mt-0.5">{user.role}</div>
                    </div>
                    {user.role === "admin" && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard size={15} /> Admin Dashboard
                      </Link>
                    )}
                    {user.role === "partner" && (
                      <Link href="/partner" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard size={15} /> Partner Dashboard
                      </Link>
                    )}
                    <Link href="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <Package size={15} /> My Orders
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="flex flex-col items-center gap-0.5 hover:opacity-75 transition-opacity">
                <div className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <User size={18} className="text-gray-500" />
                </div>
                <span className="hidden sm:block" style={{ fontSize: "0.72rem", color: "#555", fontWeight: 600 }}>Sign In</span>
              </Link>
            )}

            {/* Watchlist */}
            <Link href="/watchlist" className="relative flex flex-col items-center gap-0.5 hover:opacity-75 transition-opacity">
              <div className="relative">
                <Heart size={24} className="text-gray-500" />
                {watchlistCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-white font-bold rounded-full flex items-center justify-center"
                    style={{ background: "#ef4444", fontSize: "0.58rem", minWidth: "17px", height: "17px" }}
                  >
                    {watchlistCount > 9 ? "9+" : watchlistCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:block" style={{ fontSize: "0.72rem", color: "#555", fontWeight: 600 }}>Wishlist</span>
            </Link>

            {/* Cart */}
            <div ref={cartRef} className="relative">
              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="flex flex-col items-center gap-0.5 hover:opacity-75 transition-opacity"
              >
                <div className="relative">
                  <ShoppingCart size={24} className="text-gray-600" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-white font-bold rounded-full flex items-center justify-center"
                      style={{ background: "#FFC43F", fontSize: "0.58rem", minWidth: "17px", height: "17px" }}
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-0.5">
                  <span className="font-bold" style={{ fontSize: "0.78rem", color: "#222" }}>
                    {cartTotal > 0 ? formatCurrency(cartTotal) : "Your Cart"}
                  </span>
                  <ChevronDown size={11} style={{ color: "#999" }} />
                </div>
              </button>

              {cartOpen && (
                <div
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl z-50 overflow-hidden"
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: "1px solid #f0f0f0", minWidth: "300px", maxWidth: "340px" }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <span className="font-heading font-bold text-base" style={{ color: "#FFC43F" }}>Your cart</span>
                    {cartCount > 0 && (
                      <span
                        className="text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "#FFC43F" }}
                      >
                        {cartCount}
                      </span>
                    )}
                  </div>

                  {cartCount === 0 ? (
                    <div className="text-center py-8 px-5">
                      <ShoppingCart size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-500 mb-3">Your cart is empty</p>
                      <Link href="/" onClick={() => setCartOpen(false)} className="text-xs font-semibold" style={{ color: "#FFC43F" }}>
                        Browse Businesses →
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Item list */}
                      <div className="max-h-64 overflow-y-auto px-5 py-2 space-y-3">
                        {cart.map(item => (
                          <div key={item.productId} className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">📦</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-bold" style={{ color: "#222" }}>{formatCurrency(item.price * item.quantity)}</div>
                              <button
                                onClick={() => removeFromCart(item.productId)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors mt-0.5"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total (INR)</span>
                        <span className="text-base font-bold" style={{ color: "#222" }}>{formatCurrency(cartTotal)}</span>
                      </div>

                      {/* Checkout button */}
                      <div className="px-5 pb-4">
                        <Link
                          href="/checkout"
                          onClick={() => setCartOpen(false)}
                          className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white transition-colors"
                          style={{ background: "#FFC43F" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f7a422")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#FFC43F")}
                        >
                          Continue to checkout
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── MOBILE/DESKTOP SEARCH BAR ───────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <form
            onSubmit={handleSearch}
            className="flex items-center"
            style={{ border: "1.5px solid #e0e0e0", borderRadius: "10px", height: "44px", overflow: "hidden", background: "#fafafa" }}
          >
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search businesses or products..."
              autoFocus
              className="flex-1 px-4 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            />
            <button type="submit" className="flex-shrink-0 px-4 h-full flex items-center justify-center hover:bg-gray-100">
              <Search size={18} className="text-gray-500" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
