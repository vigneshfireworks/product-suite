"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Edit, Trash2, Upload, X, Image as ImageIcon, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { SortTh, useTableSort } from "@/components/ui/SortTh";
import { usePagination, Pagination } from "@/components/ui/Pagination";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";

interface Category { id: string; name: string; }
const EMPTY_FORM = { name: "", description: "", originalPrice: "", sellingPrice: "", discount: "", stock: "", category: "", quantity: "1", images: [] as string[], videoUrl: "" };

export default function BusinessProducts() {
  const { id: businessId } = useParams() as { id: string };
  const { token } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();

  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [business, setBusiness]   = useState<{ name: string } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modal, setModal]         = useState(false);
  const [catModal, setCatModal]   = useState(false);
  const [editProd, setEditProd]   = useState<Product | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editCat, setEditCat]     = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCats = async () => {
    const res = await fetch(`/api/categories?businessId=${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
    setCategories(await res.json().catch(() => []));
  };

  const load = async () => {
    const [pRes, bRes] = await Promise.all([
      fetch(`/api/products?businessId=${businessId}`),
      fetch(`/api/businesses/${businessId}`),
    ]);
    setProducts(await pRes.json().catch(() => []));
    setBusiness(await bRes.json().catch(() => null));
    setLoading(false);
  };

  useEffect(() => { load(); loadCats(); }, [businessId]);

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter !== "all") list = list.filter(p => p.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    return list;
  }, [products, catFilter, search]);

  const { sorted, sortKey, sortDir, toggle } = useTableSort<Product>(filtered, "name");
  const { page, setPage, totalPages, paged, total, start, pageSize } = usePagination(sorted);

  const openCreate = () => { setEditProd(null); setForm({ ...EMPTY_FORM }); setModal(true); };
  const openEdit   = (p: Product) => {
    setEditProd(p);
    setForm({ name: p.name, description: p.description, originalPrice: String(p.originalPrice), sellingPrice: String(p.sellingPrice), discount: String(p.discount), stock: String(p.stock), category: p.category, quantity: String(p.quantity), images: p.images || [], videoUrl: p.videoUrl || "" });
    setModal(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !business) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("businessName", business.name);
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.ok) { const d = await res.json(); urls.push(d.url); }
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (idx: number) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    const url    = editProd ? `/api/products/${editProd.id}` : "/api/products";
    const method = editProd ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, businessId, originalPrice: Number(form.originalPrice), sellingPrice: Number(form.sellingPrice), discount: Number(form.discount || 0), stock: Number(form.stock || 0), quantity: Number(form.quantity || 1) }),
    });
    setModal(false); setSaving(false); load();
  };

  const handleDelete = async (p: Product) => {
    const ok = await confirm(`Delete "${p.name}"?`, "This product will be permanently removed.");
    if (!ok) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  // Category CRUD
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businessId, name: newCatName.trim() }) });
    setNewCatName(""); setCatSaving(false); loadCats();
  };

  const updateCategory = async () => {
    if (!editCat || !editCatName.trim()) return;
    setCatSaving(true);
    await fetch(`/api/categories/${editCat.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: editCatName.trim() }) });
    setEditCat(null); setEditCatName(""); setCatSaving(false); loadCats();
  };

  const deleteCategory = async (c: Category) => {
    const ok = await confirm(`Delete category "${c.name}"?`, "Products in this category will not be deleted, but their category will be unlinked.");
    if (!ok) return;
    await fetch(`/api/categories/${c.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadCats();
  };

  return (
    <div>
      <ConfirmDialog />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex flex-1 min-w-[180px] max-w-sm border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-accent bg-white">
          <Search size={15} className="ml-3 my-auto text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none bg-white cursor-pointer"
          style={{ borderColor: catFilter !== "all" ? "#FFC43F" : "#e5e7eb" }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button onClick={() => setCatModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm border-2 rounded-xl hover:border-accent hover:text-accent transition-colors bg-white"
          style={{ borderColor: "#e5e7eb" }}>
          <Tag size={14} /> Categories
        </button>
        <div className="ml-auto">
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus size={15} /> Add Product</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#fafafa" }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Image</th>
                <SortTh label="Product"  colKey="name"         current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" />
                <SortTh label="Category" colKey="category"     current={sortKey} dir={sortDir} onToggle={toggle} className="hidden md:table-cell px-4" />
                <SortTh label="Price"    colKey="sellingPrice" current={sortKey} dir={sortDir} onToggle={toggle} className="px-4" align="right" />
                <SortTh label="Stock"    colKey="stock"        current={sortKey} dir={sortDir} onToggle={toggle} className="hidden sm:table-cell px-4" align="right" />
                <SortTh label="Discount" colKey="discount"     current={sortKey} dir={sortDir} onToggle={toggle} className="hidden lg:table-cell px-4" align="right" />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-xl border" />
                      : <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center"><ImageIcon size={18} className="text-gray-300" /></div>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand-dark">{p.name}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">{p.description}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{p.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-bold text-accent">{formatCurrency(p.sellingPrice)}</div>
                    {p.originalPrice > p.sellingPrice && <div className="text-xs text-gray-400 line-through">{formatCurrency(p.originalPrice)}</div>}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className={`font-semibold ${p.stock <= 5 ? "text-red-500" : "text-green-600"}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {p.discount > 0 && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">{p.discount}% off</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} start={start} pageSize={pageSize} onPageChange={setPage} />

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editProd ? "Edit Product" : "Add Product"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} wrapperClassName="col-span-2" />
            <Input label="Original Price (₹) *" type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} />
            <Input label="Selling Price (₹) *"  type="number" value={form.sellingPrice}  onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
            <Input label="Discount (%)"          type="number" value={form.discount}       onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
            <Input label="Stock (units)"         type="number" value={form.stock}          onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            <div>
              <label className="text-sm font-semibold text-brand-dark block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
                style={{ borderColor: "#e5e7eb" }}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Qty per Unit" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Video URL (optional)" value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/..." />

          {/* Image upload */}
          <div>
            <label className="text-sm font-semibold text-brand-dark block mb-2">Images</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-accent hover:bg-accent/5 transition-colors">
                {uploading ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Upload size={16} className="text-gray-400" />}
                <span className="text-xs text-gray-400">Upload</span>
              </button>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{editProd ? "Update Product" : "Add Product"}</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Manage Categories" size="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
              placeholder="New category name..."
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none focus:border-accent"
              style={{ borderColor: "#e5e7eb" }}
            />
            <Button onClick={addCategory} loading={catSaving} size="sm">Add</Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No categories yet. Add your first one above.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  {editCat?.id === c.id ? (
                    <>
                      <input
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") updateCategory(); if (e.key === "Escape") setEditCat(null); }}
                        className="flex-1 px-2 py-1 border rounded-lg text-sm focus:outline-none"
                        autoFocus
                      />
                      <button onClick={updateCategory} disabled={catSaving} className="text-xs font-bold text-green-600 hover:text-green-700 px-2">Save</button>
                      <button onClick={() => setEditCat(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-semibold text-brand-dark">{c.name}</span>
                      <button onClick={() => { setEditCat(c); setEditCatName(c.name); }} className="text-xs text-blue-600 hover:text-blue-700 px-2">Edit</button>
                      <button onClick={() => deleteCategory(c)} className="text-xs text-red-500 hover:text-red-700 px-1">Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={() => setCatModal(false)} className="w-full">Close</Button>
        </div>
      </Modal>
    </div>
  );
}
