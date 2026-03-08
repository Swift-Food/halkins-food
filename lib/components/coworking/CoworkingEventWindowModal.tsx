"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

type ModalStep = "dates" | "start-time" | "end-time" | "confirm";
type EditTarget = "start" | "end";

interface TimeSlot {
  value: string;
  label: string;
}

interface CoworkingEventWindowModalProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  minDate: string;
  maxDate: string;
  timeSlots: TimeSlot[];
  onClose: () => void;
  onApply: (values: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const START_OF_WEEK = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCompactDateTime(date: string, time: string) {
  if (!date) return "Not set";
  const formattedDate = toDate(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${formattedDate}, ${formatTimeLabel(time)}` : formattedDate;
}

function formatTimeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function parseTimeParts(value: string) {
  if (!value) {
    return { hour: "", minute: "00", period: "AM" as const };
  }

  const [rawHours, rawMinutes] = value.split(":").map(Number);
  const period = rawHours >= 12 ? "PM" : "AM";
  const hour12 = rawHours % 12 || 12;

  return {
    hour: String(hour12),
    minute: rawMinutes.toString().padStart(2, "0"),
    period,
  };
}

function build24HourTime(
  hour: string,
  minute: string,
  period: "AM" | "PM"
) {
  if (!hour) return "";

  const parsedHour = Number(hour);
  if (Number.isNaN(parsedHour) || parsedHour < 1 || parsedHour > 12) {
    return "";
  }

  let hours24 = parsedHour % 12;
  if (period === "PM") {
    hours24 += 12;
  }

  return `${String(hours24).padStart(2, "0")}:${minute}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isSameDay(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && startDate === endDate);
}

function buildCalendarDays(month: number, year: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlankDays = firstDay.getDay();

  const days = Array.from({ length: leadingBlankDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export default function CoworkingEventWindowModal({
  startDate,
  startTime,
  endDate,
  endTime,
  minDate,
  maxDate,
  timeSlots,
  onClose,
  onApply,
}: CoworkingEventWindowModalProps) {
  const hasCompleteInitialValues =
    Boolean(startDate) &&
    Boolean(endDate) &&
    Boolean(startTime) &&
    Boolean(endTime) &&
    (endDate > startDate ||
      (endDate === startDate && toMinutes(endTime) > toMinutes(startTime)));
  const initialDisplayDate = startDate || minDate;
  const initialDate = toDate(initialDisplayDate);

  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftStartTime, setDraftStartTime] = useState(startTime);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [draftEndTime, setDraftEndTime] = useState(endTime);
  const [draftStartTimeParts, setDraftStartTimeParts] = useState(() =>
    parseTimeParts(startTime)
  );
  const [draftEndTimeParts, setDraftEndTimeParts] = useState(() =>
    parseTimeParts(endTime)
  );
  const [step, setStep] = useState<ModalStep>(
    hasCompleteInitialValues ? "confirm" : "dates"
  );
  const [editTarget, setEditTarget] = useState<EditTarget>(
    hasCompleteInitialValues ? "end" : "start"
  );
  const [displayMonth, setDisplayMonth] = useState(initialDate.getMonth());
  const [displayYear, setDisplayYear] = useState(initialDate.getFullYear());
  const timeEntryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const min = toDate(minDate);
  const max = toDate(maxDate);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = min.getFullYear(); year <= max.getFullYear(); year += 1) {
      years.push(year);
    }
    return years;
  }, [max, min]);

  const calendarDays = useMemo(
    () => buildCalendarDays(displayMonth, displayYear),
    [displayMonth, displayYear]
  );

  const allowedEndTimes = useMemo(() => {
    if (!draftStartTime || !isSameDay(draftStartDate, draftEndDate)) {
      return timeSlots;
    }

    return timeSlots.filter((slot) => toMinutes(slot.value) > toMinutes(draftStartTime));
  }, [draftEndDate, draftStartDate, draftStartTime, timeSlots]);

  const isEditingEndTime = step === "end-time" || (step === "confirm" && editTarget === "end");
  const activeTimeOptions = isEditingEndTime ? allowedEndTimes : timeSlots;
  const activeTimeValues = activeTimeOptions.map((slot) => slot.value);

  const manualTimeParts =
    isEditingEndTime ? draftEndTimeParts : draftStartTimeParts;
  const selectedManualTime = build24HourTime(
    manualTimeParts.hour,
    manualTimeParts.minute,
    manualTimeParts.period
  );
  const isManualTimeComplete = Boolean(selectedManualTime);
  const isManualTimeAllowed =
    !selectedManualTime || activeTimeValues.includes(selectedManualTime);

  const invalidTimeMessage =
    !isEditingEndTime
      ? "Start time must be between 7:00 AM and 10:00 PM."
      : isSameDay(draftStartDate, draftEndDate) && draftStartTime
        ? `End time must be later than ${formatTimeLabel(draftStartTime)} on the same day.`
        : "End time must be between 7:00 AM and 10:00 PM.";

  useEffect(() => {
    if (step === "dates" || step === "confirm" || typeof window === "undefined" || window.innerWidth >= 1024) {
      return;
    }

    window.setTimeout(() => {
      timeEntryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, [step]);

  const canApply =
    Boolean(draftStartDate) &&
    Boolean(draftEndDate) &&
    Boolean(draftStartTime) &&
    Boolean(draftEndTime) &&
    (draftEndDate > draftStartDate ||
      (draftEndDate === draftStartDate &&
        toMinutes(draftEndTime) > toMinutes(draftStartTime)));
  const hasInitialDateRange = Boolean(draftStartDate && draftEndDate);

  const moveMonth = (direction: -1 | 1) => {
    const next = new Date(displayYear, displayMonth + direction, 1);
    if (next < new Date(min.getFullYear(), min.getMonth(), 1)) return;
    if (next > new Date(max.getFullYear(), max.getMonth(), 1)) return;
    setDisplayMonth(next.getMonth());
    setDisplayYear(next.getFullYear());
  };

  const handleDateClick = (value: string) => {
    if (!draftStartDate) {
      setDraftStartDate(value);
      setDraftStartTime("");
      setDraftEndDate("");
      setDraftEndTime("");
      setDraftStartTimeParts(parseTimeParts(""));
      setDraftEndTimeParts(parseTimeParts(""));
      setEditTarget("end");
      return;
    }

    if (!draftEndDate && editTarget === "end") {
      if (value < draftStartDate) {
        setDraftStartDate(value);
        setDraftStartTime("");
        setDraftStartTimeParts(parseTimeParts(""));
        return;
      }

      setDraftEndDate(value);
      setDraftEndTime("");
      setDraftEndTimeParts(parseTimeParts(""));
      setStep(draftStartTime ? "end-time" : "start-time");
      return;
    }

    if (editTarget === "start") {
      setDraftStartDate(value);
      if (draftEndDate && draftEndDate < value) {
        setDraftEndDate(value);
        setDraftEndTime("");
        setDraftEndTimeParts(parseTimeParts(""));
      }
      setStep("dates");
      return;
    }

    if (!draftStartDate || value < draftStartDate) {
      return;
    }

    setDraftEndDate(value);
    if (
      draftStartTime &&
      value === draftStartDate &&
      draftEndTime &&
      toMinutes(draftEndTime) <= toMinutes(draftStartTime)
    ) {
      setDraftEndTime("");
      setDraftEndTimeParts(parseTimeParts(""));
    }
    setStep(draftStartTime ? "end-time" : "start-time");
  };

  const handleManualTimeChange = ({
    hour = manualTimeParts.hour,
    minute = manualTimeParts.minute,
    period = manualTimeParts.period,
  }: {
    hour?: string;
    minute?: string;
    period?: "AM" | "PM";
  }) => {
    const nextParts = { hour, minute, period };
    if (isEditingEndTime) {
      setDraftEndTimeParts(nextParts);
    } else {
      setDraftStartTimeParts(nextParts);
    }

    const nextTime = build24HourTime(hour, minute, period);

    if (!nextTime) {
      if (isEditingEndTime) {
        setDraftEndTime("");
      } else {
        setDraftStartTime("");
      }
      return;
    }

    if (!activeTimeOptions.some((slot) => slot.value === nextTime)) {
      if (isEditingEndTime) {
        setDraftEndTime("");
      } else {
        setDraftStartTime("");
      }
      return;
    }

    if (isEditingEndTime) {
      setDraftEndTime(nextTime);
      setStep("confirm");
      return;
    }

    if (
      draftEndDate &&
      isSameDay(draftStartDate, draftEndDate) &&
      draftEndTime &&
      toMinutes(draftEndTime) <= toMinutes(nextTime)
    ) {
      setDraftEndTime("");
      setDraftEndTimeParts(parseTimeParts(""));
    }
    setDraftStartTime(nextTime);
    if (draftEndTime) {
      setStep("confirm");
    }
  };

  const stepLabel =
    step === "dates"
      ? "Step 1"
      : step === "start-time"
        ? "Step 2"
        : step === "end-time"
          ? "Step 3"
          : "Step 4";

  const stepTitle =
    step === "dates"
      ? `Choose your ${editTarget} date`
      : step === "start-time"
        ? "Choose a start time"
        : step === "end-time"
          ? "Choose an end time"
          : "Confirm details";

  const stepDescription =
    step === "dates"
      ? editTarget === "start"
        ? "Pick the event start date."
        : "Pick the event end date. It must be on or after the start date."
      : step === "confirm"
        ? "Review your event window, or tap Start or End below to adjust it."
        : "Use the controls below to set the exact time.";

  const renderTimeEditor = () => (
    <>
      {step !== "dates" && (
        <div
          ref={timeEntryRef}
          className="mt-5 space-y-4 sm:mt-6 sm:space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Exact time
            </label>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3">
              <select
                value={manualTimeParts.hour}
                onChange={(e) => handleManualTimeChange({ hour: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Hour</option>
                {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>

              <select
                value={manualTimeParts.minute}
                onChange={(e) => handleManualTimeChange({ minute: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {["00", "15", "30", "45"].map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                {(["AM", "PM"] as const).map((period) => {
                  const isActive = manualTimeParts.period === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => handleManualTimeChange({ period })}
                      className={`rounded-[0.9rem] px-3 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
            {isManualTimeComplete && !isManualTimeAllowed && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Invalid time</p>
                <p className="mt-1">{invalidTimeMessage}</p>
              </div>
            )}
          </div>

          {step === "start-time" && !draftEndTime && (
            <button
              type="button"
              onClick={() => {
                setEditTarget("end");
                setStep("end-time");
              }}
              disabled={!draftStartTime || !isManualTimeAllowed}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to End Time
            </button>
          )}
        </div>
      )}
    </>
  );

  const renderEditControls = () => (
    <div className="mt-1 lg:mt-6">
      {hasInitialDateRange && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Tap To Edit
          </p>
          <p className="text-xs font-medium text-primary">
            Change date or time
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <button
          type="button"
          onClick={() => {
            setEditTarget("start");
            setStep(canApply ? "confirm" : "start-time");
          }}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all sm:gap-4 sm:py-3 ${
            editTarget === "start" && !isEditingEndTime
              ? "border-primary/30 bg-primary/5"
              : "border-slate-200/80 hover:border-primary/30 hover:bg-slate-50"
          }`}
          disabled={!hasInitialDateRange}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px] sm:tracking-[0.22em]">
              Start
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-900 sm:mt-1 sm:text-sm">
              {formatCompactDateTime(draftStartDate, draftStartTime)}
            </p>
          </div>
          <div
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex ${
              editTarget === "start" && !isEditingEndTime
                ? "bg-primary text-white"
                : "bg-primary/10 text-primary"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setEditTarget("end");
            setStep(canApply ? "confirm" : "end-time");
          }}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all sm:gap-4 sm:py-3 ${
            isEditingEndTime
              ? "border-primary/30 bg-primary/5"
              : "border-slate-200/80 hover:border-primary/30 hover:bg-slate-50"
          }`}
          disabled={!hasInitialDateRange}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px] sm:tracking-[0.22em]">
              End
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-900 sm:mt-1 sm:text-sm">
              {formatCompactDateTime(draftEndDate, draftEndTime)}
            </p>
          </div>
          <div
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex ${
              isEditingEndTime
                ? "bg-primary text-white"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Clock3 className="h-5 w-5" />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[1.5rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 sm:px-8">
          <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Event Window
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
                Select dates and times
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:px-4"
            >
              Close
            </button>
          </div>
          <div className="mt-2 pb-1 lg:hidden">
            {renderEditControls()}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-slate-200/80 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <select
                  value={displayMonth}
                  onChange={(e) => setDisplayMonth(Number(e.target.value))}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:px-4 sm:py-2.5"
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={displayYear}
                  onChange={(e) => setDisplayYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:px-4 sm:py-2.5"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-y-2 text-center sm:mt-6 sm:gap-y-3">
              {START_OF_WEEK.map((day) => (
                <div key={day} className="text-[11px] font-semibold tracking-wide text-slate-400 sm:text-xs">
                  {day}
                </div>
              ))}

              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`blank-${index}`} className="h-10 sm:h-12" />;
                }

                const value = toLocalDateValue(day);
                const isDisabled = day < min || day > max;
                const isStart = value === draftStartDate;
                const isEnd = value === draftEndDate;
                const isSingleDayRange =
                  Boolean(draftStartDate) &&
                  Boolean(draftEndDate) &&
                  draftStartDate === draftEndDate &&
                  value === draftStartDate;
                const isRowStart = index % 7 === 0 || calendarDays[index - 1] === null;
                const isRowEnd =
                  index % 7 === 6 || calendarDays[index + 1] === null;
                const isInRange =
                  Boolean(draftStartDate) &&
                  Boolean(draftEndDate) &&
                  value > draftStartDate &&
                  value < draftEndDate;
                const hasRangeBackground =
                  isInRange ||
                  (isSingleDayRange && false) ||
                  (isStart && Boolean(draftEndDate) && draftEndDate > draftStartDate) ||
                  (isEnd && Boolean(draftStartDate) && draftEndDate > draftStartDate);

                return (
                  <div key={value} className="relative flex h-10 items-center justify-center sm:h-12">
                    {hasRangeBackground && (
                      <div
                        className={`absolute top-1/2 h-8 -translate-y-1/2 bg-primary/12 sm:h-9 ${
                          isSingleDayRange || isInRange
                            ? "inset-x-0"
                            : isStart
                              ? "left-[35%] right-0"
                              : "left-0 right-[35%]"
                        } ${
                          isSingleDayRange
                            ? "rounded-full"
                            : isInRange
                              ? `${isRowStart ? "rounded-l-full" : ""} ${isRowEnd ? "rounded-r-full" : ""}`
                              : isStart
                                ? `${isRowEnd ? "rounded-full" : "rounded-l-full"}`
                                : `${isRowStart ? "rounded-full" : "rounded-r-full"}`
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDateClick(value)}
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all sm:h-9 sm:w-9 ${
                        isStart || isEnd
                          ? "bg-primary text-white"
                          : isDisabled
                            ? "cursor-not-allowed text-slate-300"
                            : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="hidden p-4 sm:p-6 lg:block lg:p-8">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-4 sm:rounded-[1.75rem] sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {stepLabel}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">
                {stepTitle}
              </h4>
              <p className="mt-2 text-sm text-slate-500 sm:mt-3">
                {stepDescription}
              </p>
              {renderTimeEditor()}
              {renderEditControls()}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  onApply({
                    startDate: draftStartDate,
                    startTime: draftStartTime,
                    endDate: draftEndDate,
                    endTime: draftEndTime,
                  })
                }
                disabled={!canApply}
                className="flex-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply Event Window
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/80 px-4 py-3 lg:hidden">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {stepLabel}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-slate-900">
                {stepTitle}
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                {stepDescription}
              </p>
              {renderTimeEditor()}
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onApply({
                      startDate: draftStartDate,
                      startTime: draftStartTime,
                      endDate: draftEndDate,
                      endTime: draftEndTime,
                    })
                  }
                  disabled={!canApply}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply Event Window
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
