"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface UserChartData {
  registeredWithOrders: number;
  registeredNoOrders: number;
  registeredOrders: number;
  anonymousOrders: number;
  totalOrders: number;
  totalRegistered: number;
}

interface Props {
  businessId?: string;
  from?: string;
  to?: string;
}

// Horizontal bar — count always shown outside the bar, label on left
function HBar({ label, value, max, color, sublabel }: {
  label: string; value: number; max: number; color: string; sublabel?: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <div className="w-40 flex-shrink-0 text-right pr-1">
        <div className="text-xs font-semibold text-gray-700 leading-tight">{label}</div>
        {sublabel && <div className="text-[10px] text-gray-400">{sublabel}</div>}
      </div>
      {/* Bar track */}
      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center justify-end px-2 transition-all duration-700"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? 6 : 0 }}
        />
      </div>
      {/* Count — always visible outside */}
      <div className="w-10 flex-shrink-0 text-left">
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

export function UserOrdersChart({ businessId, from, to }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<UserChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (businessId) p.set("businessId", businessId);
    if (from) p.set("from", from);
    if (to)   p.set("to",   to);
    fetch(`/api/dashboard/users-chart?${p}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [businessId, from, to, token]);

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 shadow-card flex items-center justify-center" style={{ minHeight: 220 }}>
      <div className="w-7 h-7 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const userMax = Math.max(data.registeredWithOrders, data.registeredNoOrders, 1);
  const ordMax  = Math.max(data.registeredOrders, data.anonymousOrders, 1);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <h3 className="font-heading font-bold text-brand-dark text-sm mb-1">User Order Analytics</h3>
      <p className="text-xs text-gray-400 mb-4">Who's placing orders</p>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Users</p>
      <div className="space-y-2.5 mb-5">
        <HBar label="Registered + Ordered"  value={data.registeredWithOrders} max={userMax} color="#10b981" sublabel={`of ${data.totalRegistered} total users`} />
        <HBar label="Registered, No Orders" value={data.registeredNoOrders}   max={userMax} color="#6366f1" />
      </div>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Orders</p>
      <div className="space-y-2.5">
        <HBar label="Registered Orders" value={data.registeredOrders}  max={ordMax} color="#10b981" />
        <HBar label="Anonymous Orders"  value={data.anonymousOrders}   max={ordMax} color="#f59e0b" />
      </div>
    </div>
  );
}

// ── Dashboard Stats Chart ────────────────────────────────────────────────────
interface StatsChartProps {
  stats: {
    totalOrders: number;
    totalPending: number;
    totalDispatched: number;
    totalPaymentPartially: number;
    totalPaymentSuccess: number;
    totalDeliveredCompleted: number;
    totalPaymentFailed: number;
    totalCash: number;
    totalOnline: number;
    totalSales: number;
    totalExpenses: number;
    totalProfit: number;
  };
}

export function DashboardStatsChart({ stats: s }: StatsChartProps) {
  const statusBars = [
    { label: "Pending",    value: s.totalPending            || 0, color: "#f97316" },
    { label: "Dispatched", value: s.totalDispatched         || 0, color: "#3b82f6" },
    { label: "Part. Paid", value: s.totalPaymentPartially   || 0, color: "#ea580c" },
    { label: "Pmt Success",value: s.totalPaymentSuccess     || 0, color: "#10b981" },
    { label: "D & Done",   value: s.totalDeliveredCompleted || 0, color: "#047857" },
  ];
  const payBars = [
    { label: "Pmt Success", value: s.totalPaymentSuccess || 0, color: "#10b981" },
    { label: "Pmt Failed",  value: s.totalPaymentFailed  || 0, color: "#ef4444" },
    { label: "Cash",        value: s.totalCash            || 0, color: "#f59e0b" },
    { label: "Online",      value: s.totalOnline           || 0, color: "#8b5cf6" },
  ];

  const statusMax = Math.max(...statusBars.map(b => b.value), 1);
  const payMax    = Math.max(...payBars.map(b => b.value), 1);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <h3 className="font-heading font-bold text-brand-dark text-sm mb-1">Order Breakdown</h3>
      <p className="text-xs text-gray-400 mb-4">Status and payment method</p>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">By Status</p>
      <div className="space-y-2.5 mb-5">
        {statusBars.map(b => <HBar key={b.label} label={b.label} value={b.value} max={statusMax} color={b.color} />)}
      </div>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">By Payment</p>
      <div className="space-y-2.5">
        {payBars.map(b => <HBar key={b.label} label={b.label} value={b.value} max={payMax} color={b.color} />)}
      </div>
    </div>
  );
}

// Backward-compatible export
export function OrdersChart({ businessId, from, to }: Props) {
  return <UserOrdersChart businessId={businessId} from={from} to={to} />;
}
