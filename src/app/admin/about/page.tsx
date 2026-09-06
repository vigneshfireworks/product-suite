"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, RefreshCw, CheckCircle } from "lucide-react";

interface AboutContent {
  headline: string;
  tagline: string;
  story: string;
  ceoName: string;
  ceoTitle: string;
  ceoPhone: string;
  email: string;
  mission: string;
  founded: string;
  updatedAt?: string;
}

const Field = ({
  label,
  name,
  value,
  onChange,
  multiline = false,
  placeholder = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none bg-white"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent bg-white"
      />
    )}
  </div>
);

export default function AdminAboutPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<AboutContent>({
    headline: "",
    tagline: "",
    story: "",
    ceoName: "",
    ceoTitle: "",
    ceoPhone: "",
    email: "",
    mission: "",
    founded: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/about")
      .then(r => r.json())
      .then(d => {
        setForm(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (name: string, value: string) => {
    setSaved(false);
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setForm(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">About Us Content</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Update the About Us page shown to customers in the footer.
            {form.updatedAt && (
              <span className="ml-2 text-xs text-gray-400">
                Last updated: {new Date(form.updatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
          style={{ background: saved ? "#22c55e" : "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* CEO / Founder */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-heading font-bold text-brand-dark text-base border-b pb-3">
          👤 CEO / Founder
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" name="ceoName" value={form.ceoName} onChange={handleChange} placeholder="Vigneshwaran Ramachandran" />
          <Field label="Title" name="ceoTitle" value={form.ceoTitle} onChange={handleChange} placeholder="CEO & Founder" />
          <Field label="Phone" name="ceoPhone" value={form.ceoPhone} onChange={handleChange} placeholder="7373872638" />
          <Field label="Founded Year" name="founded" value={form.founded} onChange={handleChange} placeholder="2024" />
        </div>
      </div>

      {/* Company details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-heading font-bold text-brand-dark text-base border-b pb-3">
          🏢 Company Details
        </h2>
        <Field label="Page Headline" name="headline" value={form.headline} onChange={handleChange} placeholder="About Product Suite" />
        <Field label="Tagline" name="tagline" value={form.tagline} onChange={handleChange} placeholder="Multiple businesses. One platform." />
        <Field label="Contact Email" name="email" value={form.email} onChange={handleChange} placeholder="productsuite@gmail.com" />
      </div>

      {/* Story & Mission */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-heading font-bold text-brand-dark text-base border-b pb-3">
          📖 Story &amp; Mission
        </h2>
        <Field
          label="Our Story"
          name="story"
          value={form.story}
          onChange={handleChange}
          multiline
          placeholder="Tell your company's story here…"
        />
        <Field
          label="Our Mission"
          name="mission"
          value={form.mission}
          onChange={handleChange}
          multiline
          placeholder="What drives your company…"
        />
      </div>

      {/* Preview note */}
      <div className="text-xs text-gray-400 text-center pb-4">
        Changes are reflected immediately on the live site after saving.
      </div>
    </div>
  );
}
