"use client";

import { DashboardStatsResponse } from "@/types/api";
import { CalendarDays, PoundSterling, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats: DashboardStatsResponse;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const formatCurrency = (value: number) => `£${value.toFixed(2)}`;
  const headlineMetrics = stats.headlineMetrics ?? {
    upcomingEventsNext7Days: 0,
    eventsTomorrow: 0,
    confirmedRevenueLastMonth: 0,
    confirmedRevenueThisMonth: 0,
    averageBookingValuePast30Days: 0,
  };

  const cards = [
    {
      id: "upcoming-events",
      label: "Upcoming Events",
      value: headlineMetrics.upcomingEventsNext7Days.toLocaleString(),
      meta: `${headlineMetrics.eventsTomorrow.toLocaleString()} tomorrow`,
      icon: CalendarDays,
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "confirmed-revenue-last-month",
      label: "Confirmed Revenue",
      value: formatCurrency(headlineMetrics.confirmedRevenueLastMonth),
      meta: "Last month",
      icon: PoundSterling,
      color: "bg-green-50 text-green-600",
    },
    {
      id: "confirmed-revenue-this-month",
      label: "Confirmed Revenue",
      value: formatCurrency(headlineMetrics.confirmedRevenueThisMonth),
      meta: "This month",
      icon: PoundSterling,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      id: "average-booking-value-past-30-days",
      label: "Avg. Booking Value",
      value: formatCurrency(headlineMetrics.averageBookingValuePast30Days),
      meta: "Past 30 days",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.meta}</p>
          </div>
        );
      })}
    </div>
  );
}
