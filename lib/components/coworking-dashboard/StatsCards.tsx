"use client";

import { DashboardStatsResponse } from "@/types/api";
import { ShoppingBag, PoundSterling, TrendingUp, Users } from "lucide-react";

interface StatsCardsProps {
  stats: DashboardStatsResponse;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Orders",
      value: stats.summary.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Revenue",
      value: `£${stats.summary.totalRevenue.toFixed(2)}`,
      icon: PoundSterling,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Avg. Order Value",
      value: `£${stats.summary.averageOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Unique Members",
      value: stats.summary.uniqueMembers.toLocaleString(),
      icon: Users,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
