"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, LayoutGrid, ArrowLeft, Package } from "lucide-react";
import { Business, Product } from "@/types";
import { useAuth } from "@/context/AuthContext";

/* ─── Market-analysis main tabs ─────────────────────────────── */
const MARKET_TABS = [
  { id: "analysis",    label: "Market Analysis" },
  { id: "ctc",         label: "CTC Calculator" },
  { id: "calculators", label: "🧮 Calculators" },
];

/* ─── Calculator sub-types ──────────────────────────────────── */
const CALC_TYPES = [
  { id: "sip",           label: "SIP",            emoji: "📈" },
  { id: "lumpsum",       label: "Lumpsum",         emoji: "💰" },
  { id: "step_sip",      label: "Step-Up SIP",     emoji: "🪜" },
  { id: "swp",           label: "SWP",             emoji: "🏧" },
  { id: "nps",           label: "NPS",             emoji: "🏛️" },
  { id: "ppf",           label: "PPF",             emoji: "🔒" },
  { id: "epf",           label: "EPF",             emoji: "👔" },
  { id: "home_loan",     label: "Home Loan / EMI", emoji: "🏠" },
  { id: "personal_loan", label: "Personal Loan",   emoji: "💳" },
  { id: "fd",            label: "FD",              emoji: "🏦" },
  { id: "rd",            label: "RD",              emoji: "🗓️" },
];

/* ─── Finance static menu (for finance category businesses) ─── */
const FINANCE_MENU = [
  { label: "Overview" },
  { label: "Personal Loans" },
  { label: "Business Loans" },
  { label: "Gold Loans" },
  { label: "EMI Calculator" },
  { label: "Documents Required" },
  { label: "Apply Now" },
  { label: "Contact Us" },
];

