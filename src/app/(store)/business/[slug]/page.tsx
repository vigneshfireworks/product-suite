"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart, Package, TrendingUp, FileText } from "lucide-react";
import { FinanceCalculators } from "@/components/ui/FinanceCalculators";
import { IncomeTaxCalculator } from "@/components/ui/IncomeTaxCalculator";
import { Business, Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useActiveBusiness } from "@/context/ActiveBusinessContext";
import { bizEmoji, bizColors } from "@/lib/biz-utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";

export default function BusinessPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToCart, addToWatchlist } = useCart();
  const { setActiveBusiness } = useActiveBusiness();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const urlSearchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(urlSearchParams.get("q") ?? "");
  // sortBy state is set by the sort-pill buttons; URL ?sort=demand overrides it
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    // Wait for auth to initialize before running finance gate
    if (!authLoading) loadData();
    // Clear footer branding when leaving this page
    return () => setActiveBusiness(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, authLoading]);
  // NOTE: no second useEffect — activeCat and urlSort are derived directly from
  // urlSearchParams, which is reactive and re-renders the component on URL change.

  const loadData = async () => {
    try {
      const bRes = await fetch("/api/businesses");
      const all: Business[] = await bRes.json();
      const found = all.find((b) => b.slug === slug);
      if (!found) { router.push("/"); return; }
      setBusiness(found);
      const { bg, dot } = bizColors(found.id, found.category);
      setActiveBusiness({ name: found.name, emoji: bizEmoji(found.name, found.category), bg, dot });

      // Block finance from anonymous (auth is already initialized here)
      if (found.category === "finance" && !user) {
        router.push("/login");
        return;
      }

      const pRes = await fetch(`/api/products?businessId=${found.id}`);
      const prods: Product[] = await pRes.json();
      setProducts(Array.isArray(prods) ? prods : []);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  // Finance business
  if (business.category === "finance") {
    return <FinanceBusinessPage business={business} />;
  }
  // Share market
  if (business.category === "market_analysis") {
    return <ShareMarketPage business={business} />;
  }

  // Standard product business — derive filter/sort from URL params (reactive via useSearchParams)
  const activeCat = urlSearchParams.get("cat") ?? "";
  const effectiveSortBy = urlSearchParams.get("sort") === "demand" ? "popular" : sortBy;

  const filtered = products.filter(p => {
    const matchSearch = !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !activeCat || p.category === activeCat;
    return matchSearch && matchCat;
  });

  const sorted = [...filtered].sort((a, b) => {
    const da = a.discount || Math.round(((a.originalPrice - a.sellingPrice) / a.originalPrice) * 100);
    const db = b.discount || Math.round(((b.originalPrice - b.sellingPrice) / b.originalPrice) * 100);
    switch (effectiveSortBy) {
      case "price_asc":      return a.sellingPrice - b.sellingPrice;
      case "price_desc":     return b.sellingPrice - a.sellingPrice;
      case "discount_desc":  return db - da;
      case "discount_asc":   return da - db;
      case "popular":        return (a.stock ?? 999) - (b.stock ?? 999); // lower stock = more popular
      default:               return 0;
    }
  });

  const SORT_OPTIONS = [
    { value: "default",       label: "Default" },
    { value: "price_asc",     label: "Price: Low → High" },
    { value: "price_desc",    label: "Price: High → Low" },
    { value: "discount_desc", label: "Discount: High → Low" },
    { value: "discount_asc",  label: "Discount: Low → High" },
    { value: "popular",       label: "Frequently Ordered" },
  ];

  // Derive unique product categories for mobile tab strip
  const productCategories = Array.from(
    new Set(products.filter(p => p.category).map(p => p.category))
  ).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
      {/* Business header */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-3xl font-bold text-brand-dark">{business.name}</h1>
        <p className="text-gray-500 mt-1 text-sm">{business.description}</p>
      </div>

      {/* ── Mobile category tab strip ─────────────────────────── */}
      {productCategories.length > 0 && (
        <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
            <a
              href={`/business/${business.slug}`}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border-2 transition-all"
              style={!activeCat
                ? { background: "#FFC43F", color: "#fff", borderColor: "#FFC43F" }
                : { background: "#fff", color: "#555", borderColor: "#e5e7eb" }}
            >
              All
            </a>
            {productCategories.map(cat => (
              <a
                key={cat}
                href={`/business/${business.slug}?cat=${encodeURIComponent(cat)}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border-2 transition-all capitalize"
                style={activeCat === cat
                  ? { background: "#FFC43F", color: "#fff", borderColor: "#FFC43F" }
                  : { background: "#fff", color: "#555", borderColor: "#e5e7eb" }}
              >
                {cat.replace(/_/g, " ")}
              </a>
            ))}
            <a
              href={`/business/${business.slug}?sort=demand`}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border-2 transition-all"
              style={urlSearchParams.get("sort") === "demand"
                ? { background: "#FFC43F", color: "#fff", borderColor: "#FFC43F" }
                : { background: "#fff", color: "#555", borderColor: "#e5e7eb" }}
            >
              🔥 High Demand
            </a>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full md:max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {/* Sort pills — horizontally scrollable on mobile, wrapped on desktop */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto hide-scrollbar mb-6">
        <div className="flex items-center gap-2 md:flex-wrap" style={{ minWidth: "max-content" }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap"
              style={effectiveSortBy === opt.value
                ? { background: "#FFC43F", color: "#fff", borderColor: "#FFC43F" }
                : { background: "#fff", color: "#555", borderColor: "#e5e7eb" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">No products yet</h3>
          <p className="text-gray-500 text-sm">Products will appear here once added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Product quick-view modal ─────────────────────────────────── */
function ProductModal({
  product,
  business,
  onClose,
}: {
  product: Product;
  business: Business;
  onClose: () => void;
}) {
  const { addToCart, addToWatchlist, removeFromWatchlist, watchlist } = useCart();
  const { user } = useAuth();
  const [qty,    setQty]    = useState(1);
  const [added,  setAdded]  = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  // Touch swipe support
  const touchStartX = React.useRef<number>(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? goNext() : goPrev();
  };

  const images      = (product.images ?? []).filter(Boolean);
  const hasMultiple = images.length > 1;
  const goPrev = () => setImgIdx(i => (i - 1 + images.length) % images.length);
  const goNext = () => setImgIdx(i => (i + 1) % images.length);

  const isWishlisted = watchlist.some(w => w.productId === product.id);
  const discount = product.discount ||
    Math.round(((product.originalPrice - product.sellingPrice) / product.originalPrice) * 100);

  const handleAddToCart = () => {
    if (!user) { window.location.href = "/login"; return; }
    addToCart({ productId: product.id, businessId: business.id, name: product.name, price: product.sellingPrice, quantity: qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Close on backdrop click; stop propagation inside the card
  return (
    <div className="prod-modal-backdrop" onClick={onClose}>
      <div className="prod-modal-card" onClick={e => e.stopPropagation()}>

        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {business.name}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 font-bold text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Image carousel ── */}
        <div
          className="mx-5 mb-1 bg-gray-50 rounded-2xl h-52 flex items-center justify-center overflow-hidden relative select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
              -{discount}%
            </span>
          )}
          <button
            onClick={() => {
              if (isWishlisted) removeFromWatchlist(product.id);
              else addToWatchlist({ productId: product.id, businessId: business.id });
            }}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
          >
            <Heart
              size={14}
              style={{ color: isWishlisted ? "#ef4444" : "#d1d5db" }}
              fill={isWishlisted ? "#ef4444" : "none"}
            />
          </button>

          {/* Current image — key forces re-mount → CSS fade plays */}
          {images.length > 0 ? (
            <img
              key={imgIdx}
              src={images[imgIdx]}
              alt={`${product.name} ${imgIdx + 1}`}
              className="h-full w-full object-contain p-4 prod-modal-img"
            />
          ) : (
            <div className="text-6xl opacity-20">📦</div>
          )}

          {/* Left arrow */}
          {hasMultiple && (
            <button
              onClick={e => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all"
              aria-label="Previous image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {hasMultiple && (
            <button
              onClick={e => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all"
              aria-label="Next image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Dot indicators ── */}
        {hasMultiple && (
          <div className="flex justify-center gap-1.5 mb-3 pt-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                aria-label={`Image ${i + 1}`}
                className="transition-all duration-200 rounded-full"
                style={{
                  width:      i === imgIdx ? 20 : 6,
                  height:     6,
                  background: i === imgIdx ? "#FFC43F" : "#D1D5DB",
                }}
              />
            ))}
          </div>
        )}

        {/* ── Image counter (e.g. 1 / 3) ── */}
        {hasMultiple && (
          <p className="text-center text-[10px] text-gray-400 -mt-1 mb-2 font-medium">
            {imgIdx + 1} / {images.length}
          </p>
        )}

        {/* ── Details ── */}
        <div className="px-5 pb-5 space-y-3">
          <h2 className="font-heading font-bold text-lg text-brand-dark leading-snug">
            {product.name}
          </h2>

          {/* Price row */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-dark font-heading">
              {formatCurrency(product.sellingPrice)}
            </span>
            {product.originalPrice > product.sellingPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save {discount}%
              </span>
            )}
          </div>

          {/* Stock */}
          {product.stock <= 5 && product.stock > 0 && (
            <p className="text-xs font-semibold text-orange-500">⚠ Only {product.stock} left in stock!</p>
          )}
          {product.stock === 0 && (
            <p className="text-xs font-semibold text-red-500">✕ Out of stock</p>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
          )}

          {/* Video link */}
          {product.videoUrl && (
            <a
              href={product.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors group/vid"
            >
              {/* YouTube-style play icon */}
              <span className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shrink-0 group-hover/vid:bg-red-600 transition-colors">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                  <path d="M1 1.5v11L11 7 1 1.5z"/>
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-red-700 group-hover/vid:text-red-800">Watch Product Video</div>
                <div className="text-[10px] text-red-400 truncate">{product.videoUrl}</div>
              </div>
              <svg className="ml-auto shrink-0 text-red-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          )}

          {/* Qty + Add to Cart */}
          {product.stock !== 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-base font-bold hover:bg-gray-50 transition-colors"
                >−</button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-base font-bold hover:bg-gray-50 transition-colors"
                >+</button>
              </div>
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  added
                    ? "bg-green-500 text-white scale-[0.97]"
                    : "bg-accent text-white hover:bg-accent-dark active:scale-[0.97]"
                }`}
              >
                {added ? "✓ Added to Cart!" : "Add to Cart"}
              </button>
            </div>
          )}
          {product.stock === 0 && (
            <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold bg-gray-200 text-gray-400 cursor-not-allowed">
              Out of Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Product card ─────────────────────────────────────────────── */
function ProductCard({ product, business }: { product: Product; business: Business }) {
  const { addToCart, addToWatchlist, removeFromWatchlist, watchlist } = useCart();
  const { user } = useAuth();
  const [qty,       setQty]       = useState(1);
  const [added,     setAdded]     = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isWishlisted = watchlist.some(w => w.productId === product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWishlisted) removeFromWatchlist(product.id);
    else addToWatchlist({ productId: product.id, businessId: business.id });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { window.location.href = "/login"; return; }
    addToCart({ productId: product.id, businessId: business.id, name: product.name, price: product.sellingPrice, quantity: qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const discount = product.discount ||
    Math.round(((product.originalPrice - product.sellingPrice) / product.originalPrice) * 100);

  return (
    <>
      {showModal && (
        <ProductModal
          product={product}
          business={business}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="prod-card bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-50 flex flex-col">

        {/* ── Image zone — click opens modal ── */}
        <div
          className="prod-img-zone relative bg-gray-50 rounded-t-card h-36"
          onClick={() => setShowModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === "Enter" && setShowModal(true)}
          aria-label={`View ${product.name} details`}
        >
          {discount > 0 && (
            <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50 transition-colors"
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={14}
              className="transition-colors"
              style={{ color: isWishlisted ? "#ef4444" : "#d1d5db" }}
              fill={isWishlisted ? "#ef4444" : "none"}
            />
          </button>

          {/* Image or placeholder — pump-up animation targets these */}
          <div className="h-full flex items-center justify-center">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="prod-placeholder text-4xl opacity-30 select-none">📦</div>
            )}
          </div>

          {/* Video badge — shown when videoUrl exists */}
          {product.videoUrl && (
            <div className="absolute bottom-2 right-2 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <svg width="7" height="8" viewBox="0 0 12 14" fill="white"><path d="M1 1.5v11L11 7 1 1.5z"/></svg>
              VIDEO
            </div>
          )}
        </div>

        {/* ── Card body ── */}
        <div className="p-3 flex flex-col flex-1">
          <h3
            className="font-heading font-semibold text-sm text-brand-dark line-clamp-2 cursor-pointer hover:text-accent transition-colors"
            onClick={() => setShowModal(true)}
          >
            {product.name}
          </h3>
          {product.stock <= 5 && product.stock > 0 && (
            <span className="text-xs text-orange-500 mt-1">Only {product.stock} left!</span>
          )}
          {product.stock === 0 && (
            <span className="text-xs text-red-500 mt-1">Out of stock</span>
          )}
          <div className="mt-auto pt-2">
            <div className="flex items-center gap-1 mb-2">
              <span className="font-bold text-brand-dark text-sm">{formatCurrency(product.sellingPrice)}</span>
              {product.originalPrice > product.sellingPrice && (
                <span className="text-xs text-gray-400 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={e => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-200 transition-colors"
              >-</button>
              <span className="text-xs font-semibold w-5 text-center">{qty}</span>
              <button
                onClick={e => { e.stopPropagation(); setQty(qty + 1); }}
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-200 transition-colors"
              >+</button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={`w-full mt-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                added ? "bg-green-500 text-white" :
                product.stock === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" :
                "bg-accent text-white hover:bg-accent-dark"
              }`}
            >
              {added ? "✓ Added" : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const FINANCE_TABS = [
  { id: "overview",   label: "Overview" },
  { id: "personal",   label: "Personal Loans" },
  { id: "business",   label: "Business Loans" },
  { id: "gold",       label: "Gold Loans" },
  { id: "emi",        label: "EMI Calculator" },
  { id: "documents",  label: "Documents Required" },
  { id: "apply",      label: "Apply Now" },
  { id: "contact",    label: "Contact Us" },
];

function FinanceBusinessPage({ business }: { business: Business }) {
  const { user, token } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeFinanceTab, setActiveFinanceTab] = useState("overview");
  const [form, setForm] = useState({ amount: "", duration: "", interest: "" });

  useEffect(() => {
    if (token) loadLoans();
  }, [token]);

  const loadLoans = async () => {
    const res = await fetch(`/api/loans?businessId=${business.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setLoans(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ businessId: business.id, ...form }),
    });
    setShowForm(false);
    loadLoans();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-8">
      <div className="mb-4 md:mb-8">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-brand-dark">{business.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{business.description}</p>
      </div>

      {/* ── Mobile Finance Tab Strip ─────────────────────────── */}
      <div className="md:hidden -mx-4 px-4 mb-5 overflow-x-auto hide-scrollbar">
        <div className="flex border-b border-gray-100" style={{ minWidth: "max-content" }}>
          {FINANCE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFinanceTab(tab.id);
                if (tab.id === "apply") setShowForm(true);
              }}
              className="px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: activeFinanceTab === tab.id ? "#FFC43F" : "#6b7280",
                borderBottomColor: activeFinanceTab === tab.id ? "#FFC43F" : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Requests", value: loans.length, color: "text-blue-600" },
          { label: "Approved", value: loans.filter(l => l.status === "approved").length, color: "text-green-600" },
          { label: "Pending", value: loans.filter(l => l.status === "pending").length, color: "text-yellow-600" },
          { label: "Rejected", value: loans.filter(l => l.status === "rejected").length, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4 text-center">
            <div className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading font-bold text-lg text-brand-dark">My Loan Requests</h2>
        <Button onClick={() => setShowForm(true)} size="sm">+ New Request</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card p-5 mb-6 space-y-4">
          <h3 className="font-heading font-bold text-brand-dark">New Loan Request</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Amount (₹)</label>
              <input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required type="number" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Duration (months)</label>
              <input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required type="number" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Interest (%)</label>
              <input value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} required type="number" step="0.1" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Submit</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loans.map((loan) => (
          <div key={loan.id} className="bg-white rounded-card shadow-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-brand-dark">₹{loan.amount.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{loan.duration} months @ {loan.interest}%</div>
              </div>
              <StatusBadge status={loan.status} />
            </div>
            {loan.status === "approved" && loan.repayments?.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-semibold text-gray-600 mb-2">Repayment History</div>
                <div className="space-y-1">
                  {loan.repayments.map((r: any) => (
                    <div key={r.id} className="text-xs text-gray-500 flex justify-between">
                      <span>{new Date(r.date).toLocaleDateString()}</span>
                      <span className="font-semibold text-green-600">₹{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareMarketPage({ business }: { business: Business }) {
  const searchParams = useSearchParams();
  const activeTab  = searchParams.get("tab")  ?? "analysis";
  const activeCalc = searchParams.get("calc") ?? "sip";

  const [investForm, setInvestForm] = useState({ amount: "", rate: "", years: "" });

  const investResult = (() => {
    const p = Number(investForm.amount) || 0;
    const r = (Number(investForm.rate) || 0) / 100;
    const t = Number(investForm.years) || 0;
    const future = p * Math.pow(1 + r, t);
    const profit = future - p;
    return { future, profit };
  })();

  const MARKET_TABS = [
    { id: "analysis",    label: "Market Analysis" },
    { id: "ctc",         label: "CTC Calculator" },
    { id: "calculators", label: "🧮 Calculators" },
  ];

  const CALC_TYPES = [
    { id: "sip",           label: "SIP",            emoji: "📈" },
    { id: "lumpsum",       label: "Lumpsum",         emoji: "💰" },
    { id: "step_sip",      label: "Step-Up SIP",     emoji: "🪜" },
    { id: "swp",           label: "SWP",             emoji: "🏧" },
    { id: "nps",           label: "NPS",             emoji: "🏛️" },
    { id: "ppf",           label: "PPF",             emoji: "🔒" },
    { id: "epf",           label: "EPF",             emoji: "👔" },
    { id: "home_loan",     label: "Home Loan",       emoji: "🏠" },
    { id: "personal_loan", label: "Personal Loan",   emoji: "💳" },
    { id: "fd",            label: "FD",              emoji: "🏦" },
    { id: "rd",            label: "RD",              emoji: "🗓️" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8">

      {/* ── Mobile-only horizontal tab strip (SubHeader hidden on mobile) ── */}
      <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto hide-scrollbar">
        <div className="flex border-b border-gray-100 min-w-max">
          {MARKET_TABS.map(tab => (
            <a
              key={tab.id}
              href={
                tab.id === "calculators"
                  ? `/business/${business.slug}?tab=calculators&calc=${activeCalc}`
                  : `/business/${business.slug}?tab=${tab.id}`
              }
              className="px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: activeTab === tab.id ? "#FFC43F" : "#6b7280",
                borderBottomColor: activeTab === tab.id ? "#FFC43F" : "transparent",
              }}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Mobile calculator type grid (when on calculators tab) ── */}
      {activeTab === "calculators" && (
        <div className="md:hidden grid grid-cols-4 gap-2 mb-4">
          {CALC_TYPES.map(ct => (
            <a
              key={ct.id}
              href={`/business/${business.slug}?tab=calculators&calc=${ct.id}`}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: activeCalc === ct.id ? "#FFC43F" : "#e5e7eb",
                background: activeCalc === ct.id ? "#FFF9EC" : "#fff",
              }}
            >
              <span className="text-xl">{ct.emoji}</span>
              <span className="text-[9px] font-semibold leading-tight" style={{ color: activeCalc === ct.id ? "#FFC43F" : "#6b7280" }}>
                {ct.label}
              </span>
            </a>
          ))}
        </div>
      )}

      {activeTab === "analysis" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "SENSEX", value: "82,134.61", change: "+1.2%", up: true },
              { label: "NIFTY 50", value: "25,010.90", change: "+0.9%", up: true },
              { label: "NIFTY BANK", value: "51,342.10", change: "-0.3%", up: false },
            ].map((idx) => (
              <div key={idx.label} className="bg-white rounded-card shadow-card p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">{idx.label}</div>
                <div className="font-bold text-xl font-heading text-brand-dark">{idx.value}</div>
                <div className={`text-sm font-semibold mt-1 ${idx.up ? "text-green-600" : "text-red-600"}`}>{idx.change}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-card shadow-card p-5">
            <h3 className="font-heading font-bold text-brand-dark mb-3">Market Insights</h3>
            <div className="space-y-3">
              {[
                { title: "IT Sector Rally", desc: "Tech stocks surge on strong earnings; Infosys up 3.4%", time: "2h ago" },
                { title: "RBI Policy Meeting", desc: "Rate unchanged at 6.5%. Market reacts positively.", time: "5h ago" },
                { title: "Auto Sector", desc: "Maruti posts 15% YoY growth in monthly sales", time: "1d ago" },
              ].map((n) => (
                <div key={n.title} className="flex gap-3 pb-3 border-b last:border-0">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-brand-dark">{n.title}</div>
                    <div className="text-xs text-gray-500">{n.desc}</div>
                    <div className="text-xs text-gray-400 mt-1">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ctc" && (
        <div>
          <IncomeTaxCalculator />
        </div>
      )}

      {activeTab === "investment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-card shadow-card p-5">
            <h3 className="font-heading font-bold text-brand-dark mb-4">Investment Details</h3>
            <div className="space-y-3">
              {[
                { label: "Principal Amount (₹)", field: "amount" },
                { label: "Expected Return (%/year)", field: "rate" },
                { label: "Investment Period (years)", field: "years" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={investForm[field as keyof typeof investForm]}
                    onChange={e => setInvestForm({ ...investForm, [field]: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-accent/5 rounded-card p-5 space-y-4">
            <h3 className="font-heading font-bold text-brand-dark">Projected Returns</h3>
            {[
              { label: "Principal Amount", value: `₹${(Number(investForm.amount) || 0).toLocaleString()}` },
              { label: "Expected Profit", value: `₹${Math.round(investResult.profit).toLocaleString()}` },
              { label: "Total Future Value", value: `₹${Math.round(investResult.future).toLocaleString()}`, highlight: true },
            ].map((r) => (
              <div key={r.label} className={`flex justify-between items-center p-3 rounded-xl ${r.highlight ? "bg-accent text-white" : "bg-white"}`}>
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="font-bold">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "calculators" && (
        <div className="flex gap-6 items-start">
          {/* ── Calculator panel (main content) ── */}
          <div className="flex-1 min-w-0">
            <FinanceCalculators activeCalcProp={activeCalc} hideTabBar />
          </div>

          {/* ── Right-side sticky calculator menu (desktop only) ── */}
          <div className="hidden md:block w-44 flex-shrink-0 sticky top-[130px]">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculators</span>
              </div>
              <nav className="py-1">
                {CALC_TYPES.map(ct => (
                  <a
                    key={ct.id}
                    href={`/business/${business.slug}?tab=calculators&calc=${ct.id}`}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
                    style={{
                      fontWeight:      activeCalc === ct.id ? 700 : 500,
                      color:           activeCalc === ct.id ? "#FFC43F" : "#374151",
                      background:      activeCalc === ct.id ? "#FFF9EC" : "transparent",
                      borderLeft:      activeCalc === ct.id ? "3px solid #FFC43F" : "3px solid transparent",
                    }}
                  >
                    <span className="text-base">{ct.emoji}</span>
                    <span className="text-xs leading-tight">{ct.label}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
