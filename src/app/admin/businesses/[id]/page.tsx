"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock, Truck, XCircle, Banknote, CreditCard, TrendingUp, CalendarDays, UserCheck, UserX, Ghost, Ban } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";

interface Stats {
  totalOrders: number; totalSales: number; totalExpenses: number; totalProfit: number;
  totalPending: number; totalDispatched: number;
  totalPaymentPartially: number; totalPaymentSuccess: number; totalDeliveredCompleted: number;
  totalPaymentFailed: number; totalCancelled: number;
  totalCash: number; totalOnline: number;
  registeredWithOrders: number; registeredNoOrders: number;
  anonymousUsers: number; totalRegistered: number;
}

type Preset = "today" | "this_month" | "this_year" | "";

const fmt = (d: Date) => d.toISOString().split("T")[0];

function getRange(preset: Preset) {
  const now = new Date();
  if (preset === "today")      return { from: fmt(now), to: fmt(now) };
  if (preset === "this_month") return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  if (preset === "this_year")  return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
  return { from: "", to: "" };
}

export default function BusinessDashboard() {
  const { id } = useParams() as { id: string };
  const { token } = useAuth();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [preset, setPreset] = useState<Preset>("");

  const fetchStats = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ businessId: id });
    if (from) params.set("from", from);
    if (to)   params.set("to",   to);
    fetch(`/api/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, token, from, to]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const applyPreset = (p: Preset) => {
    const r = getRange(p);
    setPreset(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const clearFilter = () => { setPreset(""); setFrom(""); setTo(""); };

  const s = stats || {} as Stats;

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "today",      label: "Today" },
    { key: "this_month", label: "This Month" },
    { key: "this_year",  label: "This Year" },
  ];

  return (
    <div className="space-y-5">
      {/* Date filter bar */}
      <div
        className="bg-white rounded-2xl px-5 py-4 flex flex-wrap gap-3 items-center"
        style={{ border: "1.5px solid #e2f0ec", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {/* Preset pills */}
        <div className="flex items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={preset === p.key
                ? { background: "#10b981", color: "#fff", borderColor: "#10b981" }
                : { background: "#f0fdf4", color: "#1a7a5e", borderColor: "#d1fae5" }}
            >
              {p.label}
            </button>
          ))}
          {(from || to || preset) && (
            <button
              onClick={clearFilter}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={{ background: "#fafafa", color: "#888", borderColor: "#e5e7eb" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

        {/* Custom date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">From</span>
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPreset(""); }}
            className="px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-accent"
            style={{ borderColor: "#d1fae5", color: "#1a7a5e" }}
          />
          <span className="text-xs font-semibold text-gray-500">To</span>
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPreset(""); }}
            className="px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-accent"
            style={{ borderColor: "#d1fae5", color: "#1a7a5e" }}
          />
        </div>

        {/* Active label */}
        {(from || to) && (
          <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <CalendarDays size={12} />
            {from && to ? `${from} → ${to}` : from ? `From ${from}` : `Until ${to}`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Orders"   value={s.totalOrders || 0}                   icon={<ShoppingCart size={20} />} color="blue" />
            <StatCard title="Total Sales"    value={formatCurrency(s.totalSales || 0)}    icon={<TrendingUp size={20} />}   color="green" />
            <StatCard title="Total Expenses" value={formatCurrency(s.totalExpenses || 0)} icon={<DollarSign size={20} />}   color="red" />
            <StatCard title="Net Profit"     value={formatCurrency(s.totalProfit || 0)}   icon={<DollarSign size={20} />}   color={(s.totalProfit || 0) >= 0 ? "green" : "red"} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Pending"          value={s.totalPending || 0}              icon={<Clock size={20} />}        color="orange" />
            <StatCard title="Dispatched"       value={s.totalDispatched || 0}           icon={<Truck size={20} />}        color="blue" />
            <StatCard title="Partially Paid"   value={s.totalPaymentPartially || 0}     icon={<DollarSign size={20} />}   color="orange" />
            <StatCard title="Payment Success"  value={s.totalPaymentSuccess || 0}       icon={<CheckCircle size={20} />}  color="green" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Delivered & Done" value={s.totalDeliveredCompleted || 0}   icon={<CheckCircle size={20} />}  color="green" />
            <StatCard title="Payment Failed"   value={s.totalPaymentFailed  || 0}       icon={<XCircle size={20} />}      color="red" />
            <StatCard title="Cancelled"        value={s.totalCancelled || 0}            icon={<Ban size={20} />}          color="red" />
            <StatCard title="Cash Orders"      value={s.totalCash || 0}                 icon={<Banknote size={20} />}     color="yellow" />
          </div>

          {/* User order analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Users w/ Orders"  value={s.registeredWithOrders || 0} icon={<UserCheck size={20} />} color="green" />
            <StatCard title="Users No Orders"  value={s.registeredNoOrders   || 0} icon={<UserX size={20} />}    color="purple" />
            <StatCard title="Anonymous Users"  value={s.anonymousUsers       || 0} icon={<Ghost size={20} />}    color="orange" />
          </div>

          {/* Order breakdown bar */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h3 className="font-heading font-bold text-brand-dark mb-4 text-sm">
              Order Breakdown
              {preset && <span className="ml-2 text-xs font-normal text-gray-400 capitalize">· {preset.replace(/_/g, " ")}</span>}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { label: "Pending",       val: s.totalPending || 0,              color: "#f97316" },
                { label: "Dispatched",    val: s.totalDispatched || 0,           color: "#3b82f6" },
                { label: "Part. Paid",    val: s.totalPaymentPartially || 0,     color: "#ea580c" },
                { label: "Pmt Success",   val: s.totalPaymentSuccess || 0,       color: "#10b981" },
                { label: "D & Done",      val: s.totalDeliveredCompleted || 0,   color: "#047857" },
                { label: "Failed",        val: s.totalPaymentFailed || 0,        color: "#ef4444" },
                { label: "Cancelled",     val: s.totalCancelled || 0,            color: "#94a3b8" },
              ].map(m => {
                const total = Math.max(s.totalOrders || 1, 1);
                const pct   = Math.round((m.val / total) * 100);
                return (
                  <div key={m.label} className="text-center">
                    <div className="text-lg font-bold font-heading" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
