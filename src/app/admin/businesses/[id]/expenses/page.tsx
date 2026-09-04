"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Edit, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Expense } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const PAYMENT_MODES = ["cash", "gpay", "phonepay", "bank_transfer", "other"] as const;
const PAYMENT_STATUSES = ["paid", "pending", "failed"] as const;
const EMPTY = { title: "", amount: "", description: "", date: new Date().toISOString().split("T")[0], paymentMode: "cash" as string, transactionId: "", paymentStatus: "paid" as string };

function getRange(preset: string) {
  const now = new Date();
  if (preset === "this_month") return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
  if (preset === "last_month") return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0] };
  if (preset === "this_year")  return { from: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
  return { from: "", to: "" };
}

export default function BusinessExpenses() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [preset, setPreset]     = useState("");
  const [modal, setModal]       = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    const res = await fetch(`/api/expenses?businessId=${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
    setExpenses(await res.json().catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, [businessId]);

  const applyPreset = (p: string) => { setPreset(p); const r = getRange(p); setFrom(r.from); setTo(r.to); };
  const clearDates  = () => { setPreset(""); setFrom(""); setTo(""); };

  const inRange = (date: string) => {
    if (!from && !to) return true;
    const ts = new Date(date).getTime();
    if (from && ts < new Date(from).getTime()) return false;
    if (to   && ts > new Date(to + "T23:59:59.999Z").getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => {
    let list = expenses;
    if (from || to) list = list.filter(e => inRange(e.date || e.createdAt));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q));
    }
    return list;
  }, [expenses, from, to, search]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<Expense>(filtered, "date", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);
  const totalFiltered = sorted.reduce((s, e) => s + e.amount, 0);

  const openAdd  = () => { setSelected(null); setForm({ ...EMPTY }); setModal("add"); };
  const openEdit = (e: Expense) => { setSelected(e); setForm({ title: e.title, amount: String(e.amount), description: e.description || "", date: e.date?.split("T")[0] || "", paymentMode: e.paymentMode || "cash", transactionId: e.transactionId || "", paymentStatus: e.paymentStatus || "paid" }); setModal("edit"); };
  const openView = (e: Expense) => { setSelected(e); setModal("view"); };

  const handleSave = async () => {
    setSaving(true);
    if (modal === "add") {
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, businessId, amount: Number(form.amount) }) });
    } else if (modal === "edit" && selected) {
      await fetch(`/api/expenses/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    }
    setModal(null); setSaving(false); load();
  };

  const psColor = (s?: string) => s === "paid" ? { bg: "#dcfce7", color: "#16a34a" } : s === "failed" ? { bg: "#fee2e2", color: "#dc2626" } : { bg: "#fef3c7", color: "#d97706" };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[180px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["this_month", "last_month", "this_year"] as const).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={preset === p ? { background: "#10b981", color: "#fff", borderColor: "#10b981" } : { background: "#f0fdf4", color: "#1a7a5e", borderColor: "#d1fae5" }}>
              {p === "this_month" ? "This Month" : p === "last_month" ? "Last Month" : "This Year"}
            </button>
          ))}
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(""); }} className="px-3 py-2 text-xs border-2 rounded-xl focus:outline-none" style={{ borderColor: "#d1fae5" }} />
          <input type="date" value={to}   onChange={e => { setTo(e.target.value); setPreset(""); }}   className="px-3 py-2 text-xs border-2 rounded-xl focus:outline-none" style={{ borderColor: "#d1fae5" }} />
          {(from || to) && <button onClick={clearDates} className="text-xs text-gray-400 hover:text-red-500">✕ Clear</button>}
        </div>
        <div className="ml-auto">
          <Button onClick={openAdd} className="flex items-center gap-2"><Plus size={15} /> Add Expense</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Purpose"     colKey="title"         current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" />
                <SortTh label="Amount"      colKey="amount"        current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" align="right" />
                <SortTh label="Date"        colKey="date"          current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden sm:table-cell" />
                <SortTh label="Payment"     colKey="paymentMode"   current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden md:table-cell" />
                <SortTh label="Status"      colKey="paymentStatus" current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden md:table-cell" />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No expenses found</td></tr>
              ) : paged.map(e => {
                const pc = psColor(e.paymentStatus);
                return (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brand-dark">{e.title}</div>
                      {e.description && <div className="text-xs text-gray-400 line-clamp-1">{e.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 capitalize">{(e.paymentMode || "—").replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.paymentStatus && <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize" style={pc}>{e.paymentStatus}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(e)} className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"><Eye size={14} /></button>
                        <button onClick={() => openEdit(e)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {sorted.length > 0 && (
              <tfoot className="border-t-2 border-gray-100" style={{ background: "#fafafa" }}>
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500">{sorted.length} expense{sorted.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(totalFiltered)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />

      {/* Add / Edit Modal */}
      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Add Expense" : "Edit Expense"}>
        <div className="space-y-3">
          <Input label="Purpose *"      value={form.title}         onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Rent, Transport" />
          <Input label="Amount (₹) *"   type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Date *"         type="date"   value={form.date}   onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <Input label="Transaction ID" value={form.transactionId} onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="Optional" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} loading={saving} className="flex-1">{modal === "add" ? "Add Expense" : "Update Expense"}</Button>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Expense Details">
        {selected && (
          <div className="space-y-3">
            {[
              { label: "Purpose",        val: selected.title },
              { label: "Amount",         val: formatCurrency(selected.amount) },
              { label: "Date",           val: selected.date ? new Date(selected.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
              { label: "Payment Mode",   val: (selected.paymentMode || "—").replace(/_/g, " ") },
              { label: "Payment Status", val: selected.paymentStatus || "—" },
              { label: "Transaction ID", val: selected.transactionId || "—" },
              { label: "Description",    val: selected.description || "—" },
              { label: "Recorded At",    val: formatDateTime(selected.createdAt) },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500 font-medium">{r.label}</span>
                <span className="font-semibold text-brand-dark text-right max-w-[60%] capitalize">{r.val}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => { openEdit(selected); }}>Edit</Button>
              <Button variant="ghost" onClick={() => setModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
