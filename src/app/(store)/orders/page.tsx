"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, X, Eye, XCircle, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Order, Business } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import { usePagination, Pagination } from "@/components/ui/Pagination";

const STATUS_OPTIONS = [
  { value: "all",                 label: "All Statuses" },
  { value: "pending",             label: "Pending" },
  { value: "dispatched",          label: "Dispatched" },
  { value: "payment_partially",   label: "Partially Paid" },
  { value: "payment_success",     label: "Payment Success" },
  { value: "delivered_completed", label: "Delivered & Completed" },
  { value: "payment_failed",      label: "Payment Failed" },
  { value: "cancelled",           label: "Cancelled" },
];

/* ── Cancel confirmation modal ─────────────────────────────────── */
function CancelModal({ invoiceId, onConfirm, onClose }: { invoiceId: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle size={20} className="text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-brand-dark text-lg">Cancel Order</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">Are you sure you want to cancel invoice</p>
        <p className="font-mono font-bold text-purple-700 mb-4">{invoiceId}</p>
        <p className="text-xs text-gray-400 mb-6">This action cannot be undone. The order status will be changed to Cancelled.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Keep Order
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function OrdersPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [orders,       setOrders]       = useState<Order[]>([]);
  const [businesses,   setBusinesses]   = useState<Record<string, Business>>({});
  const [loading,      setLoading]      = useState(true);
  const [cancelling,   setCancelling]   = useState<string | null>(null);
  const [viewOrder,    setViewOrder]    = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  // Filters
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from,         setFrom]         = useState("");
  const [to,           setTo]           = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrders = async () => {
    try {
      const res  = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
      const list: Order[] = await res.json().catch(() => []);
      const sorted = Array.isArray(list)
        ? list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
      setOrders(sorted);
      // Fetch businesses for all orders
      const bizIds = [...new Set(sorted.map(o => o.businessId))];
      const bizMap: Record<string, Business> = {};
      await Promise.all(bizIds.map(async bizId => {
        try {
          const r = await fetch(`/api/businesses/${bizId}`);
          if (r.ok) bizMap[bizId] = await r.json();
        } catch { /* skip */ }
      }));
      setBusinesses(bizMap);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(cancelTarget.id);
    setCancelTarget(null);
    try {
      await fetch(`/api/orders/${cancelTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setOrders(prev => prev.map(o => o.id === cancelTarget.id ? { ...o, status: "cancelled" } : o));
    } finally {
      setCancelling(null);
    }
  };

  const inRange = (ts: string) => {
    if (!from && !to) return true;
    const t = new Date(ts).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to   && t > new Date(to + "T23:59:59.999Z").getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => orders.filter(o => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (o.invoiceId || "").toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.items.some(i => i.productName.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus && inRange(o.createdAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [orders, search, statusFilter, from, to]);

  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(filtered);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">My Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
          Continue Shopping <ChevronRight size={14} />
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl px-5 py-4 mb-5" style={{ border: "1.5px solid #f0f0f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex flex-1 min-w-[160px] border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
            <Search size={14} className="ml-3 my-auto text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Invoice ID, order ref or product..."
              className="flex-1 px-2 py-2 text-sm focus:outline-none" />
          </div>
          {/* Status */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm font-semibold border-2 rounded-xl focus:outline-none bg-white cursor-pointer"
            style={{ borderColor: statusFilter !== "all" ? "#FFC43F" : "#e5e7eb", color: statusFilter !== "all" ? "#c47f00" : "#374151" }}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Date range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-500">From</span>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="px-2 py-1.5 border-2 rounded-xl text-xs focus:outline-none"
              style={{ borderColor: from ? "#FFC43F" : "#e5e7eb" }} />
            <span className="text-xs font-semibold text-gray-500">To</span>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="px-2 py-1.5 border-2 rounded-xl text-xs focus:outline-none"
              style={{ borderColor: to ? "#FFC43F" : "#e5e7eb" }} />
            {(from || to) && (
              <button onClick={() => { setFrom(""); setTo(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-500 border-2 rounded-xl border-gray-200 hover:bg-gray-50 transition-colors">
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results count ── */}
      {filtered.length !== orders.length && (
        <p className="text-xs text-gray-500 mb-3">Showing {filtered.length} of {orders.length} orders</p>
      )}

      {/* ── Invoice table ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-card">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="font-heading font-bold text-xl text-brand-dark mb-2">No orders found</h3>
          <p className="text-gray-400 text-sm mb-6">
            {orders.length === 0 ? "You haven't placed any orders yet." : "No orders match your filters."}
          </p>
          {orders.length === 0 && (
            <Link href="/" className="bg-accent text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors inline-block">
              Start Shopping →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-left">Invoice</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-left hidden sm:table-cell">Date</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-left hidden md:table-cell">Items</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-center">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map(order => {
                    const isPending    = order.status === "pending";
                    const isCancelling = cancelling === order.id;
                    const totalQty     = order.items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        {/* Invoice ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-purple-400 flex-shrink-0" />
                            <span className="font-mono font-bold text-purple-700 text-sm">
                              {order.invoiceId || `#${order.id.slice(-8).toUpperCase()}`}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-gray-400 mt-0.5 ml-5">
                            ref #{order.id.slice(-8).toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 ml-5 sm:hidden">
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <div className="text-xs text-gray-600">{formatDateTime(order.createdAt)}</div>
                        </td>
                        {/* Items — total qty */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="text-sm font-semibold text-gray-700">{totalQty} qty</div>
                          <div className="text-xs text-gray-400">{order.items.length} product{order.items.length !== 1 ? "s" : ""}</div>
                        </td>
                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-bold text-brand-dark">{formatCurrency(order.totalAmount)}</span>
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setViewOrder(order)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap">
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => isPending && setCancelTarget(order)}
                              disabled={!isPending || isCancelling}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                isCancelling
                                  ? "bg-gray-100 text-gray-400 cursor-wait"
                                  : isPending
                                  ? "text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer"
                                  : "text-gray-300 bg-gray-50 cursor-not-allowed"
                              }`}
                              title={isPending ? "Cancel this order" : "Only pending orders can be cancelled"}
                            >
                              <XCircle size={12} />
                              {isCancelling ? "Cancelling…" : "Cancel"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      {/* ── Invoice Modal ── */}
      {viewOrder && (
        <InvoiceModal
          order={viewOrder}
          businessName={businesses[viewOrder.businessId]?.name ?? "Store"}
          businessLogo={businesses[viewOrder.businessId]?.logo}
          customerName={(user as any)?.name ?? "Customer"}
          customerPhone={(user as any)?.phone}
          onClose={() => setViewOrder(null)}
        />
      )}

      {/* ── Cancel Modal ── */}
      {cancelTarget && (
        <CancelModal
          invoiceId={cancelTarget.invoiceId || `#${cancelTarget.id.slice(-8).toUpperCase()}`}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
