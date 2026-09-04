"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Eye, Upload, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Business } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePagination, Pagination } from "@/components/ui/Pagination";

export default function AdminBusinesses() {
  const { token } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editBiz, setEditBiz]       = useState<Business | null>(null);
  const [form, setForm]             = useState({ name: "", category: "retail", description: "", logo: "", displayOrder: "" });
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const logoFileRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch("/api/businesses");
    const data = await res.json();
    setBusinesses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openCreate = () => { setEditBiz(null); setForm({ name: "", category: "retail", description: "", logo: "", displayOrder: "" }); setModalOpen(true); };
  const openEdit   = (b: Business) => { setEditBiz(b); setForm({ name: b.name, category: b.category, description: b.description, logo: b.logo || "", displayOrder: b.displayOrder != null ? String(b.displayOrder) : "" }); setModalOpen(true); };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", files[0]);
    fd.append("businessName", form.name || editBiz?.name || "misc");
    const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (res.ok) { const d = await res.json(); setForm(f => ({ ...f, logo: d.url })); }
    setUploading(false);
    if (logoFileRef.current) logoFileRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    const url    = editBiz ? `/api/businesses/${editBiz.id}` : "/api/businesses";
    const method = editBiz ? "PUT" : "POST";
    const payload = { ...form, displayOrder: form.displayOrder !== "" ? Number(form.displayOrder) : undefined };
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    if (res.ok) { setModalOpen(false); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm("Delete this business?", "All data for this business will be permanently removed.");
    if (!ok) return;
    await fetch(`/api/businesses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  const { sorted, sortKey, sortDir, toggle } = useTableSort<Business>(filtered, "createdAt", "desc");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  return (
    <div>
      <ConfirmDialog />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">Businesses</h1>
          <p className="text-gray-500 text-sm mt-1">{businesses.length} total businesses</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus size={16} /> Add Business</Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex flex-1 max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent transition-colors bg-white">
          <Search size={16} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search businesses..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <SortTh label="Business"  colKey="name"      current={sortKey} dir={sortDir} onToggle={toggle} />
                <SortTh label="Category"  colKey="category"  current={sortKey} dir={sortDir} onToggle={toggle} className="hidden md:table-cell" />
                <SortTh label="Created"   colKey="createdAt" current={sortKey} dir={sortDir} onToggle={toggle} className="hidden lg:table-cell" />
                <SortTh label="Status"    colKey="isActive"  current={sortKey} dir={sortDir} onToggle={toggle} />
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No businesses found</td></tr>
              ) : paged.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-brand-dark">{b.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{b.description}</div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold capitalize">{b.category.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">{formatDateTime(b.createdAt)}</td>
                  <td className="px-5 py-4"><StatusBadge status={b.isActive ? "active" : "inactive"} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/business/${b.slug}`} className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"><Eye size={15} /></Link>
                      <button onClick={() => openEdit(b)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editBiz ? "Edit Business" : "Add New Business"} size="md">
        <div className="space-y-4">
          <Input label="Business Name" placeholder="e.g. Sri Ganesh Crackers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            options={[
              { value: "retail",          label: "Retail (Crackers, Gifts, Invitations...)" },
              { value: "finance",         label: "Finance" },
              { value: "market_analysis", label: "Share Market Analysis" },
              { value: "other",           label: "Other" },
            ]}
          />
          <Textarea label="Description" placeholder="Brief description of the business" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Input label="Display Order" placeholder="e.g. 1 (lower = shown first)" type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} />
          {/* ── Logo upload ───────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo (optional)</label>
            {form.logo ? (
              <div className="flex items-center gap-3 p-3 border-2 border-gray-100 rounded-xl bg-gray-50">
                <img src={form.logo} alt="Logo preview" className="w-14 h-14 object-contain rounded-lg border bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{form.logo.split("/").pop()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs px-2.5 py-1.5 border-2 border-gray-200 rounded-lg hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5"
                  >
                    {uploading
                      ? <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      : <Upload size={13} />}
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, logo: "" }))}
                    className="text-xs px-2.5 py-1.5 border-2 border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <X size={13} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-colors text-gray-400 hover:text-accent"
              >
                {uploading
                  ? <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  : <Upload size={22} />}
                <span className="text-xs font-medium">{uploading ? "Uploading…" : "Click to upload logo"}</span>
                <span className="text-xs text-gray-300">PNG, JPG, SVG, WEBP</span>
              </button>
            )}
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{editBiz ? "Update Business" : "Create Business"}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
