"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Product, Business } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { OrderPackingAnimation } from "@/components/ui/OrderPackingAnimation";
import { X, CheckCircle, Phone, FileText, ShoppingBag, Wallet } from "lucide-react";

/* ── Per-business order result ─────────────────────────────────── */
interface OrderResult {
  businessId: string;
  businessName: string;
  businessCategory: string;
  invoiceId: string;
  totalAmount: number;
  walletRedeemed?: number;
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
                  <span className="text-lg font-bold text-accent">{formatCurrency(r.totalAmount - (r.walletRedeemed || 0))}</span>
                </div>
                {!!r.walletRedeemed && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-gray-400 flex items-center gap-1"><Wallet size={11} /> Wallet balance used</span>
                    <span className="font-semibold text-green-600">− {formatCurrency(r.walletRedeemed)}</span>
                  </div>
                )}
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
                  {formatCurrency(results.reduce((s, r) => s + r.totalAmount - (r.walletRedeemed || 0), 0))}
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
  const { cart, clearCart, updateCartQty, removeFromCart } = useCart();
  const { user, token, login } = useAuth();
  const router = useRouter();

  const [products,    setProducts]    = useState<Record<string, Product>>({});
  const [businesses,  setBusinesses]  = useState<Record<string, Business>>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletRedeemableNow, setWalletRedeemableNow] = useState(false);
  const [walletValidFrom, setWalletValidFrom] = useState("");
  const [walletValidTo, setWalletValidTo] = useState("");
  const [useWallet,   setUseWallet]   = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [address,     setAddress]     = useState("");
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (customerPhone.length === 10) {
      handlePhoneLookup(customerPhone);
    }
  }, [customerPhone]);

  const handlePhoneLookup = async (phone: string) => {
    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.exists && data.token && data.user) {
        // Silent login
        login(data.token, data.user);
        // Auto-fill profile
        setCustomerName(data.user.name || "");
        setAddress(data.user.address || "");
      }
    } catch (err) {
      console.error("Phone lookup failed:", err);
    }
  };
  const paymentMode = "cash"; // Admin/partner updates payment mode via invoice
  const [orderResults, setOrderResults] = useState<OrderResult[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPacking, setShowPacking] = useState(false);

  useEffect(() => {
    if (cart.length === 0) { router.push("/cart"); return; }
    setAddress((user as any)?.address || "");
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

    // Load business wallet-eligibility + the customer's current wallet balance
    const bizIds = Array.from(new Set(cart.map(c => c.businessId)));
    const [bizResults, walletRes] = await Promise.all([
      Promise.all(bizIds.map(id => fetch(`/api/businesses/${id}`).then(r => r.ok ? r.json() : null).catch(() => null))),
      fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const bizMap: Record<string, Business> = {};
    bizResults.forEach((b: Business | null) => { if (b?.id) bizMap[b.id] = b; });
    setBusinesses(bizMap);
    if (walletRes) {
      setWalletBalance(walletRes.balance || 0);
      setWalletRedeemableNow(!!walletRes.isRedeemableNow);
      setWalletValidFrom(walletRes.validFrom);
      setWalletValidTo(walletRes.validTo);
    }

    setLoading(false);
  };

  const cartTotal = cart.reduce((sum, item) => {
    const p = products[item.productId];
    return sum + (p ? p.sellingPrice * item.quantity : 0);
  }, 0);

  // Portion of the cart that's eligible to redeem wallet balance against (wallet-enabled businesses only)
  const walletEligibleSubtotal = cart.reduce((sum, item) => {
    const p = products[item.productId];
    if (!p || !businesses[item.businessId]?.walletEnabled) return sum;
    return sum + p.sellingPrice * item.quantity;
  }, 0);
  const canUseWallet = walletBalance > 0 && walletRedeemableNow && walletEligibleSubtotal > 0;
  const walletApplyPreview = canUseWallet && useWallet ? Math.min(walletBalance, walletEligibleSubtotal) : 0;
  const payableTotal = cartTotal - walletApplyPreview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);
    setShowPacking(true);
    const startedAt = Date.now();
    const PACK_ANIM_MS = 3400; // keep in sync with --pack-dur in globals.css

    // Group cart by business
    const byBusiness: Record<string, typeof cart> = {};
    cart.forEach(item => {
      if (!byBusiness[item.businessId]) byBusiness[item.businessId] = [];
      byBusiness[item.businessId].push(item);
    });

    const results: OrderResult[] = [];
    let walletRemaining = useWallet ? walletBalance : 0;

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

        // Apply wallet balance for this business only if it's wallet-enabled
        let walletRedeemed = 0;
        if (walletRemaining > 0 && businesses[businessId]?.walletEnabled) {
          walletRedeemed = Math.min(walletRemaining, total);
          walletRemaining -= walletRedeemed;
        }

        // Place order
        const orderRes = await fetch("/api/orders", {
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
            walletRedeemed: walletRedeemed || undefined,
            customerName,
            customerPhone,
          }),
        });

        if (!orderRes.ok) throw new Error(`Order failed for ${businessId}`);
        const { order, token: newToken } = await orderRes.json();

        // If a new token was returned (common for guest-to-user conversion), log them in
        if (newToken) {
          // We need the user profile to call login(token, user)
          // Since the API didn't return the full user object, we can either
          // 1. Fetch it here, or
          // 2. Modify the API to return it.
          // Let's assume we can call a profile endpoint or just use the info we have.
          // Actually, let's update the login state if we have a token.
          // For simplicity, we'll trigger a silent login lookup or just use the token
          // if the AuthContext allows it. Since useAuth().login needs (token, user),
          // we will fetch the user profile.
          const userRes = await fetch("/api/auth/check-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: customerPhone }),
          });
          const userData = await userRes.json();
          if (userData.user) {
            login(newToken, userData.user);
          }
        }

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
          walletRedeemed: walletRedeemed || undefined,
          partnerName:  partner?.name,
          partnerPhone: partner?.phone,
        });
      }

      clearCart(); // Clear entire cart in one call after all orders are placed

      // Let the packing/truck animation finish playing even if the API was fast
      const elapsed = Date.now() - startedAt;
      if (elapsed < PACK_ANIM_MS) {
        await new Promise(resolve => setTimeout(resolve, PACK_ANIM_MS - elapsed));
      }

      setOrderResults(results);
      setShowPacking(false);
      setShowSuccess(true);
    } catch (err) {
      setShowPacking(false);
      console.error("Failed to place order:", err);
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
              <h3 className="font-heading font-bold text-brand-dark mb-4">Delivery Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name</label>
                    <input
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Phone Number</label>
                    <input
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      required
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Delivery Address</label>
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
                    <div key={item.productId} className="flex justify-between items-center text-xs text-gray-600 mb-2 last:mb-0">
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <span className="line-clamp-1">{p.name}</span>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-0.5">
                          <button
                            onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
                          >−</button>
                          <span className="w-4 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(p.sellingPrice * item.quantity)}</span>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-brand-dark">
                <span>Total</span><span>{formatCurrency(cartTotal)}</span>
              </div>

              {/* Wallet balance application */}
              {walletBalance > 0 && walletEligibleSubtotal > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                  {canUseWallet ? (
                    <>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useWallet}
                          onChange={e => setUseWallet(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-accent flex-shrink-0"
                        />
                        <span className="text-xs text-gray-600 flex-1">
                          <span className="flex items-center gap-1 font-semibold text-brand-dark">
                            <Wallet size={13} className="text-accent" /> Use wallet balance
                          </span>
                          <span className="text-gray-400">{formatCurrency(walletBalance)} available</span>
                        </span>
                      </label>
                      {walletApplyPreview > 0 && (
                        <div className="flex justify-between text-xs mt-2 text-green-600 font-semibold">
                          <span>Wallet applied</span><span>− {formatCurrency(walletApplyPreview)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
                      <Wallet size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      You have {formatCurrency(walletBalance)} in wallet balance — redeemable
                      {walletValidFrom ? ` from ${new Date(walletValidFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                      {walletValidTo ? ` to ${new Date(walletValidTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}.
                    </p>
                  )}
                </div>
              )}

              {walletApplyPreview > 0 && (
                <div className="flex justify-between font-bold text-brand-dark pt-2 mt-1 border-t">
                  <span>Amount Payable</span><span>{formatCurrency(payableTotal)}</span>
                </div>
              )}

              <Button type="submit" className="w-full mt-4" size="lg" loading={submitting}>
                Place Order
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Packing / truck animation while the order is being placed ── */}
      {showPacking && <OrderPackingAnimation />}

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
