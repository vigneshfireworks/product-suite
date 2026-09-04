"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { cart, updateCartQty, removeFromCart } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadProducts();
  }, [cart]);

  const loadProducts = async () => {
    const ids = cart.map(c => c.productId);
    const fetched: Record<string, Product> = {};
    await Promise.all(ids.map(async (id) => {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) fetched[id] = await res.json();
    }));
    setProducts(fetched);
    setLoading(false);
  };

  const total = cart.reduce((sum, item) => {
    const p = products[item.productId];
    return sum + (p ? p.sellingPrice * item.quantity : 0);
  }, 0);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-2xl font-bold text-brand-dark mb-6">Shopping Cart</h1>
      {cart.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">Cart is empty</h3>
          <Link href="/" className="text-accent hover:underline text-sm">Continue shopping →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => {
              const product = products[item.productId];
              if (!product) return null;
              return (
                <div key={item.productId} className="bg-white rounded-card shadow-card p-4 flex gap-4 items-start">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-2xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-brand-dark line-clamp-1">{product.name}</h4>
                    <p className="text-accent font-bold text-sm mt-1">{formatCurrency(product.sellingPrice)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateCartQty(item.productId, item.quantity - 1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-gray-200">-</button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.productId, item.quantity + 1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-gray-200">+</button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-brand-dark text-sm">{formatCurrency(product.sellingPrice * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div className="bg-white rounded-card shadow-card p-5 sticky top-24">
              <h3 className="font-heading font-bold text-brand-dark mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.reduce((s,c)=>s+c.quantity,0)} items)</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600"><span>Delivery</span><span className="text-green-600">Free</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-brand-dark">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
              <Link href="/checkout">
                <Button className="w-full mt-4" size="lg">Proceed to Checkout</Button>
              </Link>
              <Link href="/" className="block text-center text-sm text-gray-500 hover:text-accent mt-3 transition-colors">Continue Shopping</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
