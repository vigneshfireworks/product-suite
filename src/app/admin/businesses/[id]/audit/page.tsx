"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { usePagination, Pagination } from "@/components/ui/Pagination";

interface AuditRecord {
  id: string;
  entity: string;
  entityId: string;
  action: "create" | "update" | "delete";
  changes: Record<string, unknown>;
  performedBy: string;
  performedAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  product:  { label: "Product",   color: "#2563eb", bg: "#eff6ff" },
  order:    { label: "Order",     color: "#7c3aed", bg: "#f5f3ff" },
  expense:  { label: "Expense",   color: "#dc2626", bg: "#fef2f2" },
  partner:  { label: "Partner",   color: "#16a34a", bg: "#f0fdf4" },
};

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  create: { color: "#16a34a", bg: "#dcfce7" },
  update: { color: "#d97706", bg: "#fef3c7" },
  delete: { color: "#dc2626", bg: "#fee2e2" },
};

type BizEntry = { businessId: string; investedAmount: number; profitRatio: number };

// Format a raw value for display
function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  return String(v).slice(0, 40);
}

function renderChanges(rec: AuditRecord, businessId: string): React.ReactNode {
  const c = rec.changes as Record<string, unknown>;
  if (!c) return <span className="text-gray-400">No details</span>;

  // ── CREATE ──────────────────────────────────────────────────────────
  if (rec.action === "create") {
    const name = c.name || c.title || c.id;
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">Created</span>
        {name && <span className="text-xs text-gray-700 font-medium">{String(name)}</span>}
        {c.amount   && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">₹{Number(c.amount).toLocaleString("en-IN")}</span>}
        {c.status   && <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg capitalize">{String(c.status)}</span>}
      </div>
    );
  }

  // ── DELETE ──────────────────────────────────────────────────────────
  if (rec.action === "delete") {
    const name = c.name || c.title || c.id;
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg">Deleted</span>
        {name && <span className="text-xs text-gray-700 font-medium">{String(name)}</span>}
      </div>
    );
  }

  // ── PARTNER UPDATE (before/after are arrays of business mappings) ───
  if (Array.isArray(c.before) && Array.isArray(c.after)) {
    const before = c.before as BizEntry[];
    const after  = c.after  as BizEntry[];
    const prevEntry = before.find(b => b.businessId === businessId);
    const nextEntry = after.find( b => b.businessId === businessId);
    if (!nextEntry) return <span className="text-gray-400 text-xs">Investment updated (other business)</span>;
    const amtChange = prevEntry ? nextEntry.investedAmount - prevEntry.investedAmount : null;
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {prevEntry && (
            <>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-semibold">Prev: ₹{prevEntry.investedAmount.toLocaleString("en-IN")}</span>
              <span className="text-gray-400 text-xs font-bold">→</span>
            </>
          )}
          {amtChange !== null && amtChange !== 0 && (
            <>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${amtChange > 0 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                {amtChange > 0 ? "+" : ""}₹{Math.abs(amtChange).toLocaleString("en-IN")}
              </span>
              <span className="text-gray-400 text-xs font-bold">→</span>
            </>
          )}
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">
            Total: ₹{nextEntry.investedAmount.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex gap-1.5">
          {prevEntry && prevEntry.profitRatio !== nextEntry.profitRatio && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{prevEntry.profitRatio}% share</span>
          )}
          {prevEntry && prevEntry.profitRatio !== nextEntry.profitRatio && <span className="text-gray-400 text-xs font-bold">→</span>}
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-lg font-semibold">{nextEntry.profitRatio}% share</span>
        </div>
      </div>
    );
  }

  // ── BEFORE/AFTER DIFF plain object (expense updates) ────────────────
  if (c.before && c.after && !Array.isArray(c.before) && !Array.isArray(c.after)) {
    const oldObj = c.before as Record<string, unknown>;
    const newObj = c.after  as Record<string, unknown>;
    const skip   = new Set(["updatedAt", "updatedBy", "id", "businessId", "createdAt", "createdBy"]);
    const diffs  = Object.keys(newObj).filter(k => !skip.has(k) && JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
    if (diffs.length === 0) return <span className="text-gray-400 text-xs">No field changes</span>;
    return (
      <div className="space-y-1">
        {diffs.map(k => (
          <div key={k} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-gray-500 capitalize min-w-[60px]">{k}:</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{fmtVal(oldObj[k])}</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">{fmtVal(newObj[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── OLD/NEW DIFF (products, orders, expenses) ────────────────────────
  if (c.old && c.new) {
    const oldObj = c.old as Record<string, unknown>;
    const newObj = c.new as Record<string, unknown>;
    const skip   = new Set(["updatedAt", "updatedBy", "id", "businessId"]);
    const diffs  = Object.keys(newObj).filter(k => !skip.has(k) && JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
    if (diffs.length === 0) return <span className="text-gray-400 text-xs">No field changes</span>;
    return (
      <div className="space-y-1">
        {diffs.map(k => (
          <div key={k} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-gray-500 capitalize min-w-[60px]">{k}:</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{fmtVal(oldObj[k])}</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">{fmtVal(newObj[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── FALLBACK ─────────────────────────────────────────────────────────
  return <span className="text-xs text-gray-500">{JSON.stringify(c).slice(0, 120)}</span>;
}

// Text-only version for search matching
function summarizeChanges(rec: AuditRecord): string {
  const c = rec.changes as Record<string, unknown>;
  if (!c) return "";
  if (Array.isArray(c.before) && Array.isArray(c.after)) return "partner investment update";
  if (c.before && c.after) return JSON.stringify(c.before).slice(0, 40) + " → " + JSON.stringify(c.after).slice(0, 40);
  if (c.old && c.new) return JSON.stringify(c.old).slice(0,40) + " " + JSON.stringify(c.new).slice(0,40);
  return JSON.stringify(c).slice(0, 80);
}

export default function BusinessAudit() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [logs, setLogs]   = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`/api/audit?businessId=${businessId}`, { headers })
      .then(r => r.json())
      .then(async (d: AuditRecord[]) => {
        const logsArr = Array.isArray(d) ? d : [];
        setLogs(logsArr);
        // Resolve unique performedBy IDs to names
        const uniqueIds = Array.from(new Set(logsArr.map(l => l.performedBy).filter(Boolean)));
        const resolved: Record<string, string> = {};
        await Promise.all(uniqueIds.map(async uid => {
          try {
            const r = await fetch(`/api/users/${uid}`, { headers });
            if (r.ok) { const u = await r.json(); resolved[uid] = u.name || uid; return; }
            // Try partner
            const r2 = await fetch(`/api/partners/${uid}`, { headers });
            if (r2.ok) { const p = await r2.json(); resolved[uid] = p.name || uid; }
          } catch { /* keep raw id */ }
        }));
        setUserNames(resolved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId, token]);

  const inRange = (ts: string) => {
    if (!from && !to) return true;
    const t = new Date(ts).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to   && t > new Date(to + "T23:59:59.999Z").getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => {
    let list = logs;
    if (typeFilter !== "all") list = list.filter(l => l.entity === typeFilter);
    if (from || to) list = list.filter(l => inRange(l.performedAt));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.entity.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.performedBy.toLowerCase().includes(q) ||
        summarizeChanges(l).toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, typeFilter, from, to, search]);

  const entityTypes = Array.from(new Set(logs.map(l => l.entity)));
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(filtered);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[180px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none bg-white cursor-pointer"
          style={{ borderColor: typeFilter !== "all" ? "#FFC43F" : "#e5e7eb" }}>
          <option value="all">All Types</option>
          {entityTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t]?.label || t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-xs border-2 rounded-xl focus:outline-none" style={{ borderColor: "#d1fae5" }} />
          <span className="text-xs text-gray-400">—</span>
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-3 py-2 text-xs border-2 rounded-xl focus:outline-none" style={{ borderColor: "#d1fae5" }} />
          {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>}
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>No audit logs yet</p>
          <p className="text-xs mt-1">Changes to products, orders, expenses and partners will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(log => {
            const tl = TYPE_LABELS[log.entity]  || { label: log.entity,  color: "#64748b", bg: "#f1f5f9" };
            const al = ACTION_COLORS[log.action] || { color: "#64748b", bg: "#f1f5f9" };
            return (
              <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-card px-4 py-3 flex flex-wrap gap-3 items-start">
                {/* Type pill */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: tl.bg, color: tl.color }}>{tl.label}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize" style={{ background: al.bg, color: al.color }}>{log.action}</span>
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="leading-snug mb-1.5">
                    {renderChanges(log, businessId)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>By: <span className="font-semibold text-gray-600">{userNames[log.performedBy] || log.performedBy.slice(0, 12)}</span></span>
                    <span>·</span>
                    <span>{formatDateTime(log.performedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />
      {total > 0 && (
        <p className="text-xs text-gray-400 text-center mt-2">{total} log{total !== 1 ? "s" : ""} · Showing most recent first</p>
      )}
    </div>
  );
}
