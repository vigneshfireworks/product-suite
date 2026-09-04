"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { StatCard } from "@/components/ui/StatCard";
import {
  ShoppingCart, TrendingUp, DollarSign, Briefcase,
  CheckCircle, XCircle, Truck, Clock, Banknote, CreditCard, CalendarDays,
  UserCheck, UserX, Ghost,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Business } from "@/types";

interface DashStats {
  totalBusinesses: number;
  totalOrders: number;
  totalSales: number;
  totalExpenses: number;
  totalPending: number;
  totalDispatched: number;
  totalPaymentPartially: number;
  totalPaymentSuccess: number;
  totalDeliveredCompleted: number;
  totalPaymentFailed: number;
  totalCancelled: number;
  totalCash: number;
  totalOnline: number;
  totalLoans: number;
  totalLoanAmount: number;
  totalProfit: number;
  // user order analytics
  registeredWithOrders: number;
  registeredNoOrders: number;
  anonymousUsers: number;
  totalRegistered: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().split("T")[0]; // yyyy-mm-dd

function getRange(preset: "this_month" | "last_month" | "this_year") {
  const now = new Date();
  if (preset === "this_month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  if (preset === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(first), to: fmt(last) };
  }
  // this_year
  return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats,      setStats]      = useState<DashStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Filters
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [bizFilter,  setBizFilter]  = useState("all"); // "all" or business id
  const [active,     setActive]     = useState<string>(""); // preset button label

  // Fetch businesses for selector
  useEffect(() => {
    fetch("/api/businesses")
      .then(r => r.json())
      .then((d: Business[]) => setBusinesses(Array.isArray(d) ? d.filter(b => b.isActive) : []))
      .catch(() => {});
  }, []);

