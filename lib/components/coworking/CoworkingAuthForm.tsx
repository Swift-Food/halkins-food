"use client";

import { useState } from "react";
import Image from "next/image";
import { useCoworking } from "@/context/CoworkingContext";
import { coworkingService } from "@/services/api/coworking.api";
import { Mail, Building2, Calendar, Clock, MapPin, Users, CheckCircle2 } from "lucide-react";
import { COWORKING_VENUES, CoworkingVenue } from "@/types/api";

interface CoworkingAuthFormProps {
  spaceSlug: string;
}

function generateTimeSlots() {
  const slots: { value: string; label: string }[] = [];
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      const hh = String(h).padStart(2, "0");
      const mm = m === 0 ? "00" : "30";
      const period = h < 12 ? "AM" : "PM";
      const h12 = h % 12 || 12;
      slots.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

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
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<CoworkingVenue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endTimeOptions = startTime
    ? TIME_SLOTS.filter((s) => s.value > startTime)
    : TIME_SLOTS;

  const isFormValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    eventDate !== "" &&
    startTime !== "" &&
    endTime !== "" &&
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

    if (!eventDate) {
      setError("Please select an event date.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Please select both a start and end time.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be after start time.");
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

      setVenueSelection(selectedVenue, eventDate, startTime, endTime);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Book your event</h2>
          {spaceInfo && (
            <p className="text-gray-500 mt-2 text-sm">
              Powered by Swift · {spaceInfo.name}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Your Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Your Details
            </p>
            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="coworking-name">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="coworking-name"
                    type="text"
                    placeholder="Enter your company name"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="coworking-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="coworking-email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Event Details
            </p>
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Event Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={getMinDate()}
                    max={getMaxDate()}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white appearance-none"
                    style={{ WebkitAppearance: "none" }}
                    required
                  />
                </div>
              </div>

              {/* Start + End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (endTime && endTime <= e.target.value) setEndTime("");
                      }}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors"
                      required
                    >
                      <option value="">Select</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isSubmitting || !startTime}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select</option>
                      {endTimeOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Choose Venue */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Choose a Venue
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COWORKING_VENUES.map((venue) => {
                const isSelected = selectedVenue?.id === venue.id;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => setSelectedVenue(venue)}
                    disabled={isSubmitting}
                    className={`relative rounded-2xl overflow-hidden text-left transition-all shadow-sm group ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2"
                        : "ring-1 ring-gray-200 hover:ring-primary/50 hover:shadow-md"
                    }`}
                  >
                    {/* Image */}
                    <div className="relative h-60 w-full bg-gray-200">
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
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                      {/* Selected badge */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="bg-white p-4">
                      <p className="font-semibold text-gray-900 text-sm">{venue.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          Up to {venue.maxCapacity} guests
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
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
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all bg-primary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
      </div>
    </div>
  );
}
