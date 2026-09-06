"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Eye, TrendingUp, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PartnerBiz { businessId: string; investedAmount: number; profitRatio: number; }
interface Partner { id: string; name: string; email: string; phone: string; businesses: PartnerBiz[]; createdAt: string; updatedAt: string; }
interface HistoryRecord { id: string; entity: string; entityId: string; action: string; changes: Record<string, unknown>; performedBy: string; performedAt: string; }
interface AdminUser { id: string; name: string; role: string; }
interface BizRevStats { totalSales: number; totalExpenses: number; totalDeliveredCompleted: number; totalProfit: number; }

// Use LOCAL date to avoid UTC timezone shift (toISOString returns UTC, off by ±1 day in IST)
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
function getRange(preset: string) {
  const now = new Date();
  if (preset === "this_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  if (preset === "last_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (preset === "this_year")  return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
  return { from: "", to: "" };
}

export default function BusinessPartners() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"add" | "view" | "revenue" | null>(null);
  const [selected, setSelected]       = useState<Partner | null>(null);
  const [history, setHistory]         = useState<HistoryRecord[]>([]);
  const [saving, setSaving]           = useState(false);
  const [userMap, setUserMap]         = useState<Record<string, string>>({}); // userId → name
  // New partner form
  const [form, setForm]         = useState({ name: "", email: "", phone: "", password: "" });
  const [investAmount, setInvestAmount] = useState("");
  // Additional investment
  const [addInvest, setAddInvest] = useState("");

  // Revenue state — uses dashboard API (server-side completedAt filtering)
  const [revStats, setRevStats]     = useState<BizRevStats | null>(null);
  const [revLoading, setRevLoading] = useState(false);
  const [revFrom, setRevFrom]       = useState("");
  const [revTo, setRevTo]           = useState("");
  const [revPreset, setRevPreset]   = useState("");

  const load = useCallback(async () => {
    const [partnerRes, userRes] = await Promise.all([
      fetch("/api/partners", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/users",    { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const data: Partner[]    = await partnerRes.json().catch(() => []);
    const users: AdminUser[] = await userRes.json().catch(() => []);
    setAllPartners(data);
    // Build id→name map from registered users + partners (for audit "performed by" display)
    const map: Record<string, string> = {};
    users.forEach(u => { map[u.id] = u.name; });
    data.forEach(p => { map[p.id] = p.name; });
    setUserMap(map);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Partners in this business
  const partners = useMemo(() => allPartners.filter(p => p.businesses.some(b => b.businessId === businessId)), [allPartners, businessId]);

  // Total invested in this business (for profit % calculation)
  const totalInvested = useMemo(() => partners.reduce((sum, p) => {
    const m = p.businesses.find(b => b.businessId === businessId);
    return sum + (m?.investedAmount || 0);
  }, 0), [partners, businessId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return partners;
    const q = search.toLowerCase();
    return partners.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.phone.includes(q));
  }, [partners, search]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<Partner>(filtered, "createdAt", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const getBizMapping = (p: Partner) => p.businesses.find(b => b.businessId === businessId);

  // Auto-calculate profit ratio from investment ratio
  const calcProfitRatio = (investedAmount: number) => {
    const total = totalInvested + investedAmount; // will include this partner
    if (total <= 0) return 0;
    return Math.round((investedAmount / total) * 100);
  };

  const handleAdd = async () => {
    setSaving(true);
    const existing = allPartners.find(p => p.email === form.email);
    const amt = Number(investAmount);
    if (existing) {
      const currentBizs = existing.businesses;
      const alreadyMapped = currentBizs.some(b => b.businessId === businessId);
      const newTotal = totalInvested + (alreadyMapped ? amt - (getBizMapping(existing)?.investedAmount || 0) : amt);
      const newBizs = alreadyMapped
        ? currentBizs.map(b => b.businessId === businessId ? { ...b, investedAmount: b.investedAmount + amt, profitRatio: Math.round(((b.investedAmount + amt) / (newTotal || 1)) * 100) } : b)
        : [...currentBizs, { businessId, investedAmount: amt, profitRatio: Math.round((amt / (newTotal || 1)) * 100) }];
      // Recalculate all ratios
      const totalAfter = newBizs.filter(b => b.businessId === businessId).reduce((s, b) => s + b.investedAmount, 0) + partners.filter(p => p.email !== existing.email).reduce((s, p) => s + (getBizMapping(p)?.investedAmount || 0), 0);
      await fetch(`/api/partners/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businesses: newBizs }) });
    } else {
      const profitRatio = totalInvested > 0 ? Math.round((amt / (totalInvested + amt)) * 100) : 100;
      await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, businesses: [{ businessId, investedAmount: amt, profitRatio }] }),
      });
    }
    setModal(null); setSaving(false); load();
  };

  // Recalculate all partners' profit ratios in this business
  const recalcAllRatios = async (updatedPartners: Partner[]) => {
    const businessPartners = updatedPartners.filter(p => p.businesses.some(b => b.businessId === businessId));
    const newTotal = businessPartners.reduce((s, p) => s + (p.businesses.find(b => b.businessId === businessId)?.investedAmount || 0), 0);
    for (const p of businessPartners) {
      const m = p.businesses.find(b => b.businessId === businessId);
      if (!m) continue;
      const newRatio = newTotal > 0 ? Math.round((m.investedAmount / newTotal) * 100) : 0;
      if (newRatio !== m.profitRatio) {
        const newBizs = p.businesses.map(b => b.businessId === businessId ? { ...b, profitRatio: newRatio } : b);
        await fetch(`/api/partners/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businesses: newBizs }) });
      }
    }
  };

  const handleAdditionalInvest = async () => {
    if (!selected) return;
    setSaving(true);
    const m = getBizMapping(selected);
    const newInvested = (m?.investedAmount || 0) + Number(addInvest);
    const newBizs = selected.businesses.map(b =>
      b.businessId === businessId ? { ...b, investedAmount: newInvested } : b
    );
    await fetch(`/api/partners/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businesses: newBizs }) });
    setAddInvest(""); setSaving(false);
    // Recalculate ratios for all partners
    const updated = allPartners.map(p => p.id === selected.id ? { ...p, businesses: newBizs } : p);
    await recalcAllRatios(updated);
    load();
    // Reload selected's history
    const res = await fetch(`/api/audit?businessId=${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
    const all: HistoryRecord[] = await res.json().catch(() => []);
    setHistory(all.filter(h => h.entity === "partner" && h.entityId === selected.id));
  };

  const openView = async (p: Partner) => {
    setSelected(p);
    setModal("view");
    // Fetch audit history for this partner using entityId match (fix #11)
    const res = await fetch(`/api/audit?businessId=${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
    const all: HistoryRecord[] = await res.json().catch(() => []);
    setHistory(all.filter(h => h.entity === "partner" && h.entityId === p.id));
  };

  // Fetch revenue from dashboard API — server filters by completedAt (correct two-date attribution)
  const loadRevData = useCallback(async (from: string, to: string) => {
    setRevLoading(true);
    const params = new URLSearchParams({ businessId });
    if (from) params.set("from", from);
    if (to)   params.set("to",   to);
    const res = await fetch(`/api/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data: BizRevStats = await res.json().catch(() => ({
      totalSales: 0, totalExpenses: 0, totalDeliveredCompleted: 0, totalProfit: 0,
    }));
    setRevStats(data);
    setRevLoading(false);
  }, [businessId, token]);

  // Revenue view
  const openRevenue = async (p: Partner) => {
    setSelected(p);
    setRevPreset("this_month");
    const r = getRange("this_month");
    setRevFrom(r.from); setRevTo(r.to);
    setRevStats(null);
    setModal("revenue");
    await loadRevData(r.from, r.to);
  };

  const applyRevPreset = async (p: string) => {
    const r = getRange(p);
    setRevPreset(p);
    setRevFrom(r.from); setRevTo(r.to);
    await loadRevData(r.from, r.to);
  };

  const revenueDisplay = useMemo(() => {
    if (!selected || !revStats) return null;
    const m = getBizMapping(selected);
    const profitRatio = m?.profitRatio || 0;
    const partnerShare = revStats.totalProfit * (profitRatio / 100);
    return {
      totalSales:    revStats.totalSales,
      totalExpenses: revStats.totalExpenses,
      netProfit:     revStats.totalProfit,
      profitRatio,
      partnerShare,
      orderCount:    revStats.totalDeliveredCompleted,
    };
  }, [selected, revStats]);

  const profitColor = (pct: number) => pct >= 30 ? { bg: "#dcfce7", color: "#16a34a" } : pct >= 15 ? { bg: "#fef9c3", color: "#ca8a04" } : { bg: "#fee2e2", color: "#dc2626" };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex flex-1 min-w-[180px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <div className="ml-auto flex gap-2 items-center">
          {totalInvested > 0 && (
            <span className="text-xs text-gray-500 bg-green-50 px-3 py-2 rounded-xl border border-green-100">
              Total invested: <strong>{formatCurrency(totalInvested)}</strong>
            </span>
          )}
          <Button onClick={() => { setForm({ name: "", email: "", phone: "", password: "" }); setInvestAmount(""); setModal("add"); }} className="flex items-center gap-2">
            <Plus size={15} /> Add Partner
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Partner"  colKey="name"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" />
                <SortTh label="Phone"    colKey="phone"     current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden sm:table-cell" />
                <SortTh label="Invested" colKey="name"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" align="right" />
                <SortTh label="Profit %" colKey="name"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" align="center" />
                <SortTh label="Since"    colKey="createdAt" current={sortKey} dir={sortDir} onToggle={toggle} className="px-4 hidden lg:table-cell" />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No partners for this business yet</td></tr>
              ) : paged.map(p => {
                const m  = getBizMapping(p);
                const pc = profitColor(m?.profitRatio || 0);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brand-dark">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.phone}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-dark">{formatCurrency(m?.investedAmount || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={pc}>{m?.profitRatio || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(p)} className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Investment history"><Eye size={14} /></button>
                        <button onClick={() => openRevenue(p)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Revenue view"><TrendingUp size={14} /></button>
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

      {/* Add Partner Modal */}
      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Add Partner to Business">
        <div className="space-y-3">
          <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">If the partner email already exists, the investment will be added to them. Profit % is auto-calculated from investment ratio.</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name"     value={form.name}  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} wrapperClassName="col-span-2" />
            <Input label="Email"    type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone"    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" wrapperClassName="col-span-2" />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase">Investment in This Business</p>
            <Input label="Invested Amount (₹)" type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)} />
            {investAmount && Number(investAmount) > 0 && (
              <p className="text-xs text-green-600 mt-1.5 bg-green-50 px-3 py-2 rounded-xl">
                Auto profit share: <strong>{totalInvested > 0 ? Math.round((Number(investAmount) / (totalInvested + Number(investAmount))) * 100) : 100}%</strong> based on investment ratio
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={handleAdd} loading={saving} className="flex-1">Add Partner</Button>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* View / History Modal */}
      <Modal open={modal === "view"} onClose={() => setModal(null)} title={`${selected?.name} — Investment History`} size="lg">
        {selected && (
          <div className="space-y-4">
            {(() => {
              const m = getBizMapping(selected);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-green-700 font-semibold">Total Invested</div>
                    <div className="text-xl font-bold font-heading text-green-800">{formatCurrency(m?.investedAmount || 0)}</div>
                  </div>
                  <div className="bg-accent/10 rounded-xl p-3 text-center">
                    <div className="text-xs text-accent font-semibold">Profit Share</div>
                    <div className="text-xl font-bold font-heading text-accent">{m?.profitRatio || 0}%</div>
                    <div className="text-xs text-gray-500 mt-0.5">auto-calculated</div>
                  </div>
                </div>
              );
            })()}

            {/* Add more investment */}
            <div className="border rounded-xl p-3">
              <p className="text-xs font-bold text-gray-600 mb-2">Add More Investment</p>
              <div className="flex gap-3 mb-3">
                <Input label="Additional Amount (₹)" type="number" value={addInvest} onChange={e => setAddInvest(e.target.value)} />
              </div>
              {addInvest && Number(addInvest) > 0 && (() => {
                const m = getBizMapping(selected);
                const newInvested = (m?.investedAmount || 0) + Number(addInvest);
                const newTotal = totalInvested - (m?.investedAmount || 0) + newInvested;
                const newRatio = Math.round((newInvested / newTotal) * 100);
                return <p className="text-xs text-green-600 mb-2 bg-green-50 px-3 py-2 rounded-xl">New profit share will be: <strong>{newRatio}%</strong> (recalculated for all partners)</p>;
              })()}
              <Button size="sm" onClick={handleAdditionalInvest} loading={saving} disabled={!addInvest}>Add Investment</Button>
            </div>

            {/* Audit history */}
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Audit History</p>
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No recorded changes yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map(h => {
                    // Extract investment amounts for this business from changes
                    type BizEntry = { businessId: string; investedAmount: number; profitRatio: number };
                    const before = (h.changes as { before?: BizEntry[] }).before;
                    const after  = (h.changes as { after?:  BizEntry[] }).after;
                    const prevEntry = before?.find((b: BizEntry) => b.businessId === businessId);
                    const nextEntry = after?.find( (b: BizEntry) => b.businessId === businessId);
                    const amtChange = nextEntry
                      ? prevEntry
                        ? nextEntry.investedAmount - prevEntry.investedAmount
                        : nextEntry.investedAmount
                      : null;

                    return (
                      <div key={h.id} className="bg-gray-50 rounded-xl p-3 text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-brand-dark capitalize">{h.action} · {h.entity}</span>
                          <span className="text-gray-400">{formatDateTime(h.performedAt)}</span>
                        </div>
                        <div className="text-gray-500">
                          By: <span className="font-semibold text-gray-700">{userMap[h.performedBy] || h.performedBy}</span>
                        </div>
                        {nextEntry && (
                          <div className="mt-2 space-y-1.5">
                            {/* Amount breakdown row */}
                            {amtChange !== null && amtChange !== 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Previous */}
                                {prevEntry && (
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-semibold">
                                    Prev: {formatCurrency(prevEntry.investedAmount)}
                                  </span>
                                )}
                                {/* Arrow */}
                                {prevEntry && <span className="text-gray-400 font-bold">→</span>}
                                {/* Added */}
                                <span className={`px-2 py-0.5 rounded-lg font-semibold ${amtChange > 0 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                  {amtChange > 0 ? "+" : ""}{formatCurrency(amtChange)}
                                </span>
                                {/* Arrow */}
                                <span className="text-gray-400 font-bold">→</span>
                                {/* New total */}
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">
                                  Total: {formatCurrency(nextEntry.investedAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">
                                Invested: {formatCurrency(nextEntry.investedAmount)}
                              </span>
                            )}
                            {/* Profit share */}
                            <div>
                              <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-lg font-semibold">
                                {nextEntry.profitRatio}% share
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button variant="ghost" onClick={() => setModal(null)} className="w-full">Close</Button>
          </div>
        )}
      </Modal>

      {/* Revenue Modal */}
      <Modal open={modal === "revenue"} onClose={() => setModal(null)} title={`${selected?.name} — Revenue View`} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Date filter */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500">Filter by completion date</span>
                <button
                  onClick={() => loadRevData(revFrom, revTo)}
                  disabled={revLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border transition-all"
                  style={{ borderColor: "#d1fae5", color: "#1a7a5e", background: "#f0fdf4" }}
                >↻ Refresh</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["this_month", "last_month", "this_year"] as const).map((k) => {
                  const labels: Record<string, string> = { this_month: "This Month", last_month: "Last Month", this_year: "This Year" };
                  return (
                    <button key={k} onClick={() => applyRevPreset(k)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                      style={revPreset === k
                        ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
                        : { background: "#fff", color: "#1a7a5e", borderColor: "#d1fae5" }}>
                      {labels[k]}
                    </button>
                  );
                })}
                <button onClick={() => { setRevPreset(""); setRevFrom(""); setRevTo(""); loadRevData("", ""); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={revPreset === "" && !revFrom && !revTo
                    ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
                    : { background: "#fafafa", color: "#888", borderColor: "#e5e7eb" }}>
                  All Time
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">From</span>
                <input type="date" value={revFrom}
                  onChange={e => { const v = e.target.value; setRevFrom(v); setRevPreset(""); loadRevData(v, revTo); }}
                  className="px-2 py-1 border rounded-lg text-xs focus:outline-none" />
                <span className="text-xs text-gray-500">To</span>
                <input type="date" value={revTo}
                  onChange={e => { const v = e.target.value; setRevTo(v); setRevPreset(""); loadRevData(revFrom, v); }}
                  className="px-2 py-1 border rounded-lg text-xs focus:outline-none" />
              </div>
            </div>

            {revLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : revenueDisplay && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-700 font-semibold">Total Sales</div>
                    <div className="text-xl font-bold font-heading text-blue-800">{formatCurrency(revenueDisplay.totalSales)}</div>
                    <div className="text-xs text-blue-500">{revenueDisplay.orderCount} completed</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-red-700 font-semibold">Total Expenses</div>
                    <div className="text-xl font-bold font-heading text-red-800">{formatCurrency(revenueDisplay.totalExpenses)}</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${revenueDisplay.netProfit >= 0 ? "bg-green-50" : "bg-orange-50"}`}>
                    <div className={`text-xs font-semibold ${revenueDisplay.netProfit >= 0 ? "text-green-700" : "text-orange-700"}`}>Net Profit</div>
                    <div className={`text-xl font-bold font-heading ${revenueDisplay.netProfit >= 0 ? "text-green-800" : "text-orange-800"}`}>{formatCurrency(revenueDisplay.netProfit)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Sales − Expenses</div>
                  </div>
                  <div className="bg-accent/10 rounded-xl p-3 text-center border-2 border-accent/20">
                    <div className="text-xs text-accent font-semibold">Partner's Share ({revenueDisplay.profitRatio}%)</div>
                    <div className="text-xl font-bold font-heading text-accent">{formatCurrency(revenueDisplay.partnerShare)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Net profit × {revenueDisplay.profitRatio}%</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                  <strong>Formula:</strong> Partner Share = (Sales − Expenses) × {revenueDisplay.profitRatio}% = {formatCurrency(revenueDisplay.netProfit)} × {revenueDisplay.profitRatio / 100} = <strong className="text-accent">{formatCurrency(revenueDisplay.partnerShare)}</strong>
                </div>
                <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl px-3 py-2 flex items-start gap-1.5">
                  <span>ℹ️</span>
                  <span>Only <strong>Delivered &amp; Completed</strong> orders count. Revenue is attributed on the <strong>completion date</strong> — an order placed in Aug but completed in Sep counts in Sep.</span>
                </div>
              </>
            )}

            <Button variant="ghost" onClick={() => setModal(null)} className="w-full">Close</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
