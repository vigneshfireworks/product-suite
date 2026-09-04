"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { StatCard } from "@/components/ui/StatCard";
import { Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Business } from "@/types";

export default function PartnerDashboard() {
  const { user, token } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.businesses?.length) { setLoading(false); return; }
    const bRes = await fetch("/api/businesses");
    const allBiz: Business[] = await bRes.json().catch(() => []);
    const myBizIds = user.businesses.map((b: any) => b.businessId);
    const myBiz = allBiz.filter(b => myBizIds.includes(b.id));
    setBusinesses(myBiz);
    const invested = (user.businesses as any[]).reduce((s: number, b: any) => s + (b.investedAmount || 0), 0);
    setTotalInvested(invested);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Partner Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="My Businesses" value={businesses.length} icon={<Briefcase size={20} />} color="yellow" />
        <StatCard title="Total Invested" value={formatCurrency(totalInvested)} icon={<DollarSign size={20} />} color="blue" />
        <StatCard title="Avg Profit Share" value={
          user?.businesses?.length
            ? `${Math.round((user.businesses as any[]).reduce((s: number, b: any) => s + (b.profitRatio || 0), 0) / (user.businesses as any[]).length)}%`
            : "0%"
        } icon={<TrendingUp size={20} />} color="green" />
      </div>

      <div className="bg-white rounded-card shadow-card p-5">
        <h2 className="font-heading font-bold text-brand-dark mb-4">My Businesses</h2>
        {businesses.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No businesses assigned yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map(b => {
              const mapping = (user?.businesses as any[])?.find((m: any) => m.businessId === b.id);
              return (
                <Link key={b.id} href={`/partner/businesses/${b.id}`} className="border-2 border-gray-100 hover:border-accent rounded-xl p-4 transition-all hover:shadow-md group">
                  <h3 className="font-heading font-bold text-brand-dark group-hover:text-accent transition-colors">{b.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{b.category.replace(/_/g, " ")}</p>
                  {mapping && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Invested:</span>
                        <span className="font-bold text-brand-dark">{formatCurrency(mapping.investedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profit Share:</span>
                        <span className="font-bold text-green-600">{mapping.profitRatio}%</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-accent font-semibold group-hover:underline">View Dashboard →</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
