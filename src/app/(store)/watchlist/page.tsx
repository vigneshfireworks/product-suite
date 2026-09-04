"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, addToCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts]   = useState<Record<string, Product>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(true);
  const [addedIds, setAddedIds]   = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;          // wait for auth to initialize
    if (!user) { router.push("/login"); return; }
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist, authLoading]);

  const loadProducts = async () => {
    const ids = watchlist.map(w => w.productId);
    const fetched: Record<string, Product> = {};
    await Promise.all(ids.map(async (id) => {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) fetched[id] = await res.json();
    }));
    setProducts(fetched);
    // Init quantities to 1 for any new items
    setQuantities(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (!next[id]) next[id] = 1; });
      return next;
    });
    setLoading(false);
  };

  const changeQty = (productId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] ?? 1) + delta),
    }));
  };

  const handleAddToCart = (productId: string) => {
    const p = products[productId];
    if (!p) return;
    addToCart({
      productId: p.id,
      businessId: p.businessId,
      name: p.name,
      price: p.sellingPrice,
      quantity: quantities[productId] ?? 1,
    });
    removeFromWatchlist(productId);
    setAddedIds(prev => new Set(prev).add(productId));
    setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(productId); return s; }), 1500);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="font-heading text-2xl font-bold text-brand-dark mb-6 flex items-center gap-2">
            <Heart className="text-red-500" size={24} fill="currentColor" /> Wishlist
            {watchlist.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-1">({watchlist.length} items)</span>
            )}
          </h1>

          {watchlist.length === 0 ? (
            <div className="text-center py-20">
              <Heart size={56} className="text-gray-200 mx-auto mb-4" />
              <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 text-sm mb-6">Save items you love and come back to them anytime.</p>
              <Link href="/" className="inline-block bg-accent text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors">
                Discover Businesses →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {watchlist.map((item) => {
                const p = products[item.productId];
                if (!p) return null;
                const qty = quantities[item.productId] ?? 1;
                const wasAdded = addedIds.has(item.productId);

                return (
                  <div key={item.productId} className="bg-white rounded-card shadow-card overflow-hidden flex flex-col hover:shadow-card-hover transition-shadow">
                    {/* Product image */}
                    <div className="h-36 bg-gray-50 flex items-center justify-center relative">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain p-3" />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                      {/* Remove from wishlist */}
                      <button
                        onClick={() => removeFromWatchlist(item.productId)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                      </button>
                      {/* Discount badge */}
                      {p.discount > 0 && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
                          -{p.discount}%
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="font-semibold text-sm text-brand-dark line-clamp-2 leading-tight mb-1">{p.name}</h4>
                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="font-bold text-accent">{formatCurrency(p.sellingPrice)}</span>
                        {p.originalPrice > p.sellingPrice && (
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(p.originalPrice)}</span>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs text-gray-500 font-medium">Qty:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => changeQty(item.productId, -1)}
                            className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
                            disabled={qty <= 1}
                          >
                            <Minus size={11} className={qty <= 1 ? "text-gray-300" : "text-gray-600"} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-brand-dark">{qty}</span>
                          <button
                            onClick={() => changeQty(item.productId, 1)}
                            className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Plus size={11} className="text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Add to Cart button */}
                      <button
                        onClick={() => handleAddToCart(item.productId)}
                        className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: wasAdded ? "#22c55e" : "#FFC43F",
                          color: "white",
                        }}
                      >
                        <ShoppingCart size={13} />
                        {wasAdded ? "Added!" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}
