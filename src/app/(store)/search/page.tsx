"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Store, Package, TrendingUp, Gift } from "lucide-react";
import { Business } from "@/types";
import { SearchProduct } from "@/app/api/search/route";
import { formatCurrency } from "@/lib/utils";

const catColors: Record<string, string> = {
  retail:          "from-orange-400 to-red-500",
  finance:         "from-blue-500 to-purple-600",
  market_analysis: "from-green-500 to-teal-600",
  other:           "from-pink-400 to-rose-500",
};
const catIcons: Record<string, React.ReactNode> = {
  retail:          <Store size={24} />,
  finance:         <TrendingUp size={24} />,
  market_analysis: <TrendingUp size={24} />,
  other:           <Gift size={24} />,
};

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products,   setProducts]   = useState<SearchProduct[]>([]);
  const [loading,    setLoading]    = useState(false);

  const runSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
      setProducts(data.products ?? []);
    } catch {
      setBusinesses([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runSearch(q); }, [q, runSearch]);

  const total = businesses.length + products.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-brand-dark flex items-center gap-2 mb-1">
          <Search size={22} className="text-accent" />
          {q ? (
            <>Search results for <span className="text-accent ml-1">"{q}"</span></>
          ) : "All Products & Businesses"}
        </h1>
        {!loading && (
          <p className="text-gray-500 text-sm">
            {total === 0
              ? "No results found."
              : `${total} result${total !== 1 ? "s" : ""} — ${businesses.length} business${businesses.length !== 1 ? "es" : ""}, ${products.length} product${products.length !== 1 ? "s" : ""}`
            }
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-100 rounded-card h-36 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-100 rounded-card h-52 animate-pulse" />)}
          </div>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">No results for "{q}"</h3>
          <p className="text-gray-500 text-sm mb-6">Try a different search term or browse our businesses below.</p>
          <Link href="/" className="inline-block bg-accent text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors">
            Browse All Businesses
          </Link>
        </div>
      ) : (
        <div className="space-y-10">

          {/* Businesses section */}
          {businesses.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
                <Store size={18} className="text-accent" />
                Businesses
                <span className="text-sm font-normal text-gray-400 ml-1">({businesses.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map(b => (
                  <Link key={b.id} href={`/business/${b.slug}`} className="group block">
                    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover border border-gray-50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                      <div className={`h-24 bg-gradient-to-br ${catColors[b.category] || "from-gray-400 to-gray-600"} flex items-center justify-center`}>
                        {b.logo
                          ? <img src={b.logo} alt={b.name} className="h-14 w-auto object-contain" />
                          : <div className="text-white opacity-80 scale-125">{catIcons[b.category] ?? <Store size={24} />}</div>
                        }
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading font-bold text-brand-dark group-hover:text-accent transition-colors">{b.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full capitalize">
                            {b.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-accent text-xs font-semibold group-hover:translate-x-1 transition-transform inline-block">Explore →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Products section */}
          {products.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
                <Package size={18} className="text-accent" />
                Products
                <span className="text-sm font-normal text-gray-400 ml-1">({products.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map(p => (
                  <Link key={p.id} href={`/business/${p.businessSlug}`} className="group block">
                    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover border border-gray-50 transition-all duration-200 overflow-hidden flex flex-col">
                      {/* Image */}
                      <div className="h-32 bg-gray-50 flex items-center justify-center relative">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain p-2" />
                          : <span className="text-3xl">📦</span>
                        }
                        {p.discount > 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{p.discount}%
                          </span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-[10px] text-accent font-semibold mb-0.5">{p.businessName}</p>
                        <h4 className="font-semibold text-xs text-brand-dark line-clamp-2 leading-tight mb-2">{p.name}</h4>
                        <div className="mt-auto flex items-baseline gap-1">
                          <span className="font-bold text-sm text-accent">{formatCurrency(p.sellingPrice)}</span>
                          {p.originalPrice > p.sellingPrice && (
                            <span className="text-[10px] text-gray-400 line-through">{formatCurrency(p.originalPrice)}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 group-hover:text-accent transition-colors">View in store →</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-card animate-pulse" />)}</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
