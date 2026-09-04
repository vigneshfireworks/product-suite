"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Users, Wallet, TrendingUp, CalendarDays } from "lucide-react";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface PartnerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businesses: Array<{ businessId: string; investedAmount: number; profitRatio: number }>;
  createdAt: string;
}
interface BusinessData { id: string; name: string; }
// Per-business revenue stats returned by the dashboard API
interface BizRevStats {
  totalSales: number;
  totalExpenses: number;
  totalDeliveredCompleted: number;
  totalProfit: number;
}

// Use LOCAL date parts to avoid UTC timezone shift (e.g. IST midnight ≠ UTC midnight)
const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
function getPresetRange(preset: string) {
  const now = new Date();
  if (preset === "this_month") return { from: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmtDate(now) };
  if (preset === "last_month") return { from: fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmtDate(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (preset === "this_year")  return { from: fmtDate(new Date(now.getFullYear(), 0, 1)), to: fmtDate(now) };
  return { from: "", to: "" };
}

export default function AdminPartners() {
  const { token } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [partners, setPartners]     = useState<PartnerData[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [bizFilter, setBizFilter]   = useState("all");

  // Modal state
  const [modal, setModal]           = useState(false);
  const [editPartner, setEditPartner] = useState<PartnerData | null>(null);
  const [form, setForm]             = useState({ name: "", email: "", phone: "", password: "" });
  const [bizMappings, setBizMappings] = useState<Array<{ businessId: string; investedAmount: string }>>([]);
  const [saving, setSaving]         = useState(false);

  // Revenue modal state
  const [revPartner, setRevPartner]       = useState<PartnerData | null>(null);
  const [revBizStats, setRevBizStats]     = useState<Record<string, BizRevStats>>({});  // businessId -> stats from dashboard API
  const [revFrom, setRevFrom]             = useState("");
  const [revTo, setRevTo]                 = useState("");
  const [revPreset, setRevPreset]         = useState("this_month");
  const [revLoading, setRevLoading]       = useState(false);
  const [revModal, setRevModal]           = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [pRes, bRes] = await Promise.all([
      fetch("/api/partners", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/businesses"),
    ]);
    setPartners(await pRes.json().catch(() => []));
    setBusinesses(await bRes.json().catch(() => []));
    setLoading(false);
  };

  const getBizName = (id: string) => businesses.find(b => b.id === id)?.name || id;

  // Fetch revenue stats for a partner from the server's dashboard API.
  // Accepts from/to as explicit params to avoid stale-closure issues.
  // The dashboard API filters by completedAt server-side — no client-side date math needed.
  const refreshRevData = useCallback(async (p: PartnerData, from: string, to: string) => {
    setRevLoading(true);
    const bizIds = bizFilter !== "all"
      ? p.businesses.filter(b => b.businessId === bizFilter).map(b => b.businessId)
      : p.businesses.map(b => b.businessId);

    const results = await Promise.all(bizIds.map(async bid => {
      const params = new URLSearchParams({ businessId: bid });
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      const res = await fetch(`/api/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data: BizRevStats = await res.json().catch(() => ({
        totalSales: 0, totalExpenses: 0, totalDeliveredCompleted: 0, totalProfit: 0,
      }));
      return { bid, data };
    }));

    const statsMap: Record<string, BizRevStats> = {};
    results.forEach(r => { statsMap[r.bid] = r.data; });
    setRevBizStats(statsMap);
    setRevLoading(false);
  }, [bizFilter, token]);

  const openRevenue = async (p: PartnerData) => {
    setRevPartner(p);
    const range = getPresetRange("this_month");
    setRevPreset("this_month"); setRevFrom(range.from); setRevTo(range.to);
    setRevBizStats({});
    setRevModal(true);
    await refreshRevData(p, range.from, range.to);
  };

  const applyRevPreset = async (preset: string) => {
    const r = getPresetRange(preset);
    setRevPreset(preset); setRevFrom(r.from); setRevTo(r.to);
    if (revPartner) await refreshRevData(revPartner, r.from, r.to);
  };

  // Compute display stats from server data — no client-side filtering
  const revStats = useMemo(() => {
    if (!revPartner) return null;
    const bids = bizFilter !== "all"
      ? revPartner.businesses.filter(b => b.businessId === bizFilter).map(b => b.businessId)
      : revPartner.businesses.map(b => b.businessId);

    const perBiz = bids.map(bid => {
      const mapping     = revPartner.businesses.find(b => b.businessId === bid);
      const profitRatio = mapping?.profitRatio || 0;
      const s = revBizStats[bid] || { totalSales: 0, totalExpenses: 0, totalDeliveredCompleted: 0, totalProfit: 0 };
      const netProfit    = s.totalProfit;
      const partnerShare = netProfit * (profitRatio / 100);
      return {
        bid,
        name: getBizName(bid),
        profitRatio,
        totalSales:    s.totalSales,
        totalExpenses: s.totalExpenses,
        netProfit,
        partnerShare,
        orderCount:      s.totalDeliveredCompleted,
        totalOrderCount: s.totalDeliveredCompleted,
      };
    });

    const aggregate = {
      totalSales:      perBiz.reduce((s, b) => s + b.totalSales,    0),
      totalExpenses:   perBiz.reduce((s, b) => s + b.totalExpenses,  0),
      netProfit:       perBiz.reduce((s, b) => s + b.netProfit,      0),
      partnerShare:    perBiz.reduce((s, b) => s + b.partnerShare,   0),
      orderCount:      perBiz.reduce((s, b) => s + b.orderCount,     0),
      totalOrderCount: perBiz.reduce((s, b) => s + b.totalOrderCount, 0),
    };
    return { perBiz, aggregate };
  }, [revPartner, revBizStats, bizFilter, businesses]);

  // ── Derived / filtered ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = partners;
    // Business filter
    if (bizFilter !== "all") {
      list = list.filter(p => p.businesses.some(b => b.businessId === bizFilter));
    }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    }
    return list;
  }, [partners, bizFilter, search]);

  // Summary stats (based on current filter)
  const stats = useMemo(() => {
    const totalPartners = filtered.length;
    let totalInvested = 0, ratioSum = 0, ratioCount = 0;
    filtered.forEach(p => {
      p.businesses.forEach(b => {
        if (bizFilter === "all" || b.businessId === bizFilter) {
          totalInvested += b.investedAmount;
          ratioSum      += b.profitRatio;
          ratioCount++;
        }
      });
    });
    return { totalPartners, totalInvested, avgProfit: ratioCount ? Math.round(ratioSum / ratioCount) : 0 };
  }, [filtered, bizFilter]);

  // Per-row: invested + profit for current filter context
  const getRowData = (p: PartnerData) => {
    if (bizFilter !== "all") {
      const biz = p.businesses.find(b => b.businessId === bizFilter);
      return { invested: biz?.investedAmount ?? 0, profit: biz?.profitRatio ?? 0, bizList: biz ? [biz] : [] };
    }
    const totalInvested = p.businesses.reduce((s, b) => s + b.investedAmount, 0);
    const avgProfit = p.businesses.length
      ? Math.round(p.businesses.reduce((s, b) => s + b.profitRatio, 0) / p.businesses.length)
      : 0;
    return { invested: totalInvested, profit: avgProfit, bizList: p.businesses };
  };

  // ── Auto-calculate profit ratio ───────────────────────────────────
  // Returns projected profit % for `amount` invested in `businessId`,
  // excluding the partner being edited (excludeId) so we don't double-count.
  const calcRatioForBiz = (businessId: string, amount: number, excludeId?: string) => {
    const others = partners.filter(p => p.id !== excludeId && p.businesses.some(b => b.businessId === businessId));
    const othersTotal = others.reduce((s, p) => s + (p.businesses.find(b => b.businessId === businessId)?.investedAmount || 0), 0);
    const total = othersTotal + amount;
    return total > 0 ? Math.round((amount / total) * 100) : 100;
  };

  // ── Modal helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditPartner(null);
    setForm({ name: "", email: "", phone: "", password: "" });
    setBizMappings([]);
    setModal(true);
  };
  const openEdit = (p: PartnerData) => {
    setEditPartner(p);
    setForm({ name: p.name, email: p.email, phone: p.phone, password: "" });
    setBizMappings(p.businesses.map(b => ({ businessId: b.businessId, investedAmount: String(b.investedAmount) })));
    setModal(true);
  };
  const addBizMapping    = () => setBizMappings([...bizMappings, { businessId: businesses[0]?.id || "", investedAmount: "" }]);
  const removeBizMapping = (i: number) => setBizMappings(bizMappings.filter((_, idx) => idx !== i));
  const updateBizMapping = (i: number, field: string, value: string) =>
    setBizMappings(bizMappings.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const handleSave = async () => {
    setSaving(true);
    // Build businesses with auto-calculated ratios
    const newBizMappings = bizMappings.map(m => ({
      businessId:    m.businessId,
      investedAmount: Number(m.investedAmount),
      profitRatio:   calcRatioForBiz(m.businessId, Number(m.investedAmount), editPartner?.id),
    }));

    // Save this partner
    const url    = editPartner ? `/api/partners/${editPartner.id}` : "/api/partners";
    const method = editPartner ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, businesses: newBizMappings }) });

    // Recalculate all OTHER partners in affected businesses
    const affectedBizIds = new Set(bizMappings.map(m => m.businessId));
    // Reload partners first to get fresh state
    const freshRes = await fetch("/api/partners", { headers: { Authorization: `Bearer ${token}` } });
    const freshPartners: PartnerData[] = await freshRes.json().catch(() => []);
    const savedId = editPartner?.id || "new"; // for new partners we recalc after reload

    for (const bizId of affectedBizIds) {
      // Get total invested in this biz from fresh data (excluding nobody — new state)
      const bizPartners = freshPartners.filter(p => p.businesses.some(b => b.businessId === bizId));
      const totalInBiz  = bizPartners.reduce((s, p) => s + (p.businesses.find(b => b.businessId === bizId)?.investedAmount || 0), 0);
      // Update every partner in this biz with recalculated ratio
      for (const p of bizPartners) {
        const m = p.businesses.find(b => b.businessId === bizId);
        if (!m) continue;
        const newRatio = totalInBiz > 0 ? Math.round((m.investedAmount / totalInBiz) * 100) : 0;
        if (newRatio !== m.profitRatio) {
          const updatedBizs = p.businesses.map(b => b.businessId === bizId ? { ...b, profitRatio: newRatio } : b);
          await fetch(`/api/partners/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businesses: updatedBizs }) });
        }
      }
    }

    setModal(false);
    setSaving(false);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm("Delete partner?", "This partner will be permanently removed from all businesses.");
    if (!ok) return;
    await fetch(`/api/partners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadAll();
  };

  // Sort: operate on filtered list, sort by flat fields
  const sortable = useMemo(() => filtered.map(p => {
    const rd = getRowData(p);
    return { ...p, _invested: rd.invested, _profit: rd.profit };
  }), [filtered, bizFilter]);

  const { sorted: sortedPartners, sortKey, sortDir, toggle } = useTableSort<PartnerData & { _invested: number; _profit: number }>(
    sortable, "createdAt", "desc"
  );
  const { page, setPage, totalPages, paged: pagedPartners, total, start, pageSize } = usePagination(sortedPartners);

  const profitColor = (pct: number) =>
    pct >= 30 ? { bg: "#dcfce7", color: "#16a34a" } :
    pct >= 15 ? { bg: "#fef9c3", color: "#ca8a04" } :
               { bg: "#fee2e2", color: "#dc2626" };

  return (
    <div>
      <ConfirmDialog />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">Partners</h1>
          <p className="text-gray-500 text-sm mt-1">{partners.length} total partners</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus size={16} /> Add Partner</Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Partners", value: stats.totalPartners, icon: <Users size={18} />, bg: "#eff6ff", color: "#2563eb" },
          { label: "Total Invested", value: formatCurrency(stats.totalInvested), icon: <Wallet size={18} />, bg: "#f0fdf4", color: "#16a34a" },
          { label: "Avg Profit Share", value: `${stats.avgProfit}%`, icon: <TrendingUp size={18} />, bg: "#fffbf0", color: "#c47f00" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
            <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-heading font-bold text-brand-dark text-lg leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="flex flex-1 min-w-[200px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent transition-colors bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
          />
        </div>

        {/* Business dropdown */}
        <select
          value={bizFilter}
          onChange={e => setBizFilter(e.target.value)}
          className="px-4 py-2.5 text-sm font-semibold border-2 rounded-xl focus:outline-none focus:border-accent transition-colors bg-white cursor-pointer"
          style={{ borderColor: bizFilter !== "all" ? "#FFC43F" : "#e5e7eb", color: bizFilter !== "all" ? "#c47f00" : "#374151" }}
        >
          <option value="all">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Partner"  colKey="name"      current={sortKey} dir={sortDir} onToggle={toggle} />
                <SortTh label="Phone"    colKey="phone"     current={sortKey} dir={sortDir} onToggle={toggle} className="hidden sm:table-cell" />
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Businesses</th>
                <SortTh label="Invested" colKey="_invested" current={sortKey} dir={sortDir} onToggle={toggle} align="right" />
                <SortTh label="Profit %" colKey="_profit"   current={sortKey} dir={sortDir} onToggle={toggle} align="center" />
                <SortTh label="Joined"   colKey="createdAt" current={sortKey} dir={sortDir} onToggle={toggle} className="hidden lg:table-cell" />
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sortedPartners.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No partners found</td></tr>
              ) : pagedPartners.map(p => {
                const { invested, profit, bizList } = { invested: p._invested, profit: p._profit, bizList: bizFilter !== "all" ? p.businesses.filter(b => b.businessId === bizFilter) : p.businesses };
                const pc = profitColor(profit);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Partner */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-brand-dark">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </td>
                    {/* Phone */}
                    <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{p.phone}</td>
                    {/* Businesses */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {bizList.slice(0, 3).map(b => (
                          <span key={b.businessId} className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(255,196,63,0.15)", color: "#c47f00" }}>
                            {getBizName(b.businessId)}
                          </span>
                        ))}
                        {bizList.length > 3 && <span className="text-xs text-gray-400">+{bizList.length - 3} more</span>}
                      </div>
                    </td>
                    {/* Invested */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-brand-dark">{formatCurrency(invested)}</span>
                      {bizFilter === "all" && p.businesses.length > 1 && (
                        <div className="text-xs text-gray-400">{p.businesses.length} businesses</div>
                      )}
                    </td>
                    {/* Profit % */}
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: pc.bg, color: pc.color }}
                        >
                          {profit}%
                        </span>
                      </div>
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">{formatDateTime(p.createdAt)}</td>
                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openRevenue(p)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Revenue view"><TrendingUp size={15} /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={15} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totals */}
            {!loading && sortedPartners.length > 1 && (
              <tfoot className="border-t-2 border-gray-100" style={{ background: "#fafafa" }}>
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500">
                    {filtered.length} partners{bizFilter !== "all" ? ` in ${getBizName(bizFilter)}` : ""}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-brand-dark">{formatCurrency(stats.totalInvested)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-center">
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={profitColor(stats.avgProfit)}>
                        {stats.avgProfit}% avg
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />

      {/* Revenue Modal */}
      <Modal open={revModal} onClose={() => setRevModal(false)} title={`${revPartner?.name} — Revenue View`} size="lg">
        {revPartner && (
          <div className="space-y-4">
            {/* Date filter */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500">Filter by completion date</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (revPartner) refreshRevData(revPartner, revFrom, revTo); }}
                  disabled={revLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border transition-all"
                  style={{ borderColor: "#d1fae5", color: "#1a7a5e", background: "#f0fdf4" }}
                  title="Reload from server"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
              <div className="flex flex-wrap gap-2">
                {([["this_month","This Month"],["last_month","Last Month"],["this_year","This Year"],["","All Time"]] as const).map(([k, label]) => (
                  <button key={label} onClick={() => applyRevPreset(k)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={revPreset === k && (k !== "" || (!revFrom && !revTo))
                      ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
                      : { background: "#fff", color: "#1a7a5e", borderColor: "#d1fae5" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">From</span>
                <input type="date" value={revFrom}
                  onChange={e => { const v = e.target.value; setRevFrom(v); setRevPreset("custom"); if (revPartner) refreshRevData(revPartner, v, revTo); }}
                  className="px-2 py-1 border rounded-lg text-xs focus:outline-none" />
                <span className="text-xs text-gray-500">To</span>
                <input type="date" value={revTo}
                  onChange={e => { const v = e.target.value; setRevTo(v); setRevPreset("custom"); if (revPartner) refreshRevData(revPartner, revFrom, v); }}
                  className="px-2 py-1 border rounded-lg text-xs focus:outline-none" />
              </div>
            </div>

            {revLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : revStats && (
              <>
                {/* Aggregate (only when multiple businesses) */}
                {revStats.perBiz.length > 1 && (
                  <div className="border-2 border-accent/20 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Total Across All Businesses</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-blue-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-blue-600 font-semibold">Sales</div>
                        <div className="font-bold text-blue-800 text-sm">{formatCurrency(revStats.aggregate.totalSales)}</div>
                        <div className="text-[10px] text-blue-400">{revStats.aggregate.orderCount} completed</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-red-600 font-semibold">Expenses</div>
                        <div className="font-bold text-red-800 text-sm">{formatCurrency(revStats.aggregate.totalExpenses)}</div>
                      </div>
                      <div className={`rounded-xl p-2 text-center ${revStats.aggregate.netProfit >= 0 ? "bg-green-50" : "bg-orange-50"}`}>
                        <div className={`text-xs font-semibold ${revStats.aggregate.netProfit >= 0 ? "text-green-600" : "text-orange-600"}`}>Net Profit</div>
                        <div className={`font-bold text-sm ${revStats.aggregate.netProfit >= 0 ? "text-green-800" : "text-orange-800"}`}>{formatCurrency(revStats.aggregate.netProfit)}</div>
                      </div>
                      <div className="bg-accent/10 rounded-xl p-2 text-center border border-accent/20">
                        <div className="text-xs text-accent font-semibold">Total Share</div>
                        <div className="font-bold text-accent text-sm">{formatCurrency(revStats.aggregate.partnerShare)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-business breakdown */}
                <div className="space-y-3">
                  {revStats.perBiz.map(b => (
                    <div key={b.bid} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-brand-dark">{b.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#fef9c3", color: "#c47f00" }}>{b.profitRatio}% share</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-blue-600 font-semibold">Sales</div>
                          <div className="font-bold text-blue-800 text-sm">{formatCurrency(b.totalSales)}</div>
                          <div className="text-[10px] text-blue-400">{b.orderCount}/{b.totalOrderCount} completed</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-red-600 font-semibold">Expenses</div>
                          <div className="font-bold text-red-800 text-sm">{formatCurrency(b.totalExpenses)}</div>
                        </div>
                        <div className={`rounded-lg p-2 text-center ${b.netProfit >= 0 ? "bg-green-50" : "bg-orange-50"}`}>
                          <div className={`text-[10px] font-semibold ${b.netProfit >= 0 ? "text-green-600" : "text-orange-600"}`}>Net Profit</div>
                          <div className={`font-bold text-sm ${b.netProfit >= 0 ? "text-green-800" : "text-orange-800"}`}>{formatCurrency(b.netProfit)}</div>
                        </div>
                        <div className="bg-accent/10 rounded-lg p-2 text-center border border-accent/20">
                          <div className="text-[10px] text-accent font-semibold">Partner Share</div>
                          <div className="font-bold text-accent text-sm">{formatCurrency(b.partnerShare)}</div>
                          <div className="text-[10px] text-gray-400">× {b.profitRatio}%</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
                        Formula: ({formatCurrency(b.totalSales)} − {formatCurrency(b.totalExpenses)}) × {b.profitRatio}% = <strong className="text-accent">{formatCurrency(b.partnerShare)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info note */}
                <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl px-3 py-2 flex items-start gap-1.5">
                  <span>ℹ️</span>
                  <span>Only <strong>Delivered &amp; Completed</strong> orders count toward revenue &amp; partner share. Revenue is attributed on the <strong>completion date</strong>, not the order date — an order placed in Feb but completed in Mar counts in Mar.</span>
                </div>

              </>
            )}

            <Button variant="ghost" onClick={() => setRevModal(false)} className="w-full">Close</Button>
          </div>
        )}
      </Modal>

      {/* Partner Form Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editPartner ? "Edit Partner" : "Add Partner"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Partner name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <Input label="Phone" placeholder="10-digit mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input label="Email" type="email" placeholder="partner@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            {!editPartner && <Input label="Password" type="password" placeholder="Min 6 chars" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />}
          </div>

          {/* Business mappings */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-brand-dark">Business Mappings</label>
              <button onClick={addBizMapping} className="text-accent text-sm font-semibold hover:underline">+ Add</button>
            </div>
            <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 mb-2">
              Profit % is auto-calculated from investment ratio — no manual input needed.
            </p>
            <div className="space-y-3">
              {bizMappings.map((m, i) => {
                const amt      = Number(m.investedAmount) || 0;
                const ratio    = amt > 0 ? calcRatioForBiz(m.businessId, amt, editPartner?.id) : 0;
                return (
                <div key={i} className="bg-gray-50 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Business</label>
                    <select value={m.businessId} onChange={e => updateBizMapping(i, "businessId", e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent bg-white">
                      {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Invested Amount (₹)</label>
                    <input type="number" value={m.investedAmount} onChange={e => updateBizMapping(i, "investedAmount", e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent" placeholder="0" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Profit Share</label>
                      <div className="w-full border border-green-200 bg-green-50 rounded-lg px-2 py-1.5 text-xs font-bold text-green-700 flex items-center gap-1">
                        {amt > 0 ? `${ratio}%` : "—"} <span className="text-[10px] font-normal text-gray-400 ml-1">auto</span>
                      </div>
                    </div>
                    <button onClick={() => removeBizMapping(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 mb-0.5">✕</button>
                  </div>
                </div>
                );
              })}
              {bizMappings.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No business mappings yet. Click + Add above.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{editPartner ? "Update Partner" : "Add Partner"}</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
