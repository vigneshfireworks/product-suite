"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Plus, Trash2, Shield, Lock, X, Check, ChevronDown, ChevronUp,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
  "#14b8a6", "#0ea5e9", "#64748b", "#1a1a2e",
];

const ALL_PERMISSIONS = [
  { group: "Businesses",  items: ["businesses.read", "businesses.write", "businesses.delete"] },
  { group: "Products",    items: ["products.read", "products.write", "products.delete"] },
  { group: "Orders",      items: ["orders.read", "orders.write", "orders.own"] },
  { group: "Users",       items: ["users.read", "users.write", "users.delete"] },
  { group: "Partners",    items: ["partners.read", "partners.write"] },
  { group: "Expenses",    items: ["expenses.read", "expenses.write"] },
  { group: "Analytics",   items: ["analytics.read"] },
  { group: "Profile",     items: ["profile.own"] },
];

function AddRoleModal({
  token, onClose, onCreated,
}: { token: string | null; onClose: () => void; onCreated: (r: Role) => void }) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor]             = useState("#6366f1");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const togglePerm = (p: string) =>
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Role name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, color, permissions }),
      });
      if (res.ok) { onCreated(await res.json()); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Failed to create role"); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-heading font-bold text-lg text-brand-dark">Add New Role</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Manager, Accountant, Viewer…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What can this role do?"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Badge Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: color === c ? "#000" : "transparent",
                    transform: color === c ? "scale(1.2)" : undefined,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-gray-500">Preview: </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-white text-xs font-bold"
                style={{ background: color }}
              >{name || "Role Name"}</span>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Permissions</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {ALL_PERMISSIONS.map(group => (
                <div key={group.group} className="p-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {group.group}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(p => {
                      const active = permissions.includes(p);
                      return (
                        <button
                          key={p} type="button"
                          onClick={() => togglePerm(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            background: active ? color + "18" : "#f9fafb",
                            borderColor: active ? color : "#e5e7eb",
                            color: active ? color : "#6b7280",
                          }}
                        >
                          {active && <Check size={11} />}
                          {p.split(".")[1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">{permissions.length} permission{permissions.length !== 1 ? "s" : ""} selected</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
          >
            {saving ? "Creating…" : <><Plus size={15} /> Create Role</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  const { token } = useAuth();
  const [roles, setRoles]           = useState<Role[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roles", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setRoles(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    setDeleting(id);
    await fetch(`/api/roles/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRoles(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);

  return (
    <>
      {showAdd && (
        <AddRoleModal
          token={token}
          onClose={() => setShowAdd(false)}
          onCreated={r => setRoles(prev => [...prev, r])}
        />
      )}

      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand-dark">Roles</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage access roles for your platform. {roles.length} total.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
          >
            <Plus size={16} /> Add Role
          </button>
        </div>

        {/* System roles */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Lock size={13} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Roles</span>
            <span className="text-xs text-gray-300">— built-in, cannot be deleted</span>
          </div>
          {systemRoles.map(role => (
            <RoleCard
              key={role.id} role={role}
              expanded={expanded === role.id}
              onToggle={() => setExpanded(expanded === role.id ? null : role.id)}
              onDelete={null}
              deleting={false}
            />
          ))}
        </div>

        {/* Custom roles */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Shield size={13} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Roles</span>
          </div>
          {customRoles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <Shield size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No custom roles yet</p>
              <p className="text-gray-300 text-xs mt-1">Click "Add Role" to create your first custom role</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white mx-auto"
                style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
              >
                <Plus size={15} /> Add Role
              </button>
            </div>
          ) : (
            customRoles.map(role => (
              <RoleCard
                key={role.id} role={role}
                expanded={expanded === role.id}
                onToggle={() => setExpanded(expanded === role.id ? null : role.id)}
                onDelete={() => handleDelete(role.id)}
                deleting={deleting === role.id}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function RoleCard({
  role, expanded, onToggle, onDelete, deleting,
}: {
  role: Role;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (() => void) | null;
  deleting: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Color dot */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: role.color + "18" }}
        >
          <Shield size={18} style={{ color: role.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-brand-dark text-sm">{role.name}</span>
            <span
              className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
              style={{ background: role.color }}
            >
              {role.isSystem ? "System" : "Custom"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description || "No description"}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            {role.permissions.length === 1 && role.permissions[0] === "*"
              ? "All permissions"
              : `${role.permissions.length} permission${role.permissions.length !== 1 ? "s" : ""}`}
          </span>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded permissions */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Permissions</p>
          {role.permissions[0] === "*" ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: role.color + "18", color: role.color }}>
              ✦ Full access — all permissions
            </span>
          ) : role.permissions.length === 0 ? (
            <span className="text-xs text-gray-400">No permissions assigned</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map(p => (
                <span
                  key={p}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: role.color + "12", color: role.color }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          {role.createdAt && (
            <p className="text-xs text-gray-300 mt-3">
              Created {new Date(role.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
