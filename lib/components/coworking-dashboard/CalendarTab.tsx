"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import {
  CalendarResponse,
  CalendarOrderItem,
} from "@/types/api";
import CustomCalendar from "./CustomCalendar";
import OrderDetailModal from "./OrderDetailModal";
import {
  User,
  Hash,
  MapPin,
  Clock,
  ChevronRight,
  CalendarDays,
  X,
  CheckCheck,
} from "lucide-react";

interface CalendarTabProps {
  spaceId: string;
}

// Predefined venue color palette - distinct, accessible colors
const VENUE_COLORS = [
  "#6366f1", // indigo
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0284c7", // sky
  "#c026d3", // fuchsia
  "#65a30d", // lime
  "#ea580c", // orange
];

const statusBadgeColor: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export default function CalendarTab({ spaceId }: CalendarTabProps) {
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(new Set());
  const [allVenueIds, setAllVenueIds] = useState<string[]>([]);

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coworkingDashboardService.getCalendar(spaceId);
      setCalendarData(data);

      // Initialize venue filter with all venues selected
      const ids = data.venues.map((v) => v.venueId ?? "no-venue");
      setAllVenueIds(ids);
      setSelectedVenueIds(new Set(ids));
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Map venue IDs to colors
  const venueColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!calendarData) return map;
    calendarData.venues.forEach((v, i) => {
      const key = v.venueId ?? "no-venue";
      map[key] = VENUE_COLORS[i % VENUE_COLORS.length];
    });
    return map;
  }, [calendarData]);

  // Build date indicators for the calendar (respecting venue filter)
  const dateIndicators = useMemo(() => {
    if (!calendarData) return {};
    const indicators: Record<string, { venueId: string | null; venueName: string | null; color: string; count: number }[]> = {};

    for (const venue of calendarData.venues) {
      const venueKey = venue.venueId ?? "no-venue";
      if (!selectedVenueIds.has(venueKey)) continue;

      for (const dateGroup of venue.dates) {
        if (!indicators[dateGroup.date]) indicators[dateGroup.date] = [];
        if (dateGroup.orders.length > 0) {
          indicators[dateGroup.date].push({
            venueId: venue.venueId,
            venueName: venue.venueName,
            color: venueColorMap[venueKey],
            count: dateGroup.orders.length,
          });
        }
      }
    }

    return indicators;
  }, [calendarData, selectedVenueIds, venueColorMap]);

  // Orders for the selected date (respecting venue filter)
  const selectedDayOrders = useMemo(() => {
    if (!calendarData) return [];
    const orders: { order: CalendarOrderItem; venueName: string | null; venueId: string | null; color: string }[] = [];

    for (const venue of calendarData.venues) {
      const venueKey = venue.venueId ?? "no-venue";
      if (!selectedVenueIds.has(venueKey)) continue;

      for (const dateGroup of venue.dates) {
        if (dateGroup.date === selectedDate) {
          for (const order of dateGroup.orders) {
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

    // Sort by booking start time
    orders.sort((a, b) => {
      const aTime = a.order.bookingStartTime ?? "";
      const bTime = b.order.bookingStartTime ?? "";
      return aTime.localeCompare(bTime);
    });

    return orders;
  }, [calendarData, selectedDate, selectedVenueIds, venueColorMap]);

  // Venue filter helpers
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

  return (
    <div className="space-y-4">
      {/* Venue Filter Chips */}
      {calendarData && calendarData.venues.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venues</h3>
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
            {calendarData.venues.map((venue) => {
              const venueKey = venue.venueId ?? "no-venue";
              const color = venueColorMap[venueKey];
              const isActive = selectedVenueIds.has(venueKey);

              return (
                <button
                  key={venueKey}
                  onClick={() => toggleVenue(venueKey)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isActive
                      ? "border-transparent text-white"
                      : "border-gray-200 text-gray-400 bg-gray-50"
                  }`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.5)" : color }}
                  />
                  {venue.venueName ?? "No Venue"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main layout: calendar + orders */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar */}
        <div className="lg:w-[400px] lg:flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <CustomCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dateIndicators={dateIndicators}
          />
        </div>

        {/* Orders for selected day */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
            <h2 className="text-sm font-bold text-gray-900">
              {formattedSelectedDate}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedDayOrders.length} order{selectedDayOrders.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {selectedDayOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No orders</p>
                <p className="text-sm mt-1">No orders for this date.</p>
              </div>
            ) : (
              selectedDayOrders.map(({ order, venueName, color }) => (
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
                  className="w-full flex items-center gap-4 p-4 sm:px-6 sm:py-5 transition-colors text-left hover:bg-gray-50 cursor-pointer"
                >
                  {/* Venue color bar */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          statusBadgeColor[order.status] || "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, " ")}
                      </span>
                      {venueName && (
                        <span className="text-xs text-gray-400">{venueName}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {order.memberName || order.memberEmail}
                      </span>
                      {order.bookingReference && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5" />
                          {order.bookingReference}
                        </span>
                      )}
                      {order.roomLocationDetails && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {order.roomLocationDetails}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-sm">
                      {(order.bookingStartTime || order.bookingEndTime) && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(order.bookingStartTime)}
                          {order.bookingEndTime && ` - ${formatTime(order.bookingEndTime)}`}
                        </span>
                      )}
                      <span className="font-semibold text-gray-900">
                        £{order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
