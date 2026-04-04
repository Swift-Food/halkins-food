"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Clock, MapPin } from "lucide-react";
import { CalendarOrderItem } from "@/types/api";

interface OrderEntry {
  order: CalendarOrderItem;
  venueName: string | null;
  venueId: string | null;
  color: string;
}

interface GridCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  ordersByDate: Record<string, OrderEntry[]>;
  priceView: "total" | "venue_hire";
  onOrderSelect: (orderId: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTodayKey(): string {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  if (status === "pending_review" && adminReviewStatus === "approved") return "admin_reviewed";
  if (status === "approved" || status === "rejected" || status === "deposit_paid") return adminReviewStatus;
  return status;
}

function formatStatus(status: string, adminReviewStatus: string): string {
  const displayStatus = getDisplayStatus(status, adminReviewStatus);
  if (displayStatus === "approved") return "Approved";
  if (displayStatus === "rejected") return "Rejected";
  if (displayStatus === "deposit_paid") return "Deposit Paid";
  return (
    statusLabel[displayStatus] ||
    displayStatus.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export default function GridCalendar({
  selectedDate,
  onDateSelect,
  ordersByDate,
  priceView,
  onOrderSelect,
}: GridCalendarProps) {
  const todayKey = getTodayKey();
  const today = new Date();

  const [viewYear, setViewYear] = useState(() =>
    selectedDate ? parseInt(selectedDate.split("-")[0], 10) : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? parseInt(selectedDate.split("-")[1], 10) - 1 : today.getMonth()
  );
  const [showPicker, setShowPicker] = useState(false);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: { day: number; inMonth: boolean; key: string }[] = [];

    for (let i = 0; i < startDow; i++) {
      cells.push({ day: 0, inMonth: false, key: `blank-${i}` });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ day: d, inMonth: true, key: dateKey(viewYear, viewMonth, d) });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = `${MONTHS[viewMonth]} ${viewYear}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
  };

  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    onDateSelect(todayKey);
  };

  const handleMonthYearSelect = (month: number, year: number) => {
    setViewMonth(month);
    setViewYear(year);
    setShowPicker(false);
  };

  const isViewingCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const isSelectedToday = selectedDate === todayKey;

  const pickerYears = useMemo(() => {
    const current = today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 1 + i);
  }, []);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-base-200/50 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-primary transition-colors"
          >
            {monthLabel}
            <ChevronDown size={16} className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>

          {showPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-base-200 p-3 z-20 w-64">
              <div className="flex gap-1 overflow-x-auto mb-2 pb-1">
                {pickerYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setViewYear(y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      viewYear === y ? "bg-primary text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => handleMonthYearSelect(i, viewYear)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMonth === i ? "bg-primary/10 text-primary font-semibold" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-base-200/50 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400 py-2 border-b border-base-200"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 border-l border-t border-base-200">
        {calendarDays.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.key} className="border-r border-b border-base-200 min-h-28 bg-base-50/30" />;
          }

          const orders = ordersByDate[cell.key] ?? [];
          const isToday = cell.key === todayKey;

          return (
            <div
              key={cell.key}
              className="border-r border-b border-base-200 min-h-28 p-1.5"
            >
              {/* Day number */}
              <div className="flex justify-end mb-1.5">
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? "bg-primary text-white" : "text-gray-700"
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              {/* Event cards */}
              <div className="space-y-1">
                {orders.map(({ order, venueName, color }) => {
                  const price = priceView === "total" ? order.total : order.venueHireFee;
                  const displayStatus = getDisplayStatus(order.status, order.adminReviewStatus);

                  return (
                    <div
                      key={order.id}
                      onClick={(e) => { e.stopPropagation(); onOrderSelect(order.id); }}
                      className="flex items-start gap-1.5 px-1 py-0.5 rounded hover:bg-base-200/50 cursor-pointer transition-colors"
                    >
                      {/* Venue color bar */}
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {order.memberName || order.memberEmail}
                        </p>
                        <span className="text-xs font-bold text-primary">
                          £{price.toFixed(2)}
                        </span>

                        {/* Status + venue */}
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              statusBadgeColor[displayStatus] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {formatStatus(order.status, order.adminReviewStatus)}
                          </span>
                          {venueName && (
                            <span className="text-[10px] text-gray-400 font-medium truncate">{venueName}</span>
                          )}
                        </div>

                        {/* Time + location */}
                        {(order.bookingStartTime || order.roomLocationDetails) && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-gray-500">
                            {order.bookingStartTime && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(order.bookingStartTime)}
                                {order.bookingEndTime && ` – ${formatTime(order.bookingEndTime)}`}
                              </span>
                            )}
                            {order.roomLocationDetails && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {order.roomLocationDetails}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today button */}
      <div className="h-7">
        {(!isViewingCurrentMonth || !isSelectedToday) && (
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <RotateCcw size={12} />
            Back to today
          </button>
        )}
      </div>
    </div>
  );
}
