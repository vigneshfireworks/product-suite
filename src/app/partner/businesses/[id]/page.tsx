"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Package, ShoppingCart, DollarSign, Search, FileText, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Business, Product, Order, Expense, Loan } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
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

export default function PartnerBusinessDetail() {
  const params = useParams();
  const { token, user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "loans" | "expenses">("orders");
  const [business, setBusiness] = useState<Business | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expenseModal, setExpenseModal] = useState(false);
  const [eForm, setEForm] = useState({ title: "", amount: "", description: "", date: "" });
  const [saving, setSaving] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [usersPhone, setUsersPhone] = useState<Record<string, string>>({});
  const [usersName, setUsersName] = useState<Record<string, string>>({});
  // Update invoice modal
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invForm, setInvForm] = useState({ status: "", paymentMode: "", transactionId: "", comments: "" });
  const [invSaving, setInvSaving] = useState(false);
  // View invoice modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const id = params.id as string;
    const [bRes, oRes, eRes, lRes, sRes] = await Promise.all([
      fetch(`/api/businesses/${id}`),
      fetch(`/api/orders?businessId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/expenses?businessId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/loans/business/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/dashboard?businessId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setBusiness(await bRes.json());
    const orderData: Order[] = await oRes.json().catch(() => []);
    setOrders(orderData);
    setExpenses(await eRes.json().catch(() => []));
    setLoans(await lRes.json().catch(() => []));
    setStats(await sRes.json().catch(() => {}));
    setLoading(false);
    // Fetch user names + phones for invoice display
    const uids = [...new Set(orderData.map((o: Order) => o.userId))];
    const nameMap: Record<string, string> = {};
    const phoneMap: Record<string, string> = {};
    await Promise.all(uids.map(async (uid: string) => {
      try {
        const u = await fetch(`/api/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        nameMap[uid]  = u.name  || uid;
        phoneMap[uid] = u.phone || "";
      } catch { nameMap[uid] = uid; }
    }));
    setUsersName(nameMap);
    setUsersPhone(phoneMap);
  };

  const openInvoice = (o: Order) => {
    setSelectedOrder(o);
    setInvForm({ status: o.status, paymentMode: o.paymentMode || "cash", transactionId: o.transactionId || "", comments: "" });
    setInvoiceModal(true);
  };

  const saveInvoice = async () => {
    if (!selectedOrder) return;
    setInvSaving(true);
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: invForm.status, paymentMode: invForm.paymentMode, transactionId: invForm.transactionId, comments: invForm.comments }),
    });
    setInvoiceModal(false);
    setInvSaving(false);
    loadAll();
  };

  const updateLoanStatus = async (loanId: string, status: string) => {
    await fetch(`/api/loans/${loanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadAll();
  };

  const saveExpense = async () => {
    setSaving(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...eForm, businessId: params.id }),
    });
    setExpenseModal(false);
    setSaving(false);
    loadAll();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!business) return <div>Business not found</div>;

  const isFinance = business.category === "finance";
  const mapping = (user?.businesses as any[])?.find((m: any) => m.businessId === business.id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/partner" className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-brand-dark">{business.name}</h1>
          <p className="text-xs text-gray-500 capitalize">{business.category.replace(/_/g, " ")}</p>
        </div>
      </div>

      {/* My stake */}
      {mapping && (
        <div className="bg-accent/10 border border-accent/20 rounded-card p-4 mb-6 flex gap-6">
          <div>
            <div className="text-xs text-gray-500">My Investment</div>
            <div className="font-bold text-brand-dark text-lg">{formatCurrency(mapping.investedAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Profit Share</div>
            <div className="font-bold text-green-600 text-lg">{mapping.profitRatio}%</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Orders" value={stats.totalOrders || 0} icon={<ShoppingCart size={18} />} color="blue" />
        <StatCard title="Total Sales" value={formatCurrency(stats.totalSales || 0)} icon={<DollarSign size={18} />} color="green" />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses || 0)} icon={<DollarSign size={18} />} color="red" />
        {isFinance ? (
          <StatCard title="Loan Requests" value={loans.length} icon={<Package size={18} />} color="purple" />
        ) : (
          <StatCard title="Pending" value={stats.totalPending || 0} icon={<Package size={18} />} color="orange" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-card w-fit">
        {(isFinance ? ["loans", "expenses"] as const : ["orders", "expenses"] as const).map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? "bg-accent text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      {/* Orders */}
      {tab === "orders" && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
            <Search size={15} className="ml-3 my-auto text-gray-400 flex-shrink-0" />
            <input
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              placeholder="Search order ID, invoice ID, product..."
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-card shadow-card">No invoices yet</div>
          ) : orders
              .filter(o => {
                if (!orderSearch.trim()) return true;
                const q = orderSearch.toLowerCase();
                return (
                  (o.invoiceId || "").toLowerCase().includes(q) ||
                  o.id.toLowerCase().includes(q) ||
                  o.items.some(i => i.productName.toLowerCase().includes(q))
                );
              })
              .map(o => (
            <div key={o.id} className="bg-white rounded-card shadow-card p-4">
              {/* Invoice header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <FileText size={13} className="text-purple-400" />
                    <span className="font-mono text-sm font-bold text-purple-700">
                      {o.invoiceId || `#${o.id.slice(-8).toUpperCase()}`}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-400 ml-5">
                    ref #{o.id.slice(-8).toUpperCase()} · {formatDateTime(o.createdAt)}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>

              {/* Items — total qty summary */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-3">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {o.items.reduce((s, i) => s + i.quantity, 0)} qty
                  </span>
                  {" · "}{o.items.length} product{o.items.length !== 1 ? "s" : ""}
                </div>
                <div className="font-bold text-brand-dark text-sm">{formatCurrency(o.totalAmount)}</div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setViewOrder(o)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border-2 border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Eye size={12} /> View Invoice
                </button>
                <button
                  onClick={() => openInvoice(o)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-accent border-2 border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <FileText size={12} /> Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loans (Finance) */}
      {tab === "loans" && (
        <div className="space-y-3">
          {loans.length === 0 ? <div className="text-center py-10 text-gray-400 bg-white rounded-card shadow-card">No loan requests</div> : loans.map(l => (
            <div key={l.id} className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-brand-dark">{formatCurrency(l.amount)}</div>
                  <div className="text-xs text-gray-500">{l.duration} months @ {l.interest}%</div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {["pending", "approved", "rejected", "closed"].map(s => (
                  <button key={s} onClick={() => updateLoanStatus(l.id, s)} className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${l.status === s ? "border-accent bg-accent/10 text-accent" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>{s}</button>
                ))}
              </div>
              {l.repayments?.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Repayment History</div>
                  {l.repayments.map(r => (
                    <div key={r.id} className="flex justify-between text-xs text-gray-500">
                      <span>{new Date(r.date).toLocaleDateString()}</span>
                      <span className="font-semibold text-green-600">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expenses */}
      {tab === "expenses" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-heading font-bold text-brand-dark">Expenses</h2>
            <Button size="sm" onClick={() => { setEForm({ title: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] }); setExpenseModal(true); }} className="flex items-center gap-1"><Plus size={14} /> Add</Button>
          </div>
          <div className="space-y-3">
            {expenses.map(e => (
              <div key={e.id} className="bg-white rounded-card shadow-card p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-brand-dark text-sm">{e.title}</div>
                  <div className="text-xs text-gray-400">{formatDateTime(e.date)}</div>
                </div>
                <div className="font-bold text-red-600">{formatCurrency(e.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View Invoice Modal ── */}
      {viewOrder && (
        <InvoiceModal
          order={viewOrder}
          businessName={business?.name ?? "Business"}
          businessLogo={business?.logo}
          customerName={usersName[viewOrder.userId] || viewOrder.userId}
          customerPhone={usersPhone[viewOrder.userId]}
          onClose={() => setViewOrder(null)}
        />
      )}

      {/* ── Update Invoice Modal ── */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="Update Invoice">
        {selectedOrder && (
          <div className="space-y-4">
            {/* Invoice ID */}
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
              <FileText size={14} className="text-purple-500" />
              <div>
                <div className="font-mono text-sm font-bold text-purple-700">{selectedOrder.invoiceId}</div>
                <div className="font-mono text-xs text-gray-400">ref #{selectedOrder.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>

            {/* Items summary */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">Items</div>
              {selectedOrder.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                  <span>{it.productName} × {it.quantity}</span>
                  <span className="font-semibold">{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-brand-dark text-sm mt-2 pt-2 border-t">
                <span>Total</span><span>{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Order Status */}
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Order Status</label>
              <select value={invForm.status} onChange={e => setInvForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Payment Mode</label>
              <select value={invForm.paymentMode} onChange={e => setInvForm(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            {/* Transaction ID */}
            <Input label="Transaction ID" value={invForm.transactionId}
              onChange={e => setInvForm(f => ({ ...f, transactionId: e.target.value }))}
              placeholder="Optional" />

            {/* Comments */}
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1">Comments</label>
              <textarea value={invForm.comments}
                onChange={e => setInvForm(f => ({ ...f, comments: e.target.value }))}
                rows={2} placeholder="Notes on this update..."
                className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
            </div>

            <div className="flex gap-3">
              <Button onClick={saveInvoice} loading={invSaving} className="flex-1">Save Update</Button>
              <Button variant="ghost" onClick={() => setInvoiceModal(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense">
        <div className="space-y-4">
          <Input label="Title" value={eForm.title} onChange={e => setEForm({...eForm, title: e.target.value})} />
          <Input label="Amount (₹)" type="number" value={eForm.amount} onChange={e => setEForm({...eForm, amount: e.target.value})} />
          <Input label="Date" type="date" value={eForm.date} onChange={e => setEForm({...eForm, date: e.target.value})} />
          <div className="flex gap-3">
            <Button onClick={saveExpense} loading={saving} className="flex-1">Add</Button>
            <Button variant="ghost" onClick={() => setExpenseModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
