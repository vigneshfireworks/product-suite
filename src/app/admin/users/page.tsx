"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Search, Users, UserCheck, Handshake, Ghost, ShoppingCart, Settings2, X, ToggleLeft, ToggleRight, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { Business } from "@/types";

interface UserRow {
  id: string; name: string; email: string; phone: string; role: string;
  sex?: string; age?: number; lastLogin?: string; lastIp?: string; createdAt: string;
  orderCount: number; totalSpent: number;
}
interface PartnerRow {
  id: string; name: string; email: string; phone: string;
  businesses: Array<{ businessId: string; investedAmount: number; profitRatio: number }>;
  createdAt: string;
}
interface Order { id: string; userId: string; totalAmount: number; }

/* ── Business Access Modal ──────────────────────────────────────── */
function BusinessAccessModal({
  user,
  token,
  onClose,
}: {
  user: UserRow;
  token: string;
  onClose: () => void;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null); // businessId being saved
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/businesses").then(r => r.json()),
      fetch(`/api/users/${user.id}/business-access`, { headers }).then(r => r.json()),
    ])
      .then(([biz, acc]) => {
        setBusinesses(Array.isArray(biz) ? biz.filter((b: Business) => b.isActive) : []);
        setAccess(acc || {});
      })
      .catch(() => setLoadErr(true));
  }, [user.id, token]);

  const toggle = async (businessId: string, enabled: boolean) => {
    setSaving(businessId);
    try {
      const res = await fetch(`/api/users/${user.id}/business-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId, enabled }),
      });
      if (res.ok) {
        setAccess(prev => ({ ...prev, [businessId]: enabled }));
      }
    } finally {
      setSaving(null);
    }
  };

  const catLabel: Record<string, string> = {
    retail: "Retail", finance: "Finance",
    market_analysis: "Market Analytics", other: "General",
  };
  const catColor: Record<string, string> = {
    retail: "#ea580c", finance: "#7c3aed",
    market_analysis: "#059669", other: "#db2777",
  };
  const catBg: Record<string, string> = {
    retail: "#fff7ed", finance: "#f5f3ff",
    market_analysis: "#f0fdf4", other: "#fdf2f8",
  };

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Business[]> = {};
    businesses.forEach(b => {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    });
    return map;
  }, [businesses]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-shrink-0 border-b">
          <div>
            <h2 className="font-heading text-lg font-bold text-brand-dark">Business Access</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {user.name} &middot; {user.email}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex-shrink-0">
          <p className="text-xs text-amber-700">
            <Lock size={11} className="inline mr-1" />
            <strong>Finance</strong> businesses are hidden from all users by default.
            Enable them individually per user. Other businesses are visible by default.
          </p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {loadErr ? (
            <p className="text-center text-red-500 py-8 text-sm">Failed to load access data.</p>
          ) : businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🏪</div>
              <p className="text-sm">No active businesses found</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, bizList]) => (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: catBg[cat] ?? "#f3f4f6", color: catColor[cat] ?? "#374151" }}>
                    {catLabel[cat] ?? cat}
                  </span>
                  {cat === "finance" && (
                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                      <Lock size={10} /> Restricted by default
                    </span>
                  )}
                </div>

                {/* Business rows */}
                <div className="space-y-2">
                  {bizList.map(b => {
                    const isEnabled = access[b.id] !== false && access[b.id] !== undefined
                      ? true
                      : access[b.id] === false
                        ? false
                        : b.category !== "finance"; // default
                    const isSaving = saving === b.id;

                    return (
                      <div key={b.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors"
                        style={{ borderColor: isEnabled ? "#FFC43F33" : "#f3f4f6", background: isEnabled ? "#FFFDF5" : "#fafafa" }}>
                        {/* Logo / icon */}
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: catBg[b.category] ?? "#f3f4f6" }}>
                          {b.logo ? (
                            <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">
                              {cat === "finance" ? "💰" : cat === "retail" ? "🛍️" : cat === "market_analysis" ? "📊" : "📦"}
                            </span>
                          )}
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-brand-dark truncate">{b.name}</p>
                          <p className="text-xs text-gray-400 truncate">{b.description}</p>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => toggle(b.id, !isEnabled)}
                          disabled={isSaving}
                          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                          style={{ color: isEnabled ? "#16a34a" : "#9ca3af" }}>
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isEnabled ? (
                            <ToggleRight size={28} />
                          ) : (
                            <ToggleLeft size={28} />
                          )}
                          <span>{isEnabled ? "Enabled" : "Disabled"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#1a1a2e" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Users Page ───────────────────────────────────────────── */
export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [partners, setPartners]     = useState<PartnerRow[]>([]);
  const [anonymousUsers, setAnonymousUsers] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accessUser, setAccessUser] = useState<UserRow | null>(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/users", { headers }).then(r => r.json()),
      fetch("/api/partners", { headers }).then(r => r.json()),
      fetch("/api/dashboard", { headers }).then(r => r.json()).catch(() => ({})),
    ]).then(async ([rawUsers, p, dash]) => {
      const usersArr: UserRow[] = Array.isArray(rawUsers) ? rawUsers : [];
      const partnersArr: PartnerRow[] = Array.isArray(p) ? p : [];
      setAnonymousUsers((dash as { anonymousUsers?: number }).anonymousUsers ?? 0);

      // Fetch order stats for each user
      const orderStats = await Promise.all(
        usersArr.map(u =>
          fetch(`/api/orders?userId=${u.id}`, { headers })
            .then(r => r.ok ? r.json() : [])
            .catch(() => [])
        )
      );

      const withStats: UserRow[] = usersArr.map((u, i) => {
        const ords: Order[] = Array.isArray(orderStats[i]) ? orderStats[i] : [];
        return {
          ...u,
          orderCount: ords.length,
          totalSpent: ords.reduce((s, o) => s + (o.totalAmount || 0), 0),
        };
      });

      setUsers(withStats);
      setPartners(partnersArr);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  // Convert partners → UserRow shape
  const partnerRows = useMemo<UserRow[]>(() => partners.map(p => ({
    id: p.id, name: p.name, email: p.email, phone: p.phone,
    role: "partner", createdAt: p.createdAt, orderCount: 0, totalSpent: 0,
  })), [partners]);

  const baseList = useMemo<UserRow[]>(() => {
    if (roleFilter === "partner") return partnerRows;
    if (roleFilter === "all") return [...users, ...partnerRows];
    return users.filter(u => u.role === roleFilter);
  }, [users, partnerRows, roleFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return baseList;
    const q = search.toLowerCase();
    return baseList.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q)
    );
  }, [baseList, search]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<UserRow>(filtered, "createdAt", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const customerCount = users.filter(u => u.role === "customer").length;
  const roleOptions   = ["customer", "admin", "partner"];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length + partners.length} registered users & partners</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users",      value: users.length + partners.length, icon: <Users size={18} />,     bg: "#eff6ff", color: "#2563eb" },
          { label: "Customers",        value: customerCount,                  icon: <UserCheck size={18} />, bg: "#f0fdf4", color: "#16a34a" },
          { label: "Partners",         value: partners.length,                icon: <Handshake size={18} />, bg: "#fdf4ff", color: "#9333ea" },
          { label: "Anonymous Users",  value: anonymousUsers,                 icon: <Ghost size={18} />,     bg: "#fff7ed", color: "#ea580c" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
            <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-heading font-bold text-brand-dark text-xl leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[200px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent transition-colors bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 text-sm font-semibold border-2 rounded-xl focus:outline-none focus:border-accent transition-colors bg-white cursor-pointer"
          style={{ borderColor: roleFilter !== "all" ? "#FFC43F" : "#e5e7eb", color: roleFilter !== "all" ? "#c47f00" : "#374151" }}
        >
          <option value="all">All Roles</option>
          {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="User"        colKey="name"       current={sortKey} dir={sortDir} onToggle={toggle} />
                <SortTh label="Phone"       colKey="phone"      current={sortKey} dir={sortDir} onToggle={toggle} className="hidden sm:table-cell" />
                <SortTh label="Role"        colKey="role"       current={sortKey} dir={sortDir} onToggle={toggle} className="hidden md:table-cell" />
                <SortTh label="Orders"      colKey="orderCount" current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden md:table-cell" />
                <SortTh label="Total Spent" colKey="totalSpent" current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden lg:table-cell" />
                <SortTh label="Last Login"  colKey="lastLogin"  current={sortKey} dir={sortDir} onToggle={toggle} className="hidden xl:table-cell" />
                <SortTh label="Joined"      colKey="createdAt"  current={sortKey} dir={sortDir} onToggle={toggle} className="hidden lg:table-cell" />
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No users found</td></tr>
              ) : paged.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{u.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-brand-dark">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{u.phone}</td>
                  <td className="px-5 py-4 hidden md:table-cell"><StatusBadge status={u.role} /></td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    {u.role === "partner" ? (
                      <span className="text-gray-300 text-xs">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <ShoppingCart size={12} className="text-blue-400" />
                        <span className="font-semibold text-blue-600">{u.orderCount}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right hidden lg:table-cell">
                    {u.role === "partner" ? (
                      <span className="text-gray-300 text-xs">—</span>
                    ) : (
                      <span className="font-semibold text-green-600">{u.totalSpent > 0 ? formatCurrency(u.totalSpent) : <span className="text-gray-300">₹0</span>}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs hidden xl:table-cell">
                    {u.lastLogin ? formatDateTime(u.lastLogin) : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">{formatDateTime(u.createdAt)}</td>
                  {/* Business Access button — only meaningful for customers/admins, not partners */}
                  <td className="px-5 py-4 text-right">
                    {u.role !== "partner" ? (
                      <button
                        onClick={() => setAccessUser(u)}
                        title="Manage business access"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-purple-100 text-purple-600 hover:bg-purple-50 transition-colors">
                        <Settings2 size={12} />
                        <span className="hidden sm:inline">Access</span>
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />

      {/* Business Access Modal */}
      {accessUser && token && (
        <BusinessAccessModal
          user={accessUser}
          token={token}
          onClose={() => setAccessUser(null)}
        />
      )}
    </div>
  );
}
