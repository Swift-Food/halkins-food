"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useCoworking } from "@/context/CoworkingContext";
import { coworkingService } from "@/services/api/coworking.api";
import { CoworkingVenue } from "@/types/api";
import CoworkingBookingDetailsForm, {
  isCoworkingBookingWindowValid,
} from "./CoworkingBookingDetailsForm";

interface CoworkingAuthFormProps {
  spaceSlug: string;
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
  const [venues, setVenues] = useState<CoworkingVenue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("space info is", JSON.stringify(spaceInfo))
    if (!spaceInfo?.id) return;
    coworkingService.getVenues(spaceInfo.id).then(setVenues).catch(() => {});
  }, [spaceInfo?.id]);


  const isFormValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    isCoworkingBookingWindowValid({
      startDate,
      startTime,
      endDate,
      endTime,
    }) &&
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

        <form onSubmit={handleSubmit}>
          <CoworkingBookingDetailsForm
            name={name}
            email={email}
            venues={venues}
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            selectedVenue={selectedVenue}
            isSubmitting={isSubmitting}
            error={error}
            submitLabel={
              isSubmitting ? "Setting up your order..." : "Continue to Menu"
            }
            submitDisabled={!isFormValid}
            onNameChange={setName}
            onEmailChange={setEmail}
            onVenueChange={setSelectedVenue}
            onEventWindowApply={({ startDate, startTime, endDate, endTime }) => {
              setStartDate(startDate);
              setStartTime(startTime);
              setEndDate(endDate);
              setEndTime(endTime);
            }}
          />
        </form>
      </div>
    </div>
  );
}
