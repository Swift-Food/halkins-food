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
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";
import { CoworkingVenue } from "@/types/api";
import { Calendar, Clock, MapPin, Pencil, X } from "lucide-react";

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
  const { currentStep, contactInfo, setContactInfo, updateMealSession, resetOrder } = useCatering();

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

  // Booking setup screen
  if (!isAuthenticated || !hasBookingDetails) {
    return (
      <div className="min-h-screen">
        <div className="py-2 max-w mx-auto bg-base-100">
          <CoworkingAuthForm spaceSlug={spaceSlug} />
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Menu Selection", step: 1 },
    { label: "Contact & Delivery", step: 2 },
  ];

  return (
    <div className="min-h-screen">
      <div className="py-2 max-w mx-auto bg-base-100">

        {/* Progress bar (step 2+) */}
        {currentStep !== 1 && (
          <div className="my-10 mr-10 ml-10 max-w mx-auto">
            <div className="text-sm text-gray-500 mb-2">
              Step {currentStep} of 2
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 font-medium flex items-center gap-2">
              {steps.map((s, idx) => (
                <div key={s.step} className="flex items-center gap-2">
                  <span className={currentStep === s.step ? "text-primary" : "text-gray-600"}>
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && (
                    <span className="text-gray-400">&rarr;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event summary bar — only on step 1 */}
        {currentStep === 1 && selectedVenue && (
          <div className="mx-4 md:mx-10 mb-4">
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm gap-4">
              <div className="flex items-center gap-4 flex-wrap min-w-0">
                <span className="flex items-center gap-1.5 text-sm text-gray-700 font-medium shrink-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  {selectedVenue.name}
                </span>
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
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:opacity-75 transition-opacity shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Booking Details
              </button>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="bg-base-100 rounded-lg max-w-none">
          {currentStep === 1 && <CateringOrderBuilder />}
          {currentStep === 2 && <Step3ContactInfo />}
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
