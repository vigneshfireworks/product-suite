"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Search, Users, ShoppingCart, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Order { id: string; userId: string; totalAmount: number; status: string; createdAt: string; }
interface UserRow { id: string; name: string; email: string; phone: string; orderCount: number; totalSpent: number; lastOrder: string; }

export default function BusinessUsers() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [rows, setRows]       = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`/api/orders?businessId=${businessId}`, { headers })
      .then(r => r.json())
      .then(async (orders: Order[]) => {
        if (!Array.isArray(orders) || orders.length === 0) { setLoading(false); return; }

        // Group by userId
        const map: Record<string, { orders: Order[] }> = {};
        for (const o of orders) {
          if (!o.userId) continue;
          if (!map[o.userId]) map[o.userId] = { orders: [] };
          map[o.userId].orders.push(o);
        }

        // Fetch user details for each unique userId
        const userIds = Object.keys(map);
        const userDetails = await Promise.all(
          userIds.map(uid =>
            fetch(`/api/users/${uid}`, { headers })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        const result: UserRow[] = userIds.map((uid, i) => {
          const user = userDetails[i];
          const ords = map[uid].orders;
          const totalSpent = ords.reduce((s, o) => s + (o.totalAmount || 0), 0);
          const lastOrder  = ords.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt || "";
          return {
            id: uid,
            name: user?.name || `User (${uid.slice(0, 6)})`,
            email: user?.email || "—",
            phone: user?.phone || "—",
            orderCount: ords.length,
            totalSpent,
            lastOrder,
          };
        });

        setRows(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId, token]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.includes(q));
  }, [rows, search]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<UserRow>(filtered, "totalSpent", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.totalSpent, 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Unique Customers", value: rows.length,             icon: <Users size={18} />,       bg: "#eff6ff", color: "#2563eb" },
          { label: "Total Orders",     value: totalOrders,             icon: <ShoppingCart size={18} />, bg: "#f0fdf4", color: "#16a34a" },
          { label: "Total Revenue",    value: formatCurrency(totalRevenue), icon: <DollarSign size={18} />,  bg: "#fdf4ff", color: "#9333ea" },
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

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[200px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Customer"     colKey="name"       current={sortKey} dir={sortDir} onToggle={toggle} className="px-5" />
                <SortTh label="Phone"        colKey="phone"      current={sortKey} dir={sortDir} onToggle={toggle} className="px-5 hidden sm:table-cell" />
                <SortTh label="Orders"       colKey="orderCount" current={sortKey} dir={sortDir} onToggle={toggle} className="px-5" align="right" />
                <SortTh label="Total Spent"  colKey="totalSpent" current={sortKey} dir={sortDir} onToggle={toggle} className="px-5" align="right" />
                <SortTh label="Last Order"   colKey="lastOrder"  current={sortKey} dir={sortDir} onToggle={toggle} className="px-5 hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No customers yet</td></tr>
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
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-blue-600">{u.orderCount}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-green-600">{formatCurrency(u.totalSpent)}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 hidden lg:table-cell">
                    {u.lastOrder ? formatDateTime(u.lastOrder) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
