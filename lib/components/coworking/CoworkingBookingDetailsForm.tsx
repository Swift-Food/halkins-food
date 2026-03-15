"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  Pencil,
  Users,
} from "lucide-react";
import {  CoworkingVenue } from "@/types/api";
import CoworkingEventWindowModal from "./CoworkingEventWindowModal";

interface TimeSlot {
  value: string;
  label: string;
}

interface EventWindowValues {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface CoworkingBookingDetailsFormProps extends EventWindowValues {
  name: string;
  email: string;
  venues: CoworkingVenue[];
  selectedVenue: CoworkingVenue | null;
  isSubmitting?: boolean;
  error?: string | null;
  submitLabel: string;
  submitDisabled: boolean;
  submitButtonType?: "button" | "submit";
  onSubmit?: () => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onVenueChange: (venue: CoworkingVenue) => void;
  onEventWindowApply: (values: EventWindowValues) => void;
}

export function generateCoworkingTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = 7; h <= 22; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const period = h < 12 ? "AM" : "PM";
      const h12 = h % 12 || 12;
      slots.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` });
    }
  }

  return slots;
}

export const COWORKING_TIME_SLOTS = generateCoworkingTimeSlots();

export function getCoworkingMinDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCoworkingMaxDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

export function formatCoworkingEventDateTime(date: string, time: string) {
  if (!date) return "Not set";

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  if (!time) return formattedDate;

  return `${formattedDate}, ${
    COWORKING_TIME_SLOTS.find((slot) => slot.value === time)?.label || time
  }`;
}

function formatAttendanceTag(tag: string) {
  return tag
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function isCoworkingBookingWindowValid(values: EventWindowValues) {
  const { startDate, startTime, endDate, endTime } = values;

  return (
    startDate !== "" &&
    startTime !== "" &&
    endDate !== "" &&
    endTime !== "" &&
    (endDate > startDate || (endDate === startDate && endTime > startTime))
  );
}

export const COWORKING_INPUT_BASE_CLASS =
  "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3.5 text-base text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm";

const COWORKING_SECTION_HEADER_CLASS =
  "inline-flex rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white";

export default function CoworkingBookingDetailsForm({
  name,
  email,
  venues,
  startDate,
  startTime,
  endDate,
  endTime,
  selectedVenue,
  isSubmitting = false,
  error = null,
  submitLabel,
  submitDisabled,
  submitButtonType = "submit",
  onSubmit,
  onNameChange,
  onEmailChange,
  onVenueChange,
  onEventWindowApply,
}: CoworkingBookingDetailsFormProps) {
  const [isEventWindowModalOpen, setIsEventWindowModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-8 sm:space-y-6">
        <div className="overflow-hidden sm:rounded-[2rem] sm:border sm:border-white/70 sm:bg-white/75 sm:backdrop-blur">
          <div className="space-y-8 lg:grid lg:gap-0 lg:space-y-0 lg:grid-cols-[1fr_1.15fr]">
            <div className="relative sm:px-8 sm:pb-8 sm:pt-5">
              <div className="absolute bottom-8 right-0 top-8 hidden w-px bg-slate-200/80 lg:block" />
              <div className="mb-5 sm:mb-6">
                <p className={COWORKING_SECTION_HEADER_CLASS}>Your Details</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-700"
                    htmlFor="coworking-name"
                  >
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="coworking-name"
                      type="text"
                      placeholder="Enter your company name"
                      className={`${COWORKING_INPUT_BASE_CLASS} pl-11`}
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                      disabled={isSubmitting}
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-700"
                    htmlFor="coworking-email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="coworking-email"
                      type="email"
                      placeholder="you@example.com"
                      className={`${COWORKING_INPUT_BASE_CLASS} pl-11`}
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:px-8 sm:pb-8 sm:pt-5">
              <div className="mb-5 sm:mb-6">
                <p className={COWORKING_SECTION_HEADER_CLASS}>Event Details</p>
              </div>

              <div
                id="coworking-event-window"
                className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                      Event Window
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Start
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {formatCoworkingEventDateTime(startDate, startTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            End
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {formatCoworkingEventDateTime(endDate, endTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEventWindowModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="coworking-venue-section"
          className="sm:rounded-[2rem] sm:border sm:border-white/70 sm:bg-white/75 sm:p-8 sm:backdrop-blur"
        >
          <div className="mb-5">
            <p className={COWORKING_SECTION_HEADER_CLASS}>Choose a Venue</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Pick the space that fits your event
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Select your preferred venue before continuing to the menu.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {venues.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;
              const formattedAttendanceTags =
                venue.attendanceTags
                  ?.filter((tag): tag is string => Boolean(tag))
                  .map(formatAttendanceTag) ?? [];

              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => onVenueChange(venue)}
                  disabled={isSubmitting}
                  className={`relative flex h-full flex-col overflow-hidden rounded-[1.6rem] text-left transition-all group ${
                    isSelected
                      ? "border-primary/30 bg-white ring-2 ring-primary/80"
                      : "border border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-primary/40"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                    {venue.image ? (
                      <Image
                        src={venue.image}
                        alt={venue.name}
                        fill
                        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                          isSelected ? "scale-105" : ""
                        }`}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    )}

                    {(isSelected || formattedAttendanceTags.length > 0) && (
                      <div className="absolute right-3 top-3 flex max-w-[75%] flex-wrap justify-end gap-2">
                        {formattedAttendanceTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-primary/25 bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm"
                          >
                            {tag}
                          </span>
                        ))}
                        {isSelected && formattedAttendanceTags.length === 0 && (
                          <CheckCircle2 className="h-6 w-6 text-white drop-shadow" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-[92px] flex-1 flex-col bg-white p-4">
                    <p className="text-base font-semibold text-slate-900">
                      {venue.name}
                    </p>
                    <div className="mt-2 flex items-start gap-3">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        Up to {venue.capacity} guests
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <button
          type={submitButtonType}
          onClick={submitButtonType === "button" ? onSubmit : undefined}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={submitDisabled || isSubmitting}
        >
          {submitLabel}
        </button>
      </div>

      {isEventWindowModalOpen && (
        <CoworkingEventWindowModal
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          endTime={endTime}
          minDate={getCoworkingMinDate()}
          maxDate={getCoworkingMaxDate()}
          timeSlots={COWORKING_TIME_SLOTS}
          onClose={() => setIsEventWindowModalOpen(false)}
          onApply={(values) => {
            onEventWindowApply(values);
            setIsEventWindowModalOpen(false);
          }}
        />
      )}
    </>
  );
}
