"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCoworking } from "@/context/CoworkingContext";
import { useCatering } from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import CoworkingAuthForm from "./CoworkingAuthForm";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";
import { CoworkingVenue } from "@/types/api";
import { Calendar, Clock, MapPin, Users, CheckCircle2, Pencil, X } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(value: string): string {
  if (!value) return "";
  const slot = TIME_SLOTS.find((s) => s.value === value);
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

function getMinDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getMaxDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  onClose: () => void;
  onSave: (venue: CoworkingVenue, startDate: string, start: string, endDate: string, end: string) => void;
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
  initialVenue,
  initialDate,
  initialStart,
  initialEndDate,
  initialEnd,
  venues,
}: EditModalProps) {
  const [venue, setVenue] = useState<CoworkingVenue | null>(initialVenue);
  const [startDate, setStartDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEndDate || initialDate);
  const [end, setEnd] = useState(initialEnd);

  const endOptions =
    start && endDate === startDate
      ? TIME_SLOTS.filter((s) => s.value > start)
      : TIME_SLOTS;

  const canSave =
    venue !== null &&
    startDate !== "" &&
    start !== "" &&
    endDate !== "" &&
    end !== "" &&
    (endDate > startDate || end > start);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Edit Event Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date + Times */}
          <div className="space-y-4">
            {/* Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && endDate < e.target.value) setEndDate(e.target.value);
                      if (endDate === e.target.value && end && end <= start) setEnd("");
                    }}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
                    style={{ WebkitAppearance: "none" }}
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      if (endDate === startDate && end && end <= e.target.value) setEnd("");
                    }}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">Time</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (e.target.value === startDate && end && end <= start) setEnd("");
                    }}
                    min={startDate || getMinDate()}
                    max={getMaxDate()}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
                    style={{ WebkitAppearance: "none" }}
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    disabled={!start || !endDate}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white disabled:opacity-50"
                  >
                    <option value="">Time</option>
                    {endOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Venue cards */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Venue</p>
            <div className="grid grid-cols-2 gap-3">
              {venues.map((v) => {
                const isSelected = venue?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVenue(v)}
                    className={`relative rounded-xl overflow-hidden text-left transition-all group ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-1"
                        : "ring-1 ring-gray-200 hover:ring-primary/40"
                    }`}
                  >
                    <div className="relative h-28 w-full bg-gray-100">
                      {v.image && (
                        <Image
                          src={v.image}
                          alt={v.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="bg-white px-3 py-2.5">
                      <p className="font-semibold text-xs text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Up to {v.capacity}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSave && onSave(venue!, startDate, start, endDate, end)}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
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
  } = useCoworking();
  const { currentStep, setContactInfo, updateMealSession } = useCatering();

  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [venues, setVenues] = useState<CoworkingVenue[]>([]);
  const hasPrefilledContact = useRef(false);
  const hasPrefilledSession = useRef(false);

  // Fetch space info on mount
  useEffect(() => {
    if (!spaceSlug || spaceInfo) return;
    coworkingService
      .getSpaceInfo(spaceSlug)
      .then((info) => setSpaceInfo(info))
      .catch((err) =>
        setSpaceError(
          err instanceof Error ? err.message : "Failed to load space info"
        )
      );
  }, [spaceSlug, spaceInfo, setSpaceInfo]);

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
    venue: CoworkingVenue,
    startDate: string,
    start: string,
    endDate: string,
    end: string
  ) => {
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

  // Auth screen
  if (!isAuthenticated) {
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
                className="h-full bg-dark-pink rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 font-medium flex items-center gap-2">
              {steps.map((s, idx) => (
                <div key={s.step} className="flex items-center gap-2">
                  <span className={currentStep === s.step ? "text-dark-pink" : "text-gray-600"}>
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
                Edit
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
