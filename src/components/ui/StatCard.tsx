import React from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "yellow" | "blue" | "green" | "red" | "purple" | "orange";
  subtitle?: string;
}

const colorMap = {
  yellow: "bg-yellow-50 text-yellow-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
};

export function StatCard({ title, value, icon, color = "yellow", subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-5 flex items-start gap-4 border border-gray-50">
      {icon && (
        <div className={cn("p-3 rounded-xl", colorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold font-heading text-brand-dark mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
