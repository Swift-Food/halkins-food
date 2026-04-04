"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import {
  CalendarResponse,
  CalendarOrderItem,
} from "@/types/api";
import { CoworkingVenueAdmin } from "@/types/api/coworking-admin.api.types";
import CustomCalendar from "./CustomCalendar";
import GridCalendar from "./GridCalendar";
import OrderDetailModal from "./OrderDetailModal";
import {
  MapPin,
  Clock,
  ChevronRight,
  CalendarDays,
  X,
  CheckCheck,
  ShoppingBag,
  LayoutList,
  LayoutGrid,
} from "lucide-react";

interface CalendarTabProps {
  spaceId: string;
  refreshToken?: number;
}

// Predefined venue color palette - distinct, accessible colors
const VENUE_COLORS = [
  "#818cf8", // indigo-400
  "#22d3ee", // cyan-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#a78bfa", // violet-400
  "#38bdf8", // sky-400
  "#e879f9", // fuchsia-400
  "#a3e635", // lime-400
  "#fb923c", // orange-400
];

const statusBadgeColor: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  admin_reviewed: "bg-blue-100 text-blue-800",
  restaurant_reviewed: "bg-indigo-100 text-indigo-800",
  payment_link_sent: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  confirmed: "bg-green-100 text-green-800",
  preparing: "bg-indigo-100 text-indigo-800",
  ready: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabel: Record<string, string> = {
  pending_review: "Under Review",
  approved: "Approved",
  admin_reviewed: "Awaiting Restaurants",
  restaurant_reviewed: "Awaiting Payment",
  payment_link_sent: "Invoice Sent",
  paid: "Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getDisplayStatus(status: string, adminReviewStatus: string): string {
  if (status === "pending_review" && adminReviewStatus === "approved") {
    return "admin_reviewed";
  }

  if (status === "approved" || status === "rejected" || status === "deposit_paid") {
    return adminReviewStatus;
  }

  return status;
}

