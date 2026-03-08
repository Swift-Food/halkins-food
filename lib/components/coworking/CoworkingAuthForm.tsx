"use client";

import { useState } from "react";
import Image from "next/image";
import { useCoworking } from "@/context/CoworkingContext";
import { coworkingService } from "@/services/api/coworking.api";
import { Mail, Building2, Calendar, Pencil, MapPin, Users, CheckCircle2 } from "lucide-react";
import { COWORKING_VENUES, CoworkingVenue } from "@/types/api";
import CoworkingEventWindowModal from "./CoworkingEventWindowModal";

interface CoworkingAuthFormProps {
  spaceSlug: string;
}

function generateTimeSlots() {
  const slots: { value: string; label: string }[] = [];
  for (let h = 7; h <= 22; h++) {
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

const TIME_SLOTS = generateTimeSlots();
const INPUT_BASE_CLASS =
  "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3.5 text-base text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm";

function getMinDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getMaxDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

export default function CoworkingAuthForm({
  spaceSlug,
}: CoworkingAuthFormProps) {
  const { setSession, spaceInfo, setVenueSelection } = useCoworking();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<CoworkingVenue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEventWindowModalOpen, setIsEventWindowModalOpen] = useState(false);

  const isFormValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    startDate !== "" &&
    startTime !== "" &&
    endDate !== "" &&
    endTime !== "" &&
    (endDate > startDate || endTime > startTime) &&
    selectedVenue !== null;

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Company name must be between 2 and 100 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select a start and end date.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Please select both a start and end time.");
      return;
    }

    if (endDate < startDate || (endDate === startDate && endTime <= startTime)) {
      setError("End must be after start.");
      return;
    }

    if (!selectedVenue) {
      setError("Please select a venue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await coworkingService.startSession(spaceSlug, {
        email: trimmedEmail,
        name: trimmedName,
      });

      setVenueSelection(selectedVenue, startDate, startTime, endDate, endTime);

      setSession({
        member: {
          email: result.email,
          name: result.name,
          memberId: "",
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatEventDateTime = (date: string, time: string) => {
    if (!date) return "Not set";
    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (!time) return formattedDate;
    return `${formattedDate}, ${TIME_SLOTS.find((slot) => slot.value === time)?.label || time}`;
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f4f6_42%,#eef2f7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 px-1">
          <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Powered by Swift
          </div>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Book your event
            </h2>
            {spaceInfo && (
              <p className="mt-3 text-sm font-medium text-slate-500">
                Ordering for {spaceInfo.name}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 backdrop-blur">
            <div className="grid gap-0 lg:grid-cols-[1fr_1.15fr]">
              {/* Section: Your Details */}
              <div className="relative p-6 sm:p-8">
                <div className="absolute bottom-0 left-6 right-6 h-px bg-slate-200/80 sm:left-8 sm:right-8 lg:hidden" />
                <div className="absolute bottom-8 right-0 top-8 hidden w-px bg-slate-200/80 lg:block" />
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Your Details
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Where should we send your order access?
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="coworking-name">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="coworking-name"
                        type="text"
                        placeholder="Enter your company name"
                        className={`${INPUT_BASE_CLASS} pl-11`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        minLength={2}
                        maxLength={100}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="coworking-email">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="coworking-email"
                        type="email"
                        placeholder="you@example.com"
                        className={`${INPUT_BASE_CLASS} pl-11`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Event Details */}
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Event Details
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Set your event window
                  </h3>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
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
                              {formatEventDateTime(startDate, startTime)}
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
                              {formatEventDateTime(endDate, endTime)}
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

          {/* Section: Choose Venue */}
          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 backdrop-blur sm:p-8">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Choose a Venue
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Pick the space that fits your event
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select your preferred venue before continuing to the menu.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COWORKING_VENUES.map((venue) => {
                const isSelected = selectedVenue?.id === venue.id;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => setSelectedVenue(venue)}
                    disabled={isSubmitting}
                    className={`relative flex h-full flex-col rounded-[1.6rem] overflow-hidden text-left transition-all shadow-sm group ${
                      isSelected
                        ? "border-primary/30 bg-white ring-2 ring-primary/80 shadow-[0_18px_40px_rgba(236,72,153,0.14)]"
                        : "border border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)]"
                    }`}
                  >
                    {/* Image */}
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
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                      )}

                      {/* Selected badge */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex min-h-[92px] flex-1 flex-col bg-white p-4">
                      <p className="text-base font-semibold text-slate-900">{venue.name}</p>
                      <div className="mt-2 flex items-start gap-3">
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          Up to {venue.maxCapacity} guests
                        </span>
                        <span className="flex items-start gap-1 text-xs font-medium text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {venue.addressLine1}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Setting up your order...
              </span>
            ) : (
              "Continue to Menu"
            )}
          </button>
        </form>

        {isEventWindowModalOpen && (
          <CoworkingEventWindowModal
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            minDate={getMinDate()}
            maxDate={getMaxDate()}
            timeSlots={TIME_SLOTS}
            onClose={() => setIsEventWindowModalOpen(false)}
            onApply={({ startDate: nextStartDate, startTime: nextStartTime, endDate: nextEndDate, endTime: nextEndTime }) => {
              setStartDate(nextStartDate);
              setStartTime(nextStartTime);
              setEndDate(nextEndDate);
              setEndTime(nextEndTime);
              setIsEventWindowModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
