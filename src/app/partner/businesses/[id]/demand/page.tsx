"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus, CalendarDays, ShoppingCart, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";

interface OrderItem { productId: string; productName: string; quantity: number; price: number; }
interface Order { id: string; userId: string; items: OrderItem[]; totalAmount: number; status: string; createdAt: string; }

// Active statuses — cancelled and payment_failed do NOT count toward demand
const DEMAND_ACTIVE = new Set(["pending", "dispatched", "payment_partially", "payment_success", "delivered_completed"]);
interface Product { id: string; name: string; category: string; stock: number; sellingPrice: number; }
interface UserInfo { id: string; name: string; email: string; }

interface ProductDemand {
  productId: string;
  productName: string;
  category: string;
  stock: number;
  sellingPrice: number;
  totalUnits: number;      // units ordered (excl. cancelled)
  totalOrders: number;     // distinct order count
  totalRevenue: number;    // revenue from delivered/success
  uniqueUsers: number;     // distinct user count
  demandScore: number;     // for sorting
}

const fmt = (d: Date) => d.toISOString().split("T")[0];
function getRange(preset: string) {
  const now = new Date();
  if (preset === "today")      return { from: fmt(now), to: fmt(now) };
  if (preset === "this_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  if (preset === "last_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (preset === "this_year")  return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
  return { from: "", to: "" };
}

function DemandBadge({ score, high, low }: { score: number; high: number; low: number }) {
  const mid = (high + low) / 2;
  if (score >= mid * 1.2) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
      <TrendingUp size={11} /> High
    </span>
  );
  if (score <= low * 1.5 || score === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
      <TrendingDown size={11} /> Low
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700">
      <Minus size={11} /> Medium
    </span>
  );
}

