"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useCoworking } from "@/context/CoworkingContext";
import { useCatering } from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import CoworkingAuthForm from "./CoworkingAuthForm";
import CoworkingBookingDetailsForm, {
  COWORKING_TIME_SLOTS,
  isCoworkingBookingWindowValid,
} from "./CoworkingBookingDetailsForm";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import CoworkingBookingQuestionsStep from "./CoworkingBookingQuestionsStep";
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";
import { CoworkingVenue } from "@/types/api";
import { Calendar, Clock, MapPin, Pencil, X } from "lucide-react";

const coworkingSteps = [
  { step: 1, label: "Booking details" },
  { step: 2, label: "Questions form" },
  { step: 3, label: "Catering" },
  { step: 4, label: "Contact details" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(value: string): string {
  if (!value) return "";
  const slot = COWORKING_TIME_SLOTS.find((s) => s.value === value);
  return slot?.label ?? value;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  onClose: () => void;
  onSave: (
    companyName: string,
    email: string,
    venue: CoworkingVenue,
    startDate: string,
    start: string,
    endDate: string,
    end: string
  ) => void;
  initialCompanyName: string;
  initialEmail: string;
  initialVenue: CoworkingVenue | null;
  initialDate: string;
  initialStart: string;
  initialEndDate: string;
  initialEnd: string;
  venues: CoworkingVenue[];
}

function EventEditModal({
  onClose,
  onSave,
  initialCompanyName,
  initialEmail,
  initialVenue,
  initialDate,
  initialStart,
  initialEndDate,
  initialEnd,
  venues,
}: EditModalProps) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [email, setEmail] = useState(initialEmail);
  const [venue, setVenue] = useState<CoworkingVenue | null>(initialVenue);
  const [startDate, setStartDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEndDate || initialDate);
  const [end, setEnd] = useState(initialEnd);

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

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSave =
    companyName.trim().length >= 2 &&
    isEmailValid &&
    venue !== null &&
    isCoworkingBookingWindowValid({
      startDate,
      startTime: start,
      endDate,
      endTime: end,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#f8fafc_0%,#f3f4f6_42%,#eef2f7_100%)] p-4 shadow-2xl sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="font-semibold text-slate-900">Edit Event Details</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <CoworkingBookingDetailsForm
          name={companyName}
          email={email}
          venues={venues}
          startDate={startDate}
          startTime={start}
          endDate={endDate}
          endTime={end}
          selectedVenue={venue}
          submitLabel="Save Changes"
          submitDisabled={!canSave}
          submitButtonType="button"
          onSubmit={() =>
            canSave &&
            onSave(
              companyName.trim(),
              email.trim(),
              venue!,
              startDate,
              start,
              endDate,
              end
            )
          }
          onNameChange={setCompanyName}
          onEmailChange={setEmail}
          onVenueChange={setVenue}
          onEventWindowApply={({ startDate, startTime, endDate, endTime }) => {
            setStartDate(startDate);
            setStart(startTime);
            setEndDate(endDate);
            setEnd(endTime);
          }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CoworkingOrderFlow() {
  const params = useParams();
  const spaceSlug = params.spaceSlug as string;

  const {
    isAuthenticated,
    isLoading,
    member,
    spaceInfo,
    setSpaceInfo,
    selectedVenue,
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    setVenueSelection,
    setSession,
    logout,
  } = useCoworking();
  const {
    currentStep,
    highestVisitedStep,
    contactInfo,
    setContactInfo,
    setCurrentStep,
    updateMealSession,
    resetOrder,
  } = useCatering();

  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [venues, setVenues] = useState<CoworkingVenue[]>([]);
  const hasPrefilledContact = useRef(false);
  const hasPrefilledSession = useRef(false);
  const hasBookingDetails = Boolean(
    selectedVenue &&
      eventStartDate &&
      eventStartTime &&
      eventEndDate &&
      eventEndTime
  );
  const canNavigateToStep = (step: number) =>
    step === 1 || step <= highestVisitedStep;

  // Fetch space info on mount
  useEffect(() => {
    if (!spaceSlug || spaceInfo) return;
    coworkingService
      .getSpaceInfo(spaceSlug)
      .then((info) => setSpaceInfo(info))
      .catch((err) => {
        logout();
        resetOrder();
        if (err instanceof Error && err.message === "Coworking space not found") {
          setSpaceError(err.message);
        }
      });
  }, [spaceSlug, spaceInfo, setSpaceInfo, logout, resetOrder]);

  // Fetch venues once spaceInfo (and its id) is available
  useEffect(() => {
    if (!spaceInfo?.id) return;
    coworkingService.getVenues(spaceInfo.id).then(setVenues).catch(() => {});
  }, [spaceInfo?.id]);

  // Pre-fill contact info from member data once when authenticated
  useEffect(() => {
    if (isAuthenticated && member && !hasPrefilledContact.current) {
      hasPrefilledContact.current = true;
      setContactInfo({
        organization: member.name || "",
        fullName: "",
        email: member.email,
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        zipcode: "",
      });
    }
  }, [isAuthenticated, member, setContactInfo]);

  // Pre-fill meal session date/time from venue selection once when authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      !hasPrefilledSession.current &&
      eventStartDate &&
      eventStartTime
    ) {
      hasPrefilledSession.current = true;
      updateMealSession(0, {
        sessionDate: eventStartDate,
        eventTime: eventStartTime,
      });
    }
  }, [isAuthenticated, eventStartDate, eventStartTime, updateMealSession]);

  const handleSaveEventEdit = (
    companyName: string,
    email: string,
    venue: CoworkingVenue,
    startDate: string,
    start: string,
    endDate: string,
    end: string
  ) => {
    setSession({
      member: {
        email,
        name: companyName,
        memberId: member?.memberId || "",
      },
    });
    setContactInfo({
      organization: companyName,
      fullName: contactInfo?.fullName || "",
      email,
      phone: contactInfo?.phone || "",
      addressLine1: contactInfo?.addressLine1 || "",
      addressLine2: contactInfo?.addressLine2 || "",
      city: contactInfo?.city || "",
      zipcode: contactInfo?.zipcode || "",
      billingAddress: contactInfo?.billingAddress,
      ccEmails: contactInfo?.ccEmails || [],
      specialInstructions: contactInfo?.specialInstructions || "",
    });
    setVenueSelection(venue, startDate, start, endDate, end);
    updateMealSession(0, { sessionDate: startDate, eventTime: start });
    setShowEditModal(false);
  };

  if (spaceError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Space Not Found</h2>
          <p className="text-gray-500">{spaceError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (currentStep !== 1 && (!isAuthenticated || !hasBookingDetails)) {
    return (
      <div className="min-h-screen">
        <div className="py-2 max-w mx-auto bg-base-100">
          <CoworkingAuthForm
            spaceSlug={spaceSlug}
            submitLabel="Continue to questions"
            onSuccess={() => setCurrentStep(2)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="py-2 max-w mx-auto bg-base-100">

        {currentStep > 1 && (
          <div className="mx-4 mb-4 mt-6 overflow-x-auto md:mx-10 md:mb-6 md:mt-8">
            <div className="mx-auto min-w-[720px] max-w-6xl">
              <div className="flex w-full items-center">
                {coworkingSteps.map((item, index) => {
                  const isActive = currentStep === item.step;
                  const isCompleted = item.step < currentStep;
                  const isClickable = canNavigateToStep(item.step);

                  return (
                    <div key={item.step} className="flex min-w-0 flex-1 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isClickable || item.step === currentStep) return;
                          setCurrentStep(item.step);
                        }}
                        disabled={!isClickable}
                        className={`flex min-w-0 items-center gap-3 text-left transition-colors ${
                          isClickable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-55"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                            isActive || isCompleted
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300 bg-white text-slate-500"
                          }`}
                        >
                          {item.step}
                        </span>
                        <span
                          className={`whitespace-nowrap text-sm font-semibold ${
                            isActive
                              ? "text-primary"
                              : isCompleted
                                ? "text-slate-800"
                                : "text-slate-500"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>

                      {index < coworkingSteps.length - 1 && (
                        <span className="mx-4 h-px flex-1 bg-slate-300/80" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Event summary bar */}
        {currentStep > 1 && selectedVenue && (
          <div className="mx-4 md:mx-10 mb-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex w-full min-w-0 items-center justify-between sm:w-auto sm:block">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-700 shrink-0">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    {selectedVenue.name}
                  </span>
                  <button
                    onClick={() => setShowEditModal(true)}
                    aria-label="Edit booking details"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-opacity hover:opacity-75 sm:hidden"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {eventStartDate && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {formatDate(eventStartDate)}
                    {eventEndDate && eventEndDate !== eventStartDate && ` – ${formatDate(eventEndDate)}`}
                  </span>
                )}
                {eventStartTime && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
                    <Clock className="w-4 h-4 shrink-0" />
                    {formatTime(eventStartTime)}
                    {eventEndTime && ` – ${formatTime(eventEndTime)}`}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                aria-label="Edit booking details"
                className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-75 sm:flex"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Booking Details</span>
              </button>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="bg-base-100 rounded-lg max-w-none">
          {currentStep === 1 && (
            <CoworkingAuthForm
              spaceSlug={spaceSlug}
              submitLabel="Continue to questions"
              onSuccess={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 2 && <CoworkingBookingQuestionsStep />}
          {currentStep === 3 && <CateringOrderBuilder nextStep={4} />}
          {currentStep === 4 && <Step3ContactInfo />}
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EventEditModal
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEventEdit}
          initialCompanyName={member?.name || ""}
          initialEmail={member?.email || ""}
          initialVenue={selectedVenue}
          initialDate={eventStartDate}
          initialStart={eventStartTime}
          initialEndDate={eventEndDate}
          initialEnd={eventEndTime}
          venues={venues}
        />
      )}
    </div>
  );
}
