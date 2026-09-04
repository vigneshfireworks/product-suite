"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { X, CheckCircle, Phone, FileText, ShoppingBag } from "lucide-react";

/* ── Per-business order result ─────────────────────────────────── */
interface OrderResult {
  businessId: string;
  businessName: string;
  businessCategory: string;
  invoiceId: string;
  totalAmount: number;
  partnerName?: string;
  partnerPhone?: string;
}

/* ── Category helpers ──────────────────────────────────────────── */
const CAT_ICON: Record<string, string> = {
  retail: "🛍️", finance: "💰", market_analysis: "📊", other: "📦",
};
const CAT_LABEL: Record<string, string> = {
  retail: "Retail", finance: "Finance", market_analysis: "Market Analytics", other: "General",
};

/* ── Success Modal ─────────────────────────────────────────────── */
function SuccessModal({
  results,
  onViewOrders,
  onContinue,
}: {
  results: OrderResult[];
  onViewOrders: () => void;
  onContinue: () => void;
}) {
  const multiVendor = results.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-3 text-center flex-shrink-0">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-brand-dark">Thank You! 🎉</h2>
          <p className="text-sm text-gray-500 mt-1">Your order has been confirmed</p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">

          {/* Main message */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-sm text-green-800 font-semibold text-center mb-1">
              🛍️ Order received &amp; confirmed!
            </p>
            <p className="text-xs text-green-700 text-center leading-relaxed">
              We've received your order and it's being processed.
              {multiVendor
                ? " You've ordered from multiple vendors — each delivery partner will contact you separately to coordinate delivery and payment."
                : " Our delivery partner will reach out to you shortly to confirm delivery details."}
            </p>
          </div>

          {/* Step guide */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">What happens next?</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-[10px] flex items-center justify-center flex-shrink-0">1</span>
                Delivery partner reviews your order &amp; confirms availability
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-[10px] flex items-center justify-center flex-shrink-0">2</span>
                They call you to confirm delivery address &amp; time
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-[10px] flex items-center justify-center flex-shrink-0">3</span>
                Pay the amount below upon delivery (cash on delivery)
              </div>
            </div>
          </div>

          {/* Per-vendor cards */}
          {results.map((r, idx) => (
            <div key={r.businessId}
              className="border-2 border-gray-100 rounded-2xl overflow-hidden">
              {/* Business header */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl flex-shrink-0">
                  {CAT_ICON[r.businessCategory] ?? "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-brand-dark text-sm truncate">{r.businessName}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {CAT_LABEL[r.businessCategory] ?? r.businessCategory}
                    {multiVendor && (
                      <span className="ml-2 bg-accent/10 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Vendor {idx + 1}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-2.5">
                {/* Partner contact */}
                {(r.partnerName || r.partnerPhone) ? (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone size={13} className="text-blue-500" />
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-400 mb-0.5">Delivery Contact</p>
                      <p className="font-semibold text-brand-dark">{r.partnerName ?? "—"}</p>
                      {r.partnerPhone && (
                        <a href={`tel:${r.partnerPhone}`}
                          className="font-mono font-bold text-accent hover:underline">
                          📞 {r.partnerPhone}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                    <Phone size={13} />
                    Partner will contact you shortly
                  </div>
                )}

                {/* Invoice ID */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={13} className="text-purple-500" />
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-400">Invoice Ref: </span>
                    <span className="font-mono font-bold text-purple-700 select-all">{r.invoiceId}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between bg-accent/5 border border-accent/15 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Amount Due</p>
                    <p className="text-[10px] text-gray-400">Pay on delivery · Cash</p>
                  </div>
                  <span className="text-lg font-bold text-accent">{formatCurrency(r.totalAmount)}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Grand total when multiple vendors */}
          {multiVendor && (
            <div className="rounded-xl overflow-hidden border border-brand-dark/10">
              <div className="bg-brand-dark px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Total Payable</p>
                  <p className="text-[10px] text-white/40">Across all {results.length} vendors</p>
                </div>
                <span className="text-xl font-bold text-accent">
                  {formatCurrency(results.reduce((s, r) => s + r.totalAmount, 0))}
                </span>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400 pb-1">
            Save your invoice reference(s) above for tracking your order status.
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
          <button onClick={onContinue}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            🛒 Continue Shopping
          </button>
          <button onClick={onViewOrders}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#1a1a2e" }}>
            📋 Track My Orders
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Checkout Page ─────────────────────────────────────────────── */
export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();

  const [products,    setProducts]    = useState<Record<string, Product>>({});
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [address,     setAddress]     = useState("");
  const paymentMode = "cash"; // Admin/partner updates payment mode via invoice
  const [orderResults, setOrderResults] = useState<OrderResult[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (cart.length === 0) { router.push("/cart"); return; }
    setAddress((user as any).address || "");
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const cartTotal = cart.reduce((sum, item) => {
    const p = products[item.productId];
    return sum + (p ? p.sellingPrice * item.quantity : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);

    // Group cart by business
    const byBusiness: Record<string, typeof cart> = {};
    cart.forEach(item => {
      if (!byBusiness[item.businessId]) byBusiness[item.businessId] = [];
      byBusiness[item.businessId].push(item);
    });

    const results: OrderResult[] = [];

    try {
      for (const [businessId, items] of Object.entries(byBusiness)) {
        // Each business gets its own unique invoice ID
        const invoiceId = "INV-" + Date.now().toString(36).toUpperCase() +
                          Math.random().toString(36).slice(2, 6).toUpperCase();
        const orderItems = items.map(item => ({
          productId:   item.productId,
          productName: products[item.productId]?.name || "",
          quantity:    item.quantity,
          price:       products[item.productId]?.sellingPrice || 0,
        }));
        const total = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

        // Place order
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            businessId,
            items: orderItems,
            totalAmount: total,
            paymentMode,
            transactionId: undefined,
            deliveryAddress: address,
            invoiceId,
          }),
        });

        // Fetch business info + partner contact in parallel
        const [bizRes, partnerRes] = await Promise.all([
          fetch(`/api/businesses/${businessId}`),
          fetch(`/api/partners?businessId=${businessId}`),
        ]);
        const biz     = await bizRes.json().catch(() => ({}));
        const partner = await partnerRes.json().catch(() => null);

        results.push({
          businessId,
          businessName:     biz.name     ?? "Business",
          businessCategory: biz.category ?? "other",
          invoiceId,
          totalAmount: total,
          partnerName:  partner?.name,
          partnerPhone: partner?.phone,
        });
      }

      clearCart(); // Clear entire cart in one call after all orders are placed
      setOrderResults(results);
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading text-2xl font-bold text-brand-dark mb-6">Checkout</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery address */}
            <div className="bg-white rounded-card shadow-card p-5">
              <h3 className="font-heading font-bold text-brand-dark mb-4">Delivery Address</h3>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                placeholder="Enter full delivery address..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-card shadow-card p-5 sticky top-24">
              <h3 className="font-heading font-bold text-brand-dark mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {cart.map(item => {
                  const p = products[item.productId];
                  if (!p) return null;
                  return (
                    <div key={item.productId} className="flex justify-between text-xs text-gray-600">
                      <span className="line-clamp-1 flex-1 mr-2">{p.name} × {item.quantity}</span>
                      <span className="font-semibold">{formatCurrency(p.sellingPrice * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-brand-dark">
                <span>Total</span><span>{formatCurrency(cartTotal)}</span>
              </div>
              <Button type="submit" className="w-full mt-4" size="lg" loading={submitting}>
                Place Order
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Success modal ── */}
      {showSuccess && (
        <SuccessModal
          results={orderResults}
          onViewOrders={() => router.push("/orders")}
          onContinue={() => router.push("/")}
        />
      )}
    </>
  );
}
