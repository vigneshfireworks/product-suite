"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Business, Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function BusinessCartPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const { getBusinessCart, updateCartQty, removeFromCart, clearBusinessCart } = useCart();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (authLoading) return; // wait for auth to initialize
    if (!user) { router.push("/login"); return; }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user, authLoading]);

  const loadData = async () => {
    try {
      const bRes = await fetch("/api/businesses");
      const all: Business[] = await bRes.json();
      const found = all.find((b) => b.slug === slug);
      if (!found) { router.push("/"); return; }
      setBusiness(found);

      const pRes = await fetch(`/api/products?businessId=${found.id}`);
      const prods: Product[] = await pRes.json();
      const map = new Map<string, Product>();
      prods.forEach(p => map.set(p.id, p));
      setProducts(map);

      // Pre-fill address from user profile
      if ((user as any).address) setAddress((user as any).address);
    } finally {
      setLoading(false);
    }
  };

  const cartItems = business ? getBusinessCart(business.id) : [];
  const subtotal = cartItems.reduce((sum, item) => {
    const p = products.get(item.productId);
    return sum + (p?.sellingPrice || 0) * item.quantity;
  }, 0);

  const handlePlaceOrder = async () => {
    if (!business || !token) return;
    if (cartItems.length === 0) return;
    if (!address.trim()) { alert("Please enter your delivery address"); return; }

    setPlacing(true);
    try {
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: products.get(item.productId)?.sellingPrice || 0,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId: business.id,
          items: orderItems,
          totalAmount: subtotal,
          paymentMethod,
          deliveryAddress: address,
          notes,
        }),
      });

      if (res.ok) {
        clearBusinessCart(business.id);
        setOrderPlaced(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to place order");
      }
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (orderPlaced) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="font-heading text-2xl font-bold text-brand-dark mb-3">Order Placed!</h2>
      <p className="text-gray-500 mb-8">Your order from {business?.name} has been placed successfully. We will notify you once it is confirmed.</p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="bg-accent text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors">Back to Home</Link>
        <Link href={`/business/${slug}`} className="border-2 border-accent text-accent px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent/10 transition-colors">Shop More</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/business/${slug}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-brand-dark">Your Cart</h1>
          <p className="text-sm text-gray-500">{business?.name}</p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-heading font-bold text-lg text-brand-dark mb-2">Your cart is empty</h3>
          <p className="text-gray-500 text-sm mb-6">Add some products to get started.</p>
          <Link href={`/business/${slug}`} className="bg-accent text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors">Browse Products</Link>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-3 mb-6">
            {cartItems.map((item) => {
              const product = products.get(item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} className="bg-white rounded-card shadow-card p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-brand-dark text-sm line-clamp-1">{product.name}</div>
                    <div className="text-accent font-bold text-sm">{formatCurrency(product.sellingPrice)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateCartQty(item.productId, Math.max(1, item.quantity - 1))}
                      className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-sm hover:bg-gray-200"
                    >-</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                      className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-sm hover:bg-gray-200"
                    >+</button>
                  </div>
                  <div className="flex-shrink-0 text-right ml-2">
                    <div className="text-sm font-bold text-brand-dark">{formatCurrency(product.sellingPrice * item.quantity)}</div>
                    <button onClick={() => removeFromCart(item.productId)} className="mt-1 p-1 hover:text-red-500 transition-colors">
                      <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order details */}
          <div className="bg-white rounded-card shadow-card p-5 mb-4 space-y-4">
            <h3 className="font-heading font-bold text-brand-dark">Order Details</h3>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Delivery Address *</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Enter your delivery address"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="cash">Cash on Delivery</option>
                <option value="gpay">Google Pay</option>
                <option value="phonepay">PhonePe</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Any special instructions..."
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-card shadow-card p-5 mb-6">
            <h3 className="font-heading font-bold text-brand-dark mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className="text-green-600 font-semibold">Free</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-brand-dark text-base">
                <span>Total</span>
                <span className="text-accent">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>

          <Button onClick={handlePlaceOrder} loading={placing} className="w-full" size="lg">
            Place Order — {formatCurrency(subtotal)}
          </Button>
        </>
      )}
    </div>
  );
}
