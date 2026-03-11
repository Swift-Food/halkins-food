"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from "lucide-react";

interface VenueIndicator {
  venueId: string | null;
  venueName: string | null;
  color: string;
  count: number;
}

interface CustomCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  dateIndicators: Record<string, VenueIndicator[]>; // key: YYYY-MM-DD
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

export default function CustomCalendar({
  selectedDate,
  onDateSelect,
  dateIndicators,
}: CustomCalendarProps) {
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
      cells.push({
        day: d,
        inMonth: true,
        key: dateKey(viewYear, viewMonth, d),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = `${MONTHS[viewMonth]} ${viewYear}`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
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

  const isViewingCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const isSelectedToday = selectedDate === todayKey;

  // Year range for picker
  const pickerYears = useMemo(() => {
    const current = today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 1 + i);
  }, []);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 text-sm font-bold hover:text-primary transition-colors"
          >
            {monthLabel}
            <ChevronDown size={14} className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>

          {showPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-20 w-64">
              {/* Year tabs */}
              <div className="flex gap-1 overflow-x-auto mb-2 pb-1">
                {pickerYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setViewYear(y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      viewYear === y
                        ? "bg-primary text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => handleMonthYearSelect(i, viewYear)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMonth === i
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-gray-50 text-gray-700"
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
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:text-primary transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Today button */}
      {(!isViewingCurrentMonth || !isSelectedToday) && (
        <button
          onClick={goToToday}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <RotateCcw size={12} />
          Back to today
        </button>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-400 py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.key} />;
          }

          const indicators = dateIndicators[cell.key] ?? [];
          const hasEvents = indicators.length > 0;
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;

          return (
            <button
              key={cell.key}
              onClick={() => onDateSelect(cell.key)}
              className={`relative flex flex-col items-center justify-center py-2 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "ring-1 ring-primary/40"
                    : ""
              } ${hasEvents && !isSelected ? "hover:bg-primary/10" : "hover:bg-gray-50"}`}
            >
              {cell.day}
              {hasEvents && (
                <span className="flex gap-0.5 mt-0.5">
                  {indicators.map((ind, j) => (
                    <span
                      key={j}
                      className="flex items-center justify-center rounded-full min-w-[14px] h-[14px] px-0.5"
                      style={{
                        backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : ind.color,
                      }}
                    >
                      <span className="text-[8px] font-bold leading-none text-white">
                        {ind.count}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