export default function ProductDemandPage() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();

  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userMap, setUserMap]   = useState<Record<string, UserInfo>>({});
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]         = useState("");
  const [demandFilter, setDemandFilter] = useState("all"); // all | high | medium | low
  const [userFilter, setUserFilter] = useState("all");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");
  const [preset, setPreset]         = useState("");

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/orders?businessId=${businessId}`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`/api/products?businessId=${businessId}`, { headers }).then(r => r.json()).catch(() => []),
      fetch("/api/users", { headers }).then(r => r.json()).catch(() => []),
    ]).then(([o, p, u]) => {
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      const map: Record<string, UserInfo> = {};
      if (Array.isArray(u)) u.forEach((usr: UserInfo) => { map[usr.id] = usr; });
      setUserMap(map);
      setLoading(false);
    });
  }, [businessId, token]);

  const applyPreset = (p: string) => {
    const r = getRange(p);
    setPreset(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const inRange = (ts: string) => {
    if (!from && !to) return true;
    const t = new Date(ts).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to   && t > new Date(to + "T23:59:59.999Z").getTime()) return false;
    return true;
  };

  // Unique buyers in date range (active orders only)
  const buyerOptions = useMemo(() => {
    const ids = new Set<string>();
    orders.filter(o => inRange(o.createdAt) && DEMAND_ACTIVE.has(o.status)).forEach(o => { if (o.userId) ids.add(o.userId); });
    return Array.from(ids).map(id => ({ id, name: userMap[id]?.name || id }));
  }, [orders, from, to, userMap]);

  // Aggregate demand per product
  const demandData = useMemo<ProductDemand[]>(() => {
    const prodMap = new Map<string, Product>(products.map(p => [p.id, p]));

    // Only count active (non-cancelled, non-failed) orders in range
    // When order is cancelled → stock is restored → demand reduces automatically
    const relevant = orders.filter(o =>
      DEMAND_ACTIVE.has(o.status) &&
      inRange(o.createdAt) &&
      (userFilter === "all" || o.userId === userFilter)
    );

    const agg = new Map<string, {
      name: string; category: string; stock: number; sellingPrice: number;
      units: number; orderIds: Set<string>; userIds: Set<string>; revenue: number;
    }>();

    for (const order of relevant) {
      for (const item of (order.items || [])) {
        const prod = prodMap.get(item.productId);
        if (!agg.has(item.productId)) {
          agg.set(item.productId, {
            name: prod?.name || item.productName,
            category: prod?.category || "—",
            stock: prod?.stock ?? 0,
            sellingPrice: prod?.sellingPrice ?? item.price,
            units: 0, orderIds: new Set(), userIds: new Set(), revenue: 0,
          });
        }
        const entry = agg.get(item.productId)!;
        entry.units     += item.quantity;
        entry.orderIds.add(order.id);
        if (order.userId) entry.userIds.add(order.userId);
        // Revenue only from "Delivered & Completed" orders
        if (order.status === "delivered_completed") {
          entry.revenue += item.price * item.quantity;
        }
      }
    }

    // Also include products with zero orders (so they appear as "no demand")
    for (const p of products) {
      if (!agg.has(p.id)) {
        agg.set(p.id, {
          name: p.name, category: p.category, stock: p.stock,
          sellingPrice: p.sellingPrice, units: 0, orderIds: new Set(), userIds: new Set(), revenue: 0,
        });
      }
    }

    return Array.from(agg.entries()).map(([productId, d]) => ({
      productId,
      productName: d.name,
      category: d.category,
      stock: d.stock,
      sellingPrice: d.sellingPrice,
      totalUnits: d.units,
      totalOrders: d.orderIds.size,
      totalRevenue: d.revenue,
      uniqueUsers: d.userIds.size,
      demandScore: d.units,
    }));
  }, [orders, products, from, to, userFilter]);

  const maxScore = Math.max(...demandData.map(d => d.demandScore), 1);
  const minScore = Math.min(...demandData.filter(d => d.demandScore > 0).map(d => d.demandScore), 0);

  const getDemandLevel = (score: number) => {
    const mid = (maxScore + minScore) / 2;
    if (score >= mid * 1.2) return "high";
    if (score <= minScore * 1.5 || score === 0) return "low";
    return "medium";
  };

  const filtered = useMemo(() => {
    let list = demandData;
    if (demandFilter !== "all") list = list.filter(d => getDemandLevel(d.demandScore) === demandFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.productName.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }
    return list;
  }, [demandData, demandFilter, search, maxScore, minScore]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<ProductDemand>(filtered, "demandScore", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const PRESETS = [
    { key: "today",      label: "Today" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_year",  label: "This Year" },
  ];

  const DEMAND_FILTERS = [
    { key: "all",    label: "All Demand" },
    { key: "high",   label: "🔥 High" },
    { key: "medium", label: "📊 Medium" },
    { key: "low",    label: "📉 Low" },
  ];

  // Summary stats
  const totalProductsOrdered = demandData.filter(d => d.totalUnits > 0).length;
  const totalUnitsSold = demandData.reduce((s, d) => s + d.totalUnits, 0);
  const totalRevenue   = demandData.reduce((s, d) => s + d.totalRevenue, 0);
  const highDemandCount = demandData.filter(d => getDemandLevel(d.demandScore) === "high").length;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl px-5 py-4 space-y-3" style={{ border: "1.5px solid #e2f0ec", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        {/* Top row: search + demand filter + user filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-1 min-w-[180px] max-w-xs border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
            <Search size={15} className="ml-3 my-auto text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
          </div>

          {/* Demand level filter */}
          <div className="flex gap-1.5">
            {DEMAND_FILTERS.map(f => (
              <button key={f.key} onClick={() => setDemandFilter(f.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={demandFilter === f.key
                  ? { background: "#FFC43F", color: "#fff", borderColor: "#FFC43F" }
                  : { background: "#f9fafb", color: "#374151", borderColor: "#e5e7eb" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* User filter */}
          {buyerOptions.length > 0 && (
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border-2 rounded-xl focus:outline-none cursor-pointer bg-white"
              style={{ borderColor: userFilter !== "all" ? "#FFC43F" : "#e5e7eb", color: userFilter !== "all" ? "#c47f00" : "#374151" }}>
              <option value="all">All Buyers</option>
              {buyerOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>

        {/* Date range row */}
        <div className="flex flex-wrap gap-2 items-center">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={preset === p.key
                ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
                : { background: "#f0fdf4", color: "#1a7a5e", borderColor: "#d1fae5" }}>
              {p.label}
            </button>
          ))}
          {(from || to) && (
            <button onClick={() => { setPreset(""); setFrom(""); setTo(""); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={{ background: "#fafafa", color: "#888", borderColor: "#e5e7eb" }}>
              Clear
            </button>
          )}
          <div className="flex items-center gap-2 ml-2">
            <CalendarDays size={13} className="text-gray-400" />
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(""); }}
              className="px-2 py-1 border rounded-lg text-xs focus:outline-none" style={{ borderColor: "#d1fae5" }} />
            <span className="text-xs text-gray-400">–</span>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset(""); }}
              className="px-2 py-1 border rounded-lg text-xs focus:outline-none" style={{ borderColor: "#d1fae5" }} />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Products Ordered", value: totalProductsOrdered,          icon: <ShoppingCart size={18} />, bg: "#eff6ff", color: "#2563eb" },
            { label: "Units Sold",       value: totalUnitsSold,                icon: <TrendingUp size={18} />,   bg: "#f0fdf4", color: "#16a34a" },
            { label: "Revenue",          value: formatCurrency(totalRevenue),  icon: <TrendingUp size={18} />,   bg: "#fefce8", color: "#ca8a04" },
            { label: "High Demand",      value: highDemandCount,               icon: <TrendingUp size={18} />,   bg: "#fdf4ff", color: "#9333ea" },
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
      )}

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Product"      colKey="productName"  current={sortKey} dir={sortDir} onToggle={toggle} />
                <SortTh label="Category"     colKey="category"     current={sortKey} dir={sortDir} onToggle={toggle} className="hidden md:table-cell" />
                <SortTh label="Units Sold"   colKey="totalUnits"   current={sortKey} dir={sortDir} onToggle={toggle} align="right" />
                <SortTh label="Orders"       colKey="totalOrders"  current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden sm:table-cell" />
                <SortTh label="Buyers"       colKey="uniqueUsers"  current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden md:table-cell" />
                <SortTh label="Revenue"      colKey="totalRevenue" current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden lg:table-cell" />
                <SortTh label="Stock Left"   colKey="stock"        current={sortKey} dir={sortDir} onToggle={toggle} align="right" className="hidden sm:table-cell" />
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 text-center">Demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <p>No demand data yet</p>
                  <p className="text-xs mt-1">Orders will appear here once placed</p>
                </td></tr>
              ) : paged.map(d => {
                const stockColor = d.stock <= 10 ? "#dc2626" : d.stock <= 50 ? "#d97706" : "#16a34a";
                // Demand bar width
                const barPct = maxScore > 0 ? Math.round((d.demandScore / maxScore) * 100) : 0;
                return (
                  <tr key={d.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-brand-dark">{d.productName}</div>
                      {/* Demand bar */}
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, background: barPct >= 60 ? "#10b981" : barPct >= 30 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold capitalize">{d.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-brand-dark">{d.totalUnits}</span>
                      <span className="text-xs text-gray-400 ml-1">units</span>
                    </td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <ShoppingCart size={11} className="text-blue-400" />
                        <span className="font-semibold text-blue-600">{d.totalOrders}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <Users size={11} className="text-purple-400" />
                        <span className="font-semibold text-purple-600">{d.uniqueUsers}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right hidden lg:table-cell">
                      <span className="font-semibold text-green-600">{d.totalRevenue > 0 ? formatCurrency(d.totalRevenue) : <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell">
                      <span className="font-bold" style={{ color: stockColor }}>{d.stock}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <DemandBadge score={d.demandScore} high={maxScore} low={minScore} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
