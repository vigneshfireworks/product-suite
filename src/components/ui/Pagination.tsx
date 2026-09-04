"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

// ── Hook ─────────────────────────────────────────────────────────────────────
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when item count changes (filter changed)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const start  = (safePage - 1) * pageSize;
  const paged  = items.slice(start, start + pageSize);

  return { page: safePage, setPage, totalPages, paged, total: items.length, start, pageSize };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, total, start, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const end = Math.min(start + pageSize, total);

  // Build page numbers with ellipsis
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btn = (label: React.ReactNode, target: number, active = false, disabled = false) => (
    <button
      key={String(label) + target}
      onClick={() => !disabled && onPageChange(target)}
      disabled={disabled}
      className="h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center"
      style={active
        ? { background: "#FFC43F", color: "#fff", border: "none" }
        : disabled
          ? { background: "transparent", color: "#d1d5db", cursor: "not-allowed" }
          : { background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb" }
      }
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1">
      <span className="text-xs text-gray-400">
        Showing <span className="font-semibold text-gray-600">{start + 1}–{end}</span> of <span className="font-semibold text-gray-600">{total}</span>
      </span>

      <div className="flex items-center gap-1">
        {btn(<ChevronLeft size={14} />, page - 1, false, page === 1)}
        {pages.map((p, i) =>
          p === "…"
            ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
            : btn(p, p as number, p === page)
        )}
        {btn(<ChevronRight size={14} />, page + 1, false, page === totalPages)}
      </div>
    </div>
  );
}