  // Fetch stats whenever filters change
  const fetchStats = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (from)               params.set("from",       from);
    if (to)                 params.set("to",         to);
    if (bizFilter !== "all") params.set("businessId", bizFilter);
    fetch(`/api/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, from, to, bizFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Preset handlers ───────────────────────────────────────────────
  const applyPreset = (preset: "this_month" | "last_month" | "this_year") => {
    const r = getRange(preset);
    setFrom(r.from); setTo(r.to);
    setActive(preset);
  };
  const clearFilters = () => {
    setFrom(""); setTo(""); setActive("");
  };

  const s = stats || {} as DashStats;

  // ── Filter bar ────────────────────────────────────────────────────
  const FilterBar = () => (
    <div
      className="bg-white rounded-2xl mb-6 px-5 py-4 flex flex-wrap gap-4 items-center"
      style={{ border: "1.5px solid #e2f0ec", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
    >
      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">From</span>
        <input
          type="date"
          value={from}
          onChange={e => { setFrom(e.target.value); setActive(""); }}
          className="px-3 py-1.5 rounded-xl text-sm border focus:outline-none focus:border-accent"
          style={{ borderColor: "#d1fae5", color: "#1a7a5e" }}
        />
        <span className="text-xs font-semibold text-gray-500">To</span>
        <input
          type="date"
          value={to}
          onChange={e => { setTo(e.target.value); setActive(""); }}
          className="px-3 py-1.5 rounded-xl text-sm border focus:outline-none focus:border-accent"
          style={{ borderColor: "#d1fae5", color: "#1a7a5e" }}
        />
      </div>

      {/* Preset pills */}
      <div className="flex items-center gap-2">
        {([ ["this_month","This Month"], ["last_month","Last Month"], ["this_year","This Year"] ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={active === key
              ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
              : { background: "#f0fdf4", color: "#1a7a5e", borderColor: "#d1fae5" }
            }
          >
            {label}
          </button>
        ))}
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
          style={{ background: "#fafafa", color: "#888", borderColor: "#e5e7eb" }}
        >
          Clear
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 hidden sm:block" />

      {/* Business filter dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Business:</span>
        <select
          value={bizFilter}
          onChange={e => setBizFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer"
          style={{ borderColor: bizFilter !== "all" ? "#FFC43F" : "#fde68a", color: "#c47f00", background: bizFilter !== "all" ? "#fffbf0" : "#fffbf0", minWidth: "140px" }}
        >
          <option value="all">All Businesses</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Active filter summary */}
      {(from || to) && (
        <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
          <CalendarDays size={12} />
          {from && to ? `${from} → ${to}` : from ? `From ${from}` : `Until ${to}`}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all businesses and operations</p>
      </div>

      <FilterBar />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {bizFilter === "all" ? (
            <>
              {/* Row 1: overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Total Businesses" value={s.totalBusinesses || 0}                   icon={<Briefcase size={20} />}    color="yellow" />
                <StatCard title="Total Orders"     value={s.totalOrders || 0}                       icon={<ShoppingCart size={20} />} color="blue" />
                <StatCard title="Total Sales"      value={formatCurrency(s.totalSales || 0)}        icon={<TrendingUp size={20} />}   color="green" />
                <StatCard title="Net Profit"       value={formatCurrency(s.totalProfit || 0)}       icon={<DollarSign size={20} />}   color={(s.totalProfit || 0) >= 0 ? "green" : "red"} />
              </div>
              {/* Row 2: financials + user analytics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Total Expenses"   value={formatCurrency(s.totalExpenses || 0)}     icon={<DollarSign size={20} />}   color="red" />
                <StatCard title="Users w/ Orders"  value={s.registeredWithOrders || 0}              icon={<UserCheck size={20} />}    color="green" />
                <StatCard title="Users No Orders"  value={s.registeredNoOrders   || 0}              icon={<UserX size={20} />}        color="purple" />
                <StatCard title="Anonymous Users"  value={s.anonymousUsers       || 0}              icon={<Ghost size={20} />}        color="orange" />
              </div>
              {/* Row 3: order statuses */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Pending"            value={s.totalPending || 0}               icon={<Clock size={20} />}        color="orange" />
                <StatCard title="Dispatched"         value={s.totalDispatched || 0}            icon={<Truck size={20} />}        color="blue" />
                <StatCard title="Partially Paid"     value={s.totalPaymentPartially || 0}      icon={<DollarSign size={20} />}   color="orange" />
                <StatCard title="Payment Success"    value={s.totalPaymentSuccess || 0}        icon={<CheckCircle size={20} />}  color="green" />
              </div>
              {/* Row 4: completion + failures */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Delivered & Done"   value={s.totalDeliveredCompleted || 0}    icon={<CheckCircle size={20} />}  color="green" />
                <StatCard title="Payment Failed"     value={s.totalPaymentFailed  || 0}        icon={<XCircle size={20} />}      color="red" />
                <StatCard title="Cancelled"          value={s.totalCancelled || 0}             icon={<XCircle size={20} />}      color="red" />
                <StatCard title="Cash Orders"        value={s.totalCash || 0}                  icon={<Banknote size={20} />}     color="yellow" />
              </div>
            </>
          ) : (
            <>
              {/* Row 1: overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Total Orders"     value={s.totalOrders || 0}                       icon={<ShoppingCart size={20} />} color="blue" />
                <StatCard title="Total Sales"      value={formatCurrency(s.totalSales || 0)}        icon={<TrendingUp size={20} />}   color="green" />
                <StatCard title="Net Profit"       value={formatCurrency(s.totalProfit || 0)}       icon={<DollarSign size={20} />}   color={(s.totalProfit || 0) >= 0 ? "green" : "red"} />
                <StatCard title="Total Expenses"   value={formatCurrency(s.totalExpenses || 0)}     icon={<DollarSign size={20} />}   color="red" />
              </div>
              {/* Row 2: user analytics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Users w/ Orders"  value={s.registeredWithOrders || 0}              icon={<UserCheck size={20} />}    color="green" />
                <StatCard title="Users No Orders"  value={s.registeredNoOrders   || 0}              icon={<UserX size={20} />}        color="purple" />
                <StatCard title="Anonymous Users"  value={s.anonymousUsers       || 0}              icon={<Ghost size={20} />}        color="orange" />
                <StatCard title="Pending"          value={s.totalPending || 0}                      icon={<Clock size={20} />}        color="orange" />
              </div>
              {/* Row 3: order status */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Dispatched"       value={s.totalDispatched || 0}           icon={<Truck size={20} />}        color="blue" />
                <StatCard title="Partially Paid"   value={s.totalPaymentPartially || 0}     icon={<DollarSign size={20} />}   color="orange" />
                <StatCard title="Payment Success"  value={s.totalPaymentSuccess || 0}       icon={<CheckCircle size={20} />}  color="green" />
                <StatCard title="Delivered & Done" value={s.totalDeliveredCompleted || 0}   icon={<CheckCircle size={20} />}  color="green" />
              </div>
              {/* Row 4: payment */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="Payment Failed"   value={s.totalPaymentFailed  || 0}       icon={<XCircle size={20} />}      color="red" />
                <StatCard title="Cancelled"        value={s.totalCancelled || 0}            icon={<XCircle size={20} />}      color="red" />
                <StatCard title="Cash Orders"      value={s.totalCash ?? 0}                 icon={<Banknote size={20} />}     color="yellow" />
                <StatCard title="Online Orders"    value={s.totalOnline ?? 0}               icon={<CreditCard size={20} />}   color="purple" />
              </div>
            </>
          )}

          {/* Loan summary */}
          {(s.totalLoans || 0) > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <StatCard title="Total Loan Requests" value={s.totalLoans || 0}                     icon={<DollarSign size={20} />} color="blue" />
              <StatCard title="Total Loan Amount"   value={formatCurrency(s.totalLoanAmount || 0)} icon={<Banknote size={20} />}  color="purple" />
            </div>
          )}

          {/* Quick links */}
          <div className="mt-2 bg-white rounded-card shadow-card p-5">
            <h3 className="font-heading font-bold text-brand-dark mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { href: "/admin/businesses",     label: "Manage Businesses", icon: "🏢" },
                { href: "/admin/businesses/new", label: "Add Business",      icon: "➕" },
                { href: "/admin/partners",       label: "Manage Partners",   icon: "🤝" },
                { href: "/admin/users",          label: "View Users",        icon: "👥" },
              ].map(a => (
                <a key={a.href} href={a.href} className="flex flex-col items-center gap-2 p-4 border-2 border-gray-100 rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-center">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-accent">{a.label}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
