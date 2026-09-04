"use client";
import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// ── Reusable sort header cell ─────────────────────────────────────────────────
interface SortThProps {
  label: string;
  colKey: string;
  current: string | null;
  dir: "asc" | "desc";
  onToggle: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

export function SortTh({ label, colKey, current, dir, onToggle, className = "", align = "left" }: SortThProps) {
  const active = current === colKey;
  return (
    <th
      onClick={() => onToggle(colKey)}
      className={`py-3.5 font-semibold text-gray-600 cursor-pointer select-none group hover:text-accent transition-colors px-5 ${className}`}
      style={{ textAlign: align }}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : ""}`}>
        {align === "right" && (
          <span className={active ? "text-accent" : "text-gray-300 group-hover:text-gray-400"}>
            {active ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
          </span>
        )}
        {label}
        {align !== "right" && (
          <span className={active ? "text-accent" : "text-gray-300 group-hover:text-gray-400"}>
            {active ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
          </span>
        )}
      </span>
    </th>
  );
}

// ── Hook: maintain sort state + return sorted array ────────────────────────────
export function useTableSort<T>(
  data: T[],
  defaultKey: string | null = null,
  defaultDir: "asc" | "desc" = "asc"
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  const toggle = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] ?? "";
      const bv = (b as Record<string, unknown>)[sortKey] ?? "";
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}
