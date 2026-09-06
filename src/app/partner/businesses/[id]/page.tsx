"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, DollarSign, Package, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Business } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";

export default function PartnerBusinessDashboard() {
  const params = useParams();
  const { token, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    Promise.all([
      fetch(`/api/businesses/${id}`).then(r => r.json()),
      fetch(`/api/dashboard?businessId=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([biz, dash]) => {
      setBusiness(biz);
      setStats(dash ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id, token]);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-24 bg-gray-100 rounded-card animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-card animate-pulse" />)}
      </div>
    </div>
  );

  if (!business) return <div className="text-center py-20 text-gray-400">Business not found</div>;

  const isFinance = business.category === "finance";
  const mapping = (user?.businesses as any[])?.find((m: any) => m.businessId === business.id);

  return (
    <div className="space-y-6">
      {/* My stake */}
      {mapping && (
        <div className="bg-accent/10 border border-accent/20 rounded-card p-5 flex gap-8">
          <div>
            <div className="text-xs text-gray-500 mb-1">My Investment</div>
            <div className="font-bold text-brand-dark text-2xl">{formatCurrency(mapping.investedAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Profit Share</div>
            <div className="font-bold text-green-600 text-2xl">{mapping.profitRatio}%</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders"   value={stats.totalOrders   ?? 0}                   icon={<ShoppingCart size={18} />} color="blue" />
        <StatCard title="Total Sales"    value={formatCurrency(stats.totalSales    ?? 0)}    icon={<DollarSign size={18} />}   color="green" />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses ?? 0)}    icon={<DollarSign size={18} />}   color="red" />
        {isFinance
          ? <StatCard title="Loan Requests" value={stats.totalLoans ?? 0}           icon={<Package size={18} />} color="purple" />
          : <StatCard title="Pending"       value={stats.totalPending ?? 0}         icon={<Package size={18} />} color="orange" />
        }
      </div>

      {/* Quick-links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: "orders",   label: "View Orders",   icon: <ShoppingCart size={18} />,  color: "text-blue-600 bg-blue-50" },
          { href: "products", label: "View Products", icon: <Package size={18} />,        color: "text-accent bg-accent/10" },
          { href: "expenses", label: "Expenses",      icon: <DollarSign size={18} />,     color: "text-red-600 bg-red-50" },
          { href: "demand",   label: "Demand",        icon: <TrendingUp size={18} />,     color: "text-green-600 bg-green-50" },
        ].map(item => (
          <Link
            key={item.href}
            href={`/partner/businesses/${params.id}/${item.href}`}
            className={`flex items-center gap-3 p-4 rounded-xl ${item.color} font-semibold text-sm transition-opacity hover:opacity-80`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
