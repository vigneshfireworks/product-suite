"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Search, FileText, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Order, Business } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUSES = ["pending", "dispatched", "payment_partially", "payment_success", "delivered_completed", "payment_failed", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending:             "Pending",
  dispatched:          "Dispatched",
  payment_partially:   "Partially Paid",
  payment_success:     "Payment Success",
  delivered_completed: "Delivered & Completed",
  payment_failed:      "Payment Failed",
  cancelled:           "Cancelled",
};
const PAYMENT_MODES = ["cash", "gpay", "phonepay", "other_online"] as const;

export default function BusinessOrders() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [users, setUsers]     = useState<Record<string, string>>({});
  const [usersPhone, setUsersPhone] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");
  // Update invoice modal
  const [modal, setModal]   = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [upForm, setUpForm] = useState({ status: "", paymentMode: "", transactionId: "", comments: "" });
  const [saving, setSaving] = useState(false);
  // View invoice modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const load = async () => {
    const [bRes, oRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/orders?businessId=${businessId}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setBusiness(await bRes.json().catch(() => null));
    const data: Order[] = await oRes.json().catch(() => []);
    setOrders(data);
    // Fetch user names + phones
    const uids = [...new Set(data.map(o => o.userId))];
    const nameMap: Record<string, string> = {};
    const phoneMap: Record<string, string> = {};
    await Promise.all(uids.map(async uid => {
      try {
        const u = await fetch(`/api/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        nameMap[uid]  = u.name  || uid;
        phoneMap[uid] = u.phone || "";
      } catch {
        nameMap[uid] = uid;
      }
    }));
    setUsers(nameMap);
    setUsersPhone(phoneMap);
    setLoading(false);
  };
  useEffect(() => { load(); }, [businessId]);

  const inRange = (createdAt: string) => {
    if (!from && !to) return true;
    const ts = new Date(createdAt).getTime();
    if (from && ts < new Date(from).getTime()) return false;
    if (to   && ts > new Date(to + "T23:59:59.999Z").getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") list = list.filter(o => o.status === statusFilter);
    if (from || to) list = list.filter(o => inRange(o.createdAt));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        (o.invoiceId || "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (users[o.userId] || "").toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, statusFilter, from, to, search, users]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<Order>(filtered, "createdAt", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const openUpdate = (o: Order) => {
    setSelected(o);
    setUpForm({ status: o.status, paymentMode: o.paymentMode, transactionId: o.transactionId || "", comments: "" });
    setModal(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/orders/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: upForm.status, paymentMode: upForm.paymentMode, transactionId: upForm.transactionId, comments: upForm.comments }),
    });
    setModal(false); setSaving(false); load();
  };

  return (
    <div>
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[180px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search invoice ID, customer, product..."
            className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none bg-white cursor-pointer"
          style={{ borderColor: statusFilter !== "all" ? "#FFC43F" : "#e5e7eb" }}>
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">From</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-2 rounded-xl focus:outline-none" style={{ borderColor: from ? "#FFC43F" : "#e5e7eb" }} />
          <span className="text-xs font-semibold text-gray-500">To</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-2 rounded-xl focus:outline-none" style={{ borderColor: to ? "#FFC43F" : "#e5e7eb" }} />
          {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-gray-400 hover:text-red-500">✕ Clear</button>}
        </div>
      </div>

      {/* ── Invoice Table ── */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice</th>
                <SortTh label="Customer"  colKey="userId"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden sm:table-cell" />
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Items</th>
                <SortTh label="Amount"    colKey="totalAmount" current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" align="right" />
                <SortTh label="Status"    colKey="status"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" />
                <SortTh label="Date"      colKey="createdAt"   current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden lg:table-cell" />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td></tr>
                ))
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No invoices found</td></tr>
              ) : paged.map(o => {
                const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    {/* Invoice ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-purple-400 flex-shrink-0" />
                        <span className="font-mono text-sm font-bold text-purple-700">
                          {o.invoiceId || `#${o.id.slice(-8).toUpperCase()}`}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-gray-400 mt-0.5 ml-5">
                        ref #{o.id.slice(-8).toUpperCase()}
                      </div>
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="font-semibold text-brand-dark text-sm">{users[o.userId] || "—"}</div>
                    </td>
                    {/* Items — total qty */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm font-semibold text-gray-700">{totalQty} qty</div>
                      <div className="text-xs text-gray-400">{o.items.length} product{o.items.length !== 1 ? "s" : ""}</div>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-bold text-brand-dark">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {formatDateTime(o.createdAt)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setViewOrder(o)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => openUpdate(o)}
                          className="text-xs font-semibold text-accent hover:underline">
                          Update
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

      {/* ── View Invoice Modal ── */}
      {viewOrder && (
        <InvoiceModal
          order={viewOrder}
          businessName={business?.name ?? "Business"}
          businessLogo={business?.logo}
          customerName={users[viewOrder.userId] || viewOrder.userId}
          customerPhone={usersPhone[viewOrder.userId]}
          onClose={() => setViewOrder(null)}
        />
      )}

      {/* ── Update Invoice Modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Update Invoice">
        {selected && (
          <div className="space-y-4">
            {/* Invoice ID header */}
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
              <FileText size={14} className="text-purple-500" />
              <div>
                <div className="font-mono text-sm font-bold text-purple-700">{selected.invoiceId}</div>
                <div className="font-mono text-xs text-gray-400">ref #{selected.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
            {/* Customer */}
            <div className="text-xs text-gray-500">
              Customer: <span className="font-semibold text-gray-700">{users[selected.userId] || selected.userId}</span>
            </div>
            {/* Items summary */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">Items</div>
              {selected.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                  <span>{it.productName} × {it.quantity}</span>
                  <span className="font-semibold">{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-brand-dark text-sm mt-2 pt-2 border-t">
                <span>Total</span><span>{formatCurrency(selected.totalAmount)}</span>
              </div>
            </div>
            {/* Order Status */}
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Order Status</label>
              <select value={upForm.status} onChange={e => setUpForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            {/* Payment Mode */}
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Payment Mode</label>
              <select value={upForm.paymentMode} onChange={e => setUpForm(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <Input label="Transaction ID" value={upForm.transactionId}
              onChange={e => setUpForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="Optional" />
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Comments</label>
              <textarea value={upForm.comments} onChange={e => setUpForm(f => ({ ...f, comments: e.target.value }))}
                rows={2} placeholder="Notes on this update..."
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving} className="flex-1">Save Update</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
