"use client";
import React, { useEffect, useState } from "react";
import { Wallet, Plus, Minus, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { WalletTransaction } from "@/types";

interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
  isRedeemableNow: boolean;
  validFrom: string;
  validTo: string;
}

export function WalletAdjustModal({
  userId,
  userName,
  token,
  onClose,
}: {
  userId: string;
  userName: string;
  token: string;
  onClose: () => void;
}) {
  const [data, setData]         = useState<WalletData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<"add" | "deduct">("add");
  const [amount, setAmount]     = useState("");
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    setLoading(true);
    fetch(`/api/wallet?userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError("Failed to load wallet"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId, token]);

  const handleSave = async () => {
    const num = Number(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, amount: mode === "add" ? num : -num, note: note || undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Failed to update wallet"); return; }
      setAmount(""); setNote("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx: WalletTransaction) => {
    const ok = await confirm(
      "Delete this wallet entry?",
      `This removes "${tx.type}${tx.note ? ` — ${tx.note}` : ""}" (${tx.amount >= 0 ? "+" : ""}${formatCurrency(tx.amount)}) and adjusts the balance to match. This cannot be undone.`
    );
    if (!ok) return;
    setDeletingId(tx.id);
    try {
      const res = await fetch(`/api/wallet/${tx.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Failed to delete entry"); return; }
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal open onClose={onClose} title="Customer Wallet" size="md">
      <div className="space-y-5">
        <p className="text-xs text-gray-400 -mt-2">{userName}</p>

        {/* Balance summary */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}>
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-white/80 font-medium uppercase tracking-wide">Current Balance</p>
            {loading ? (
              <div className="h-6 w-20 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-bold text-white">{formatCurrency(data?.balance || 0)}</p>
            )}
          </div>
        </div>

        {/* Adjust form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("add")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
              style={{ borderColor: mode === "add" ? "#16a34a" : "#e5e7eb", color: mode === "add" ? "#16a34a" : "#9ca3af", background: mode === "add" ? "#f0fdf4" : "transparent" }}
            >
              <Plus size={14} /> Add
            </button>
            <button
              type="button"
              onClick={() => setMode("deduct")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
              style={{ borderColor: mode === "deduct" ? "#ef4444" : "#e5e7eb", color: mode === "deduct" ? "#ef4444" : "#9ca3af", background: mode === "deduct" ? "#fef2f2" : "transparent" }}
            >
              <Minus size={14} /> Deduct
            </button>
          </div>
          <Input label="Amount (₹)" type="number" min="0" step="0.01" placeholder="e.g. 50" value={amount} onChange={e => setAmount(e.target.value)} />
          <Input label="Note (optional)" placeholder="Reason for this adjustment" value={note} onChange={e => setNote(e.target.value)} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button onClick={handleSave} loading={saving} className="w-full">
            {mode === "add" ? "Add to Wallet" : "Deduct from Wallet"}
          </Button>
        </div>

        {/* Recent history */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Activity</p>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-gray-300"><Loader2 size={18} className="animate-spin" /></div>
            ) : !data?.transactions.length ? (
              <p className="text-xs text-gray-400 text-center py-4">No wallet activity yet</p>
            ) : data.transactions.slice(0, 10).map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 text-xs group">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-dark capitalize truncate">{tx.type}{tx.note ? ` — ${tx.note}` : ""}</p>
                  <p className="text-gray-400">{formatDateTime(tx.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold" style={{ color: tx.amount >= 0 ? "#16a34a" : "#ef4444" }}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(tx)}
                    disabled={deletingId === tx.id}
                    title="Delete this entry"
                    className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === tx.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </Modal>
  );
}