export function SubHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businesses,        setBusinesses]        = useState<Business[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [deptOpen,          setDeptOpen]          = useState(false);
  const [calcOpen,          setCalcOpen]          = useState(false);
  const deptRef  = useRef<HTMLDivElement>(null);
  const calcRef  = useRef<HTMLDivElement>(null);

  /* Detect if we're inside a business page */
  const businessMatch = pathname.match(/^\/business\/([^/]+)/);
  const currentSlug   = businessMatch?.[1] ?? null;
  const currentBiz    = businesses.find(b => b.slug === currentSlug) ?? null;

  const isMarketAnalysis = currentBiz?.category === "market_analysis";
  const isFinance        = currentBiz?.category === "finance";
  const isProductBiz     = currentBiz && !isFinance && !isMarketAnalysis;

  /* Active tab & calc sub-type from URL */
  const activeTab  = searchParams.get("tab")  ?? "analysis";
  const activeCalc = searchParams.get("calc") ?? "sip";

  /* Fetch businesses once */
  useEffect(() => {
    fetch("/api/businesses")
      .then(r => r.json())
      .then((data: Business[]) => setBusinesses(data.filter(b => b.isActive)))
      .catch(() => {});
  }, []);

  /* Fetch product categories only for product-type business pages */
  useEffect(() => {
    if (!isProductBiz) { setProductCategories([]); return; }
    fetch(`/api/products?businessId=${currentBiz!.id}`)
      .then(r => r.json())
      .then((prods: Product[]) => {
        const cats = Array.from(
          new Set(
            (Array.isArray(prods) ? prods : [])
              .filter(p => (p as any).isActive !== false && p.category)
              .map(p => p.category)
          )
        ).sort();
        setProductCategories(cats);
      })
      .catch(() => setProductCategories([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBiz?.id, isProductBiz]);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setDeptOpen(false);
      if (calcRef.current && !calcRef.current.contains(e.target as Node)) setCalcOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeCalcInfo = CALC_TYPES.find(c => c.id === activeCalc) ?? CALC_TYPES[0];

  return (
    <div
      className="hidden md:block w-full bg-white border-b border-gray-100"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="w-full px-6 lg:px-10">
        <div className="flex items-center h-[46px] gap-0">

          {/* ── "Shop by Categories" / "All Businesses" dropdown ── */}
          <div ref={deptRef} className="relative flex-shrink-0 h-full">
            <button
              onClick={() => setDeptOpen(!deptOpen)}
              className="flex items-center gap-2 h-full px-5 font-heading font-bold text-white transition-colors whitespace-nowrap"
              style={{
                fontSize:      "0.82rem",
                background:    deptOpen ? "#f7a422" : "#FFC43F",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f7a422")}
              onMouseLeave={e => { if (!deptOpen) e.currentTarget.style.background = "#FFC43F"; }}
            >
              <LayoutGrid size={15} />
              {currentBiz ? "All Businesses" : "Shop by Categories"}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${deptOpen ? "rotate-180" : ""}`}
              />
            </button>

            {deptOpen && (
              <div
                className="absolute left-0 top-full bg-white border border-gray-200 rounded-2xl py-1.5 z-50"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.13)", minWidth: "220px" }}
              >
                {businesses.length === 0 && (
                  <div className="px-5 py-3 text-sm text-gray-400">No businesses found</div>
                )}
                {businesses.map(biz => (
                  <Link
                    key={biz.id}
                    href={`/business/${biz.slug}`}
                    onClick={() => setDeptOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    style={{
                      fontWeight: currentSlug === biz.slug ? 700 : 500,
                      color:      currentSlug === biz.slug ? "#FFC43F" : undefined,
                    }}
                  >
                    <span className="text-base">{categoryEmoji(biz.category)}</span>
                    {biz.name}
                  </Link>
                ))}
                <hr className="my-1 border-gray-100" />
                <Link
                  href="/"
                  onClick={() => setDeptOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  🏠 All Businesses
                </Link>
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          {/* ── Nav links ── */}
          <nav className="flex items-center overflow-x-auto hide-scrollbar flex-1">
            {currentBiz ? (
              <>
                {/* Back link */}
                <Link
                  href="/"
                  className="flex items-center gap-1.5 px-4 h-[46px] text-sm font-semibold text-gray-500 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0 border-r border-gray-100"
                  style={{ fontSize: "0.8rem" }}
                >
                  <ArrowLeft size={13} />
                  Back
                </Link>

                {isMarketAnalysis ? (
                  /* ── Market Analysis: 4 main tabs in the header nav ── */
                  MARKET_TABS.map(tab => (
                    <Link
                      key={tab.id}
                      href={
                        tab.id === "calculators"
                          ? `/business/${currentSlug}?tab=calculators&calc=${activeCalc}`
                          : `/business/${currentSlug}?tab=${tab.id}`
                      }
                      className="px-4 h-[46px] flex items-center text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 border-r border-gray-100 relative"
                      style={{
                        fontSize: "0.83rem",
                        color: activeTab === tab.id ? "#FFC43F" : "#4b5563",
                        borderBottom: activeTab === tab.id ? "2px solid #FFC43F" : "2px solid transparent",
                      }}
                    >
                      {tab.label}
                    </Link>
                  ))
                ) : isProductBiz ? (
                  /* ── Product-type business: dynamic category sub-menu ── */
                  <>
                    <Link
                      href={`/business/${currentBiz.slug}`}
                      className="px-4 h-[46px] flex items-center text-sm font-semibold text-gray-700 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0 border-r border-gray-100"
                      style={{ fontSize: "0.83rem" }}
                    >
                      All Products
                    </Link>
                    {productCategories.map(cat => (
                      <Link
                        key={cat}
                        href={`/business/${currentBiz.slug}?cat=${encodeURIComponent(cat)}`}
                        className="px-4 h-[46px] flex items-center text-sm font-medium text-gray-600 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0 border-r border-gray-100 capitalize"
                        style={{ fontSize: "0.83rem" }}
                      >
                        {cat.replace(/_/g, " ")}
                      </Link>
                    ))}
                    <Link
                      href={`/business/${currentBiz.slug}?sort=demand`}
                      className="px-4 h-[46px] flex items-center text-sm font-medium text-gray-600 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0"
                      style={{ fontSize: "0.83rem" }}
                    >
                      🔥 High Demand
                    </Link>
                  </>
                ) : isFinance ? (
                  /* ── Finance: static menu ── */
                  FINANCE_MENU.map(item => (
                    <button
                      key={item.label}
                      className="px-4 h-[46px] text-sm font-medium text-gray-600 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0"
                      style={{ fontSize: "0.83rem" }}
                    >
                      {item.label}
                    </button>
                  ))
                ) : null}
              </>
            ) : (
              /* Landing page: all businesses as links */
              businesses.map(biz => (
                <Link
                  key={biz.id}
                  href={`/business/${biz.slug}`}
                  className="px-4 h-[46px] flex items-center text-sm font-medium text-gray-600 hover:text-accent whitespace-nowrap transition-colors flex-shrink-0 border-r border-gray-100 last:border-0"
                  style={{ fontSize: "0.83rem" }}
                >
                  {biz.name}
                </Link>
              ))
            )}
          </nav>

          {/* ── Right side: active calc label (no dropdown — menu is in the page sidebar) ── */}
          {isMarketAnalysis && activeTab === "calculators" && (
            <div className="flex-shrink-0 h-full border-l border-gray-100 px-4 flex items-center">
              <span className="text-sm font-semibold" style={{ color: "#FFC43F", fontSize: "0.82rem" }}>
                {activeCalcInfo.emoji} {activeCalcInfo.label}
              </span>
            </div>
          )}

          {/* ── My Orders — always shown to logged-in users ── */}
          {user && (
            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-4 h-[46px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 border-l border-gray-100"
              style={{ fontSize: "0.82rem", color: "#FFC43F" }}
            >
              <Package size={14} />
              My Orders
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function categoryEmoji(cat: string) {
  if (cat === "retail")          return "🎆";
  if (cat === "finance")         return "💰";
  if (cat === "market_analysis") return "📈";
  return "🏪";
}
