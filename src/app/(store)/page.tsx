"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Business } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { strHash, bizEmoji, bizColors, CAT_LABEL } from "@/lib/biz-utils";

export default function HomePage() {
  const { user, token } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  // accessMap: businessId → true/false. null = not yet loaded (loading), undefined = no user logged in
  const [accessMap, setAccessMap] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    // Init super admin on first load
    if (!initiated) {
      fetch("/api/auth/init").catch(() => {});
      setInitiated(true);
    }
    fetchBusinesses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user logs in / out, reload access map
  useEffect(() => {
    if (!user || !token) { setAccessMap(null); return; }
    if (user.role === "admin") { setAccessMap(null); return; } // admin sees all
    fetch(`/api/users/${user.id}/business-access`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : {})
      .then(data => setAccessMap(data))
      .catch(() => setAccessMap({}));
  }, [user, token]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();
      setBusinesses(Array.isArray(data) ? data : []);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by displayOrder (ascending); businesses without it go last
  const sortedFiltered = [...filtered].sort((a, b) => {
    const ao = a.displayOrder ?? 9999;
    const bo = b.displayOrder ?? 9999;
    return ao - bo;
  });

  const visible = sortedFiltered.filter((b) => {
    // Admin sees all businesses
    if (user?.role === "admin") return true;
    // Logged-in user: apply per-user access map
    if (user && accessMap !== null) return accessMap[b.id] !== false;
    // Logged-in user (map not loaded yet): hide finance by default
    if (user) return b.category !== "finance";
    // Anonymous: hide finance
    return b.category !== "finance";
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8">

      {/* ── Mobile search bar ── */}
      <div className="md:hidden mb-4">
        <div className="flex bg-gray-100 rounded-2xl overflow-hidden px-3 py-2 items-center gap-2">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search businesses, products..."
            className="flex-1 bg-transparent text-sm focus:outline-none text-brand-dark"
          />
        </div>
      </div>

      {/* Hero (desktop only) */}
      <div className="hidden md:block text-center mb-8">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-brand-dark mb-1.5">
          Welcome to <span className="text-accent">Product Suite</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-5">
          Explore our wide range of businesses — all in one place.
        </p>
        <div className="flex max-w-md mx-auto">
          <div className="flex flex-1 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:border-accent transition-colors">
            <Search size={16} className="ml-4 my-auto text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search businesses, products..."
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none text-brand-dark"
            />
          </div>
        </div>
      </div>

      {/* Businesses grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-card h-40 md:h-48 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏪</div>
          <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">No businesses yet</h3>
          <p className="text-gray-500 text-sm mb-6">
            {searchQuery ? "No businesses match your search." : "Businesses will appear here once added by admin."}
          </p>
          {!user && (
            <div className="flex gap-3 justify-center">
              <Link href="/login" className="bg-accent text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors">
                Login
              </Link>
              <Link href="/signup" className="border-2 border-accent text-accent px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent/10 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/businesses" className="bg-accent text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors inline-block">
              Add First Business
            </Link>
          )}
        </div>
      ) : (
        <>
          <h2 className="font-heading text-base md:text-xl font-bold text-brand-dark mb-3 md:mb-5">
            {searchQuery ? `Results for "${searchQuery}"` : "Our Businesses"}
            <span className="ml-2 text-sm font-normal text-gray-500">({visible.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {visible.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </>
      )}

      {/* Features section (desktop only) */}
      {!loading && (
        <div className="hidden md:grid mt-16 grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🛒", title: "Easy Shopping", desc: "Browse and buy across all businesses" },
            { icon: "💳", title: "Multiple Payments", desc: "Cash, GPay, PhonePay & more" },
            { icon: "📦", title: "Track Orders", desc: "Real-time order tracking" },
            { icon: "❤️", title: "Wishlist", desc: "Save your favorite products" },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-card p-4 text-center shadow-card">
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="font-heading font-bold text-sm text-brand-dark">{f.title}</div>
              <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Helpers  (strHash / bizEmoji / bizColors / CAT_LABEL imported from @/lib/biz-utils)
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   Animation helpers
═══════════════════════════════════════════════════════════════ */

type AnimType = "crackers" | "invite" | "gift" | "market" | "finance" | null;

function getAnimType(name: string): AnimType {
  const n = name.toLowerCase();
  if (n.includes("cracker") || n.includes("firework"))      return "crackers";
  if (n.includes("invitation") || n.includes("invite"))     return "invite";
  if (n.includes("gift") || n.includes("return gift"))      return "gift";
  if (n.includes("market") || n.includes("analytics"))      return "market";
  if (n.includes("finance") || n.includes("loan"))          return "finance";
  return null;
}

/* 16 spark particles at 22.5° intervals, alternating inner/outer rings */
const SPARKS = (() => {
  const colors = ["#FF4444","#FFD700","#00CC66","#FF88CC","#4488FF","#FF8800","#BB44FF","#00CCCC"];
  return Array.from({ length: 16 }, (_, i) => {
    const angle = i * 22.5 * (Math.PI / 180);
    const d = i % 2 === 0 ? 42 : 30;
    return {
      tx: Math.round(Math.cos(angle) * d),
      ty: Math.round(Math.sin(angle) * d),
      color: colors[i % 8],
      size: i % 2 === 0 ? 6 : 4,
      round: i % 3 !== 0,    // mix circles and tiny squares
      delay: (i * 0.038).toFixed(3),
    };
  });
})();

/* Confetti for gift */
const CONFETTI: { cx: string; cy: string; color: string; rot: number; delay: number }[] = [
  { cx: "-24px", cy: "-46px", color: "#FF4444", rot: 15,  delay: 0 },
  { cx: "-10px", cy: "-54px", color: "#FFD700", rot: -28, delay: 0.1 },
  { cx: "0px",   cy: "-58px", color: "#00CC66", rot: 42,  delay: 0.05 },
  { cx: "12px",  cy: "-54px", color: "#4488FF", rot: -12, delay: 0.15 },
  { cx: "24px",  cy: "-44px", color: "#FF88CC", rot: 32,  delay: 0.08 },
  { cx: "-16px", cy: "-40px", color: "#BB44FF", rot: -38, delay: 0.12 },
];

/* Rising rupee coins for finance */
const COINS: { cx: string; cy: string; color: string; size: number; delay: number }[] = [
  { cx: "-22px", cy: "-50px", color: "#FFD700", size: 15, delay: 0 },
  { cx: "-8px",  cy: "-58px", color: "#FFC300", size: 13, delay: 0.22 },
  { cx: "2px",   cy: "-62px", color: "#FFD700", size: 16, delay: 0.44 },
  { cx: "14px",  cy: "-56px", color: "#F0A800", size: 13, delay: 0.11 },
  { cx: "26px",  cy: "-48px", color: "#FFD700", size: 14, delay: 0.33 },
];

/* Market bar config */
const MKT_BARS = [
  { x: 6,  h: 28, color: "#22C55E", delay: 0 },
  { x: 19, h: 18, color: "#16A34A", delay: 0.09 },
  { x: 32, h: 36, color: "#22C55E", delay: 0.18 },
  { x: 45, h: 21, color: "#16A34A", delay: 0.06 },
  { x: 58, h: 40, color: "#22C55E", delay: 0.13 },
];

/* ═══════════════════════════════════════════════════════════════
   Animation components
═══════════════════════════════════════════════════════════════ */

function CrackersAnim() {
  return (
    <div className="biz-anim-inline">
      <div className="crackers-flash" />
      {SPARKS.map((s, i) => (
        <div
          key={i}
          className="spark-p"
          style={{
            "--tx": `${s.tx}px`,
            "--ty": `${s.ty}px`,
            background: s.color,
            width:  s.size,
            height: s.size,
            borderRadius: s.round ? "50%" : "2px",
            boxShadow: `0 0 5px 1px ${s.color}99`,
            animationDelay: `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function InviteAnim() {
  return (
    <div className="biz-anim-overlay invite-persp">
      <svg width="84" height="64" viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Envelope body */}
        <rect x="6" y="24" width="72" height="34" rx="4" fill="#FFF0F7" stroke="#E87AB4" strokeWidth="1.5"/>
        {/* Bottom V crease */}
        <polyline points="6,58 42,38 78,58" stroke="#E87AB4" strokeWidth="1" opacity="0.35" fill="none"/>
        {/* Side creases */}
        <line x1="6"  y1="24" x2="36" y2="42" stroke="#E87AB4" strokeWidth="1" opacity="0.35"/>
        <line x1="78" y1="24" x2="48" y2="42" stroke="#E87AB4" strokeWidth="1" opacity="0.35"/>
        {/* Flap — rotates around its bottom edge */}
        <g className="env-flap-g">
          <polygon points="6,24 42,5 78,24" fill="#FFB6D9" stroke="#E87AB4" strokeWidth="1.5"/>
        </g>
        {/* Heart — rises from inside */}
        <g className="env-letter-g">
          <text x="42" y="48" textAnchor="middle" fontSize="20">❤️</text>
        </g>
      </svg>
    </div>
  );
}

function GiftAnim() {
  return (
    <div className="biz-anim-overlay">
      {/* Confetti pieces */}
      {CONFETTI.map((c, i) => (
        <div
          key={i}
          className="confetti-p"
          style={{
            "--cx": c.cx,
            "--cy": c.cy,
            background: c.color,
            transform: `rotate(${c.rot}deg)`,
            animationDelay: `${c.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {/* Gift box SVG */}
      <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Box body */}
        <rect x="8" y="34" width="54" height="28" rx="3" fill="#FF6B6B"/>
        <rect x="8" y="34" width="54" height="28" rx="3" stroke="#CC2222" strokeWidth="1" opacity="0.2"/>
        {/* Vertical ribbon on body */}
        <rect x="31" y="34" width="8" height="28" fill="#FFD700"/>
        {/* Horizontal ribbon on body */}
        <rect x="8" y="46" width="54" height="7" fill="#FFD700" opacity="0.7"/>
        {/* Lid — animated */}
        <g className="gift-lid-g">
          <rect x="6" y="25" width="58" height="11" rx="3" fill="#EE3333"/>
          <rect x="6" y="25" width="58" height="11" rx="3" stroke="#CC2222" strokeWidth="1" opacity="0.2"/>
          {/* Vertical ribbon on lid */}
          <rect x="31" y="25" width="8" height="11" fill="#FFD700"/>
          {/* Bow left loop */}
          <ellipse cx="24" cy="24" rx="10" ry="6" fill="#FFDD00" transform="rotate(-30,24,24)"/>
          {/* Bow right loop */}
          <ellipse cx="46" cy="24" rx="10" ry="6" fill="#FFDD00" transform="rotate(30,46,24)"/>
          {/* Bow center knot */}
          <circle cx="35" cy="24" r="5.5" fill="#FFF200" stroke="#FFD700" strokeWidth="1.2"/>
        </g>
      </svg>
    </div>
  );
}

function MarketAnim() {
  return (
    <div className="biz-anim-overlay">
      <svg width="78" height="62" viewBox="0 0 78 62" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Faint grid lines */}
        {[10, 22, 34, 46].map(y => (
          <line key={y} x1="3" y1={y} x2="75" y2={y} stroke="#22C55E" strokeWidth="0.5" opacity="0.15"/>
        ))}
        {/* Bars */}
        {MKT_BARS.map((b, i) => (
          <rect
            key={i}
            className="mkt-bar"
            x={b.x}
            y={56 - b.h}
            width="11"
            height={b.h}
            rx="2.5"
            fill={b.color}
            opacity="0.9"
            style={{ animationDelay: `${b.delay}s` }}
          />
        ))}
        {/* Trend line — draws itself */}
        <polyline
          className="mkt-trend"
          points="11,28 24,38 37,18 50,31 63,12"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow at trend peak */}
        <polygon
          className="mkt-trend"
          points="63,6 59,16 67,16"
          fill="#FFD700"
          style={{ animationDelay: "0.5s" }}
        />
      </svg>
    </div>
  );
}

function FinanceAnim() {
  return (
    <div className="biz-anim-inline">
      {COINS.map((c, i) => (
        <div
          key={i}
          className="coin-p"
          style={{
            "--cx": c.cx,
            "--cy": c.cy,
            color: c.color,
            fontSize: c.size,
            textShadow: `0 0 10px ${c.color}cc`,
            animationDelay: `${c.delay}s`,
          } as React.CSSProperties}
        >
          ₹
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BusinessCard
═══════════════════════════════════════════════════════════════ */

function BusinessCard({ business }: { business: Business }) {
  const emoji       = bizEmoji(business.name, business.category);
  const { bg, dot } = bizColors(business.id, business.category);
  const label       = CAT_LABEL[business.category] ?? business.category;
  const animType    = getAnimType(business.name);

  return (
    <Link href={`/business/${business.slug}`} className="group block relative">

      {/* ── Card shell — no overflow-hidden so animations can escape ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 flex flex-col">

        {/* ── Visual header ── */}
        {/* rounded-t-2xl clips the background color to the card's top corners */}
        <div
          className="flex items-center justify-center h-[90px] sm:h-28 shrink-0 relative rounded-t-2xl"
          style={{ background: bg }}
        >
          {business.logo ? (
            <img
              src={business.logo}
              alt={business.name}
              className="h-14 sm:h-16 w-auto max-w-[80%] object-contain rounded-xl drop-shadow-sm"
            />
          ) : (
            <span className="text-5xl sm:text-6xl select-none leading-none transition-transform duration-200 group-hover:scale-110">
              {emoji}
            </span>
          )}

          {/* Crackers sparks — appear inside (and escape) the header */}
          {animType === "crackers" && <CrackersAnim />}

          {/* Finance coins — rise from the icon */}
          {animType === "finance" && <FinanceAnim />}
        </div>

        {/* ── Card body ── */}
        <div className="flex flex-col flex-1 p-3 sm:p-4 gap-1 rounded-b-2xl bg-white">
          <h3 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug group-hover:text-accent transition-colors line-clamp-1">
            {business.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed line-clamp-2 hidden sm:block">
            {business.description}
          </p>
          <div className="flex items-center justify-between mt-auto pt-2 gap-1">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-400 font-medium min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
              <span className="truncate">{label}</span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform shrink-0">
              Explore →
            </span>
          </div>
        </div>
      </div>

      {/* ── SVG animation overlays — positioned on the Link, outside overflow context ── */}
      {animType === "invite"  && <InviteAnim />}
      {animType === "gift"    && <GiftAnim />}
      {animType === "market"  && <MarketAnim />}
    </Link>
  );
}