function formatStatus(status: string, adminReviewStatus: string): string {
  const displayStatus = getDisplayStatus(status, adminReviewStatus);

  if (displayStatus === "approved") {
    return "Approved";
  }

  if (displayStatus === "rejected") {
    return "Rejected";
  }

  if (displayStatus === "deposit_paid") {
    return "Deposit Paid";
  }

  return (
    statusLabel[displayStatus] ||
    displayStatus.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function shouldCountForCalendarIndicator(order: CalendarOrderItem): boolean {
  if (order.status === "cancelled") return false;
  if (order.adminReviewStatus === "rejected") return false;
  return true;
}

export default function CalendarTab({ spaceId, refreshToken = 0 }: CalendarTabProps) {
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [venues, setVenues] = useState<CoworkingVenueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(new Set());
  const [priceView, setPriceView] = useState<"total" | "venue_hire">(() => {
    if (typeof window === "undefined") return "total";
    return (localStorage.getItem("orders_price_view") as "total" | "venue_hire") ?? "total";
  });
  const [calendarMode, setCalendarMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("calendar_mode") as "list" | "grid") ?? "list";
  });

  const handlePriceViewChange = () => {
    const next = priceView === "total" ? "venue_hire" : "total";
    setPriceView(next);
    localStorage.setItem("orders_price_view", next);
  };

  const handleCalendarModeChange = (mode: "list" | "grid") => {
    setCalendarMode(mode);
    localStorage.setItem("calendar_mode", mode);
  };

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const [calData, venueList] = await Promise.all([
        coworkingDashboardService.getCalendar(spaceId),
        coworkingDashboardService.listVenues(spaceId),
      ]);
      setCalendarData(calData);
      setVenues(venueList);
      setSelectedVenueIds(new Set(venueList.map((v) => v.id)));
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar, refreshToken]);

  const venueColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    venues.forEach((v, i) => {
      map[v.id] = VENUE_COLORS[i % VENUE_COLORS.length];
    });
    return map;
  }, [venues]);

  const dateIndicators = useMemo(() => {
    if (!calendarData) return {};
    const indicators: Record<string, { venueId: string | null; venueName: string | null; color: string; count: number }[]> = {};

    for (const venue of calendarData.venues) {
      const venueKey = venue.venueId ?? "no-venue";
      if (!selectedVenueIds.has(venueKey)) continue;

      for (const dateGroup of venue.dates) {
        const visibleCount = dateGroup.orders.filter(shouldCountForCalendarIndicator).length;
        if (!indicators[dateGroup.date]) indicators[dateGroup.date] = [];
        if (visibleCount > 0) {
          indicators[dateGroup.date].push({
            venueId: venue.venueId,
            venueName: venue.venueName,
            color: venueColorMap[venueKey],
            count: visibleCount,
          });
        }
      }
    }

    return indicators;
  }, [calendarData, selectedVenueIds, venueColorMap]);

  const selectedDayOrders = useMemo(() => {
    if (!calendarData) return [];
    const orders: { order: CalendarOrderItem; venueName: string | null; venueId: string | null; color: string }[] = [];

    for (const venue of calendarData.venues) {
      const venueKey = venue.venueId ?? "no-venue";
      if (!selectedVenueIds.has(venueKey)) continue;

      for (const dateGroup of venue.dates) {
        if (dateGroup.date === selectedDate) {
          for (const order of dateGroup.orders) {
            if (!shouldCountForCalendarIndicator(order)) continue;
            orders.push({
              order,
              venueName: venue.venueName,
              venueId: venue.venueId,
              color: venueColorMap[venueKey],
            });
          }
        }
      }
    }

    orders.sort((a, b) => {
      const aTime = a.order.bookingStartTime ?? "";
      const bTime = b.order.bookingStartTime ?? "";
      return aTime.localeCompare(bTime);
    });

    return orders;
  }, [calendarData, selectedDate, selectedVenueIds, venueColorMap]);

  const allOrdersByDate = useMemo(() => {
    if (!calendarData) return {};
    const result: Record<string, { order: CalendarOrderItem; venueName: string | null; venueId: string | null; color: string }[]> = {};

    for (const venue of calendarData.venues) {
      const venueKey = venue.venueId ?? "no-venue";
      if (!selectedVenueIds.has(venueKey)) continue;

      for (const dateGroup of venue.dates) {
        const visibleOrders = dateGroup.orders.filter(shouldCountForCalendarIndicator);
        if (visibleOrders.length === 0) continue;
        if (!result[dateGroup.date]) result[dateGroup.date] = [];
        for (const order of visibleOrders) {
          result[dateGroup.date].push({
            order,
            venueName: venue.venueName,
            venueId: venue.venueId,
            color: venueColorMap[venueKey],
          });
        }
      }
    }

    for (const key of Object.keys(result)) {
      result[key].sort((a, b) =>
        (a.order.bookingStartTime ?? "").localeCompare(b.order.bookingStartTime ?? "")
      );
    }

    return result;
  }, [calendarData, selectedVenueIds, venueColorMap]);

  const toggleVenue = (venueKey: string) => {
    setSelectedVenueIds((prev) => {
      const next = new Set(prev);
      if (next.has(venueKey)) {
        next.delete(venueKey);
      } else {
        next.add(venueKey);
      }
      return next;
    });
  };

  const allVenueIds = venues.map((v) => v.id);
  const selectAll = () => setSelectedVenueIds(new Set(allVenueIds));
  const clearAll = () => setSelectedVenueIds(new Set());

  const allSelected = selectedVenueIds.size === allVenueIds.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  const formattedSelectedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const venueFilterPanel = venues.length > 0 && (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Venues</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={allSelected}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck size={12} />
            All
          </button>
          <button
            onClick={clearAll}
            disabled={selectedVenueIds.size === 0}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {venues.map((venue) => {
          const color = venueColorMap[venue.id];
          const isActive = selectedVenueIds.has(venue.id);

          return (
            <button
              key={venue.id}
              onClick={() => toggleVenue(venue.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-base-200 text-gray-400 bg-base-200/50"
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.5)" : color }}
              />
              {venue.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="flex items-center bg-base-200/60 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => handleCalendarModeChange("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              calendarMode === "list"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutList size={14} />
            List
          </button>
          <button
            onClick={() => handleCalendarModeChange("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              calendarMode === "grid"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid size={14} />
            Grid
          </button>
        </div>
      </div>

      {calendarMode === "grid" ? (
        /* Grid mode: full-width calendar with inline events + narrow venues sidebar */
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-base-200 p-4 sm:p-6 min-w-0">
            <GridCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              ordersByDate={allOrdersByDate}
              priceView={priceView}
              onOrderSelect={setSelectedOrderId}
            />
          </div>

          {venues.length > 0 && (
            <div className="lg:w-52 flex-shrink-0 bg-white rounded-xl shadow-sm border border-base-200 p-4 space-y-4">
              {venueFilterPanel}
              <div className="pt-2 border-t border-base-200">
                <button
                  onClick={handlePriceViewChange}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {priceView === "total" ? "Showing: Total fee" : "Showing: Hire fee"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List mode: calendar + venues on left, orders panel on right */
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar card */}
          <div className="lg:basis-3/5 lg:flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-base-200 p-4 sm:p-6">
              <CustomCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                dateIndicators={dateIndicators}
              />
            </div>

            {venues.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-base-200 px-4 sm:px-6 py-4">
                {venueFilterPanel}
              </div>
            )}
          </div>

          {/* Orders for selected day */}
          <div className="lg:basis-2/5 lg:max-h-[700px] lg:flex lg:flex-col bg-white rounded-xl shadow-sm border border-base-200">
            <div className="border-b border-base-200 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-gray-900">
                    {formattedSelectedDate}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <ShoppingBag className="h-3 w-3" />
                      {selectedDayOrders.length} order{selectedDayOrders.length !== 1 ? "s" : ""}
                    </span>
                    {selectedDayOrders.length > 0 && (
                      <span className="text-xs font-semibold text-primary">
                        £{selectedDayOrders.reduce((sum, o) => sum + (priceView === "total" ? o.order.total : o.order.venueHireFee), 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handlePriceViewChange}
                  className="w-24 justify-center flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {priceView === "total" ? "Total fee" : "Hire fee"}
                </button>
              </div>
            </div>

            <div className="divide-y divide-base-200 lg:overflow-y-auto lg:flex-1 lg:min-h-0">
              {selectedDayOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-gray-500">No orders</p>
                  <p className="text-sm mt-1 text-gray-400">No orders for this date.</p>
                </div>
              ) : (
                selectedDayOrders.map(({ order, venueName, color }) => {
                  const displayStatus = getDisplayStatus(order.status, order.adminReviewStatus);

                  return (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedOrderId(order.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedOrderId(order.id);
                        }
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 transition-colors text-left hover:bg-base-200/30 cursor-pointer"
                    >
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: color }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {order.memberName || order.memberEmail}
                          </p>
                          <span className="text-sm font-bold text-primary flex-shrink-0">
                            £{(priceView === "total" ? order.total : order.venueHireFee).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              statusBadgeColor[displayStatus] || "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {formatStatus(order.status, order.adminReviewStatus)}
                          </span>
                          {venueName && (
                            <span className="text-xs text-gray-400 font-medium">{venueName}</span>
                          )}
                          {order.bookingReference && (
                            <span className="text-xs text-gray-400">#{order.bookingReference}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                          {(order.bookingStartTime || order.bookingEndTime) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(order.bookingStartTime)}
                              {order.bookingEndTime && ` – ${formatDateTime(order.bookingEndTime)}`}
                            </span>
                          )}
                          {order.roomLocationDetails && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.roomLocationDetails}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          spaceId={spaceId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={fetchCalendar}
        />
      )}
    </div>
  );
}
