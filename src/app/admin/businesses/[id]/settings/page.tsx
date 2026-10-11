"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { Business } from "@/types";
import { Settings, Save, AlertCircle } from "lucide-react";

export default function BusinessSettings() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [productLimit, setProductLimit] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/businesses/${businessId}`);
        if (!res.ok) throw new Error("Failed to fetch business data");
        const data: Business = await res.json();
        setBusiness(data);
        setProductLimit(data.productLimit?.toString() ?? "");
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [businessId]);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...business,
          productLimit: productLimit === "" ? undefined : Number(productLimit)
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setMessage({ type: "success", text: "Settings updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 text-accent rounded-xl">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-brand-dark">Business Settings</h2>
            <p className="text-xs text-gray-500">Configure how your business appears to customers.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 items-start">
            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              The product limit controls how many products are fetched and displayed on your public dashboard.
              If left empty, all active products will be loaded.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1">
              <Input
                label="Dashboard Product Limit"
                type="number"
                value={productLimit}
                onChange={e => setProductLimit(e.target.value)}
                placeholder="e.g. 10"
              />
              <p className="text-xs text-gray-500 ml-1">
                Maximum number of products to load on the customer dashboard.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              onClick={handleSave}
              loading={saving}
              className="flex items-center gap-2 px-6"
            >
              <Save size={16} /> Save Changes
            </Button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {message.type === "success" ? "✓" : "✕"} {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
