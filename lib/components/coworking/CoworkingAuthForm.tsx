"use client";

import { useState, useEffect } from "react";
import { useCoworking } from "@/context/CoworkingContext";
import { useCatering } from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import { CoworkingVenue } from "@/types/api";
import CoworkingBookingDetailsForm from "./CoworkingBookingDetailsForm";

interface CoworkingAuthFormProps {
  spaceSlug: string;
  submitLabel?: string;
  onSuccess?: () => void;
}

export default function CoworkingAuthForm({
  spaceSlug,
  submitLabel,
  onSuccess,
}: CoworkingAuthFormProps) {
  const { contactInfo, setContactInfo } = useCatering();
  const {
    isAuthenticated,
    member,
    spaceInfo,
    selectedVenue: persistedVenue,
    eventStartDate: persistedStartDate,
    eventStartTime: persistedStartTime,
    eventEndDate: persistedEndDate,
    eventEndTime: persistedEndTime,
    setSession,
    setVenueSelection,
  } = useCoworking();

  const [email, setEmail] = useState(member?.email ?? "");
  const [name, setName] = useState(member?.name ?? "");
  const [startDate, setStartDate] = useState(persistedStartDate);
  const [startTime, setStartTime] = useState(persistedStartTime);
  const [endDate, setEndDate] = useState(persistedEndDate);
  const [endTime, setEndTime] = useState(persistedEndTime);
  const [selectedVenue, setSelectedVenue] = useState<CoworkingVenue | null>(
    persistedVenue
  );
  const [venues, setVenues] = useState<CoworkingVenue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceInfo?.id) return;
    coworkingService.getVenues(spaceInfo.id).then(setVenues).catch(() => {});
  }, [spaceInfo?.id]);

  useEffect(() => {
    if (member?.email) {
      setEmail((current) => current || member.email);
    }
    if (member?.name) {
      setName((current) => current || member.name);
    }
  }, [member]);

  useEffect(() => {
    if (persistedVenue) {
      setSelectedVenue((current) => current ?? persistedVenue);
    }
    if (persistedStartDate) {
      setStartDate((current) => current || persistedStartDate);
    }
    if (persistedStartTime) {
      setStartTime((current) => current || persistedStartTime);
    }
    if (persistedEndDate) {
      setEndDate((current) => current || persistedEndDate);
    }
    if (persistedEndTime) {
      setEndTime((current) => current || persistedEndTime);
    }
  }, [
    persistedVenue,
    persistedStartDate,
    persistedStartTime,
    persistedEndDate,
    persistedEndTime,
  ]);

  const showValidationError = (
    message: string,
    targetId?: string,
    scrollTargetId?: string
  ) => {
    setError(message);
    window.alert(message);

    const target =
      (targetId ? document.getElementById(targetId) : null) ??
      (scrollTargetId ? document.getElementById(scrollTargetId) : null);

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.requestAnimationFrame(() => {
        if ("focus" in target) {
          target.focus();
        }
      });
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      showValidationError(
        "Company name must be between 2 and 100 characters.",
        "coworking-name"
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showValidationError(
        "Please enter a valid email address.",
        "coworking-email"
      );
      return;
    }

    if (!startDate || !endDate) {
      showValidationError(
        "Please select a start and end date.",
        undefined,
        "coworking-event-window"
      );
      return;
    }

    if (!startTime || !endTime) {
      showValidationError(
        "Please select both a start and end time.",
        undefined,
        "coworking-event-window"
      );
      return;
    }

    if (endDate < startDate || (endDate === startDate && endTime <= startTime)) {
      showValidationError(
        "End must be after start.",
        undefined,
        "coworking-event-window"
      );
      return;
    }

    if (!selectedVenue) {
      showValidationError(
        "Please select a venue.",
        undefined,
        "coworking-venue-section"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let sessionMember = {
        email: trimmedEmail,
        name: trimmedName,
        memberId: member?.memberId || "",
      };

      if (!isAuthenticated) {
        const result = await coworkingService.startSession(spaceSlug, {
          email: trimmedEmail,
          name: trimmedName,
        });

        sessionMember = {
          email: result.email,
          name: result.name,
          memberId: "",
        };
      }

      setVenueSelection(selectedVenue, startDate, startTime, endDate, endTime);
      setSession({ member: sessionMember });
      setContactInfo({
        organization: contactInfo?.organization || sessionMember.name || "",
        fullName: contactInfo?.fullName || "",
        email: contactInfo?.email || sessionMember.email || "",
        phone: contactInfo?.phone || "",
        addressLine1: contactInfo?.addressLine1 || "",
        addressLine2: contactInfo?.addressLine2 || "",
        city: contactInfo?.city || "",
        zipcode: contactInfo?.zipcode || "",
        billingAddress: contactInfo?.billingAddress,
        ccEmails: contactInfo?.ccEmails || [],
        specialInstructions: contactInfo?.specialInstructions || "",
      });
      onSuccess?.();
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
          <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
            <span className="text-slate-500">Powered by</span>
            <a
              href="https://swiftfood.uk"
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-block font-bold text-primary-pink hover:underline"
            >
              Swift
            </a>
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
              isSubmitting
                ? "Setting up your order..."
                : (submitLabel ?? "Continue to Menu")
            }
            submitDisabled={false}
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
