import React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    dispatched: "bg-blue-100 text-blue-800",
    payment_partially:   "bg-orange-100 text-orange-800",
    payment_success:     "bg-green-100 text-green-800",
    delivered_completed: "bg-emerald-100 text-emerald-800",
    payment_failed:      "bg-red-100 text-red-800",
    cancelled:           "bg-gray-100 text-gray-700",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    closed: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-700",
  };
  const label: Record<string, string> = {
    payment_partially:   "Partially Paid",
    payment_success:     "Payment Success",
    delivered_completed: "Delivered & Completed",
  };
  return (
    <Badge className={map[status] || "bg-gray-100 text-gray-700"}>
      {label[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
