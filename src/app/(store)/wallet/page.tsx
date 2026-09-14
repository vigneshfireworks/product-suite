"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { WalletTransaction } from "@/types";
import { Wallet, Sparkles, Clock, CheckCircle2, Receipt } from "lucide-react";

interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
  creditPercent: number;
  validFrom: string;
  validTo: string;
  isRedeemableNow: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  credit: "Cashback Earned",
  debit: "Redeemed",
  refund: "Refunded",
  adjustment: "Adjustment",
};

export default function WalletPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [user, token, router]);

  if (!user) return null;

  const now = Date.now();
  const validFromTime = data ? new Date(data.validFrom).getTime() : 0;
  const validToTime   = data ? new Date(data.validTo).getTime() : 0;
  const status: "upcoming" | "active" | "expired" =
    !data ? "upcoming" : now < validFromTime ? "upcoming" : now > validToTime ? "expired" : "active";

  const statusMeta = {
    upcoming: { label: "Opens " + (data ? formatDate(data.validFrom) : ""), bg: "#fffbeb", color: "#b45309", icon: <Clock size={13} /> },
    active:   { label: "Active now — you can redeem", bg: "#f0fdf4", color: "#16a34a", icon: <CheckCircle2 size={13} /> },
    expired:  { label: "Redemption window closed", bg: "#f3f4f6", color: "#6b7280", icon: <Clock size={13} /> },
  }[status];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-2xl font-bold text-brand-dark mb-6">My Wallet</h1>

      {/* ── Top: image panel + balance panel ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Illustration panel */}
        <div
          className="rounded-card shadow-card p-6 flex flex-col items-center justify-center text-center overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)", minHeight: "180px" }}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Wallet size={38} className="text-white" strokeWidth={1.7} />
          </div>
          <p className="font-heading font-bold text-white text-lg">Vinks Crackers Wallet</p>
          <p className="text-xs text-white/85 mt-1 flex items-center gap-1">
            <Sparkles size={12} /> Earn {data?.creditPercent ?? 2}% cashback on every order
          </p>
        </div>

        {/* Balance panel */}
        <div className="bg-white rounded-card shadow-card p-6 flex flex-col justify-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Wallet Balance</p>
          {loading ? (
            <div className="h-9 w-32 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="font-heading text-3xl font-bold text-brand-dark">{formatCurrency(data?.balance || 0)}</p>
          )}
          <div
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold w-fit"
            style={{ background: statusMeta.bg, color: statusMeta.color }}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </div>
          {data && (
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
              Redeemable from <strong>{formatDate(data.validFrom)}</strong> to <strong>{formatDate(data.validTo)}</strong>.
              Cashback is credited automatically once your order is delivered.
            </p>
          )}
        </div>
      </div>

      {/* ── History table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Receipt size={16} className="text-gray-400" />
          <h3 className="font-heading font-bold text-brand-dark text-sm">Wallet History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Invoice ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Type</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">Purchase Amount</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 hidden sm:table-cell">Valid From</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 hidden sm:table-cell">Valid To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : !data?.transactions.length ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No wallet activity yet. Shop with Vinks Crackers to start earning!</td></tr>
              ) : data.transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-purple-700">{tx.invoiceId || "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">{TYPE_LABEL[tx.type] ?? tx.type}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-gray-600">
                    {tx.purchaseAmount != null ? formatCurrency(tx.purchaseAmount) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-xs" style={{ color: tx.amount >= 0 ? "#16a34a" : "#ef4444" }}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 hidden sm:table-cell">{tx.validFrom ? formatDate(tx.validFrom) : "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 hidden sm:table-cell">{tx.validTo ? formatDate(tx.validTo) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
