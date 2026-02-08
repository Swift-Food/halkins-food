"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useCoworking } from "@/context/CoworkingContext";
import { useCatering } from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import { BookingInfo } from "@/types/api";
import CoworkingAuthForm from "./CoworkingAuthForm";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";
import CoworkingBookingPicker from "./CoworkingBookingPicker";
import { AlertTriangle } from "lucide-react";

export default function CoworkingOrderFlow() {
  const params = useParams();
  const spaceSlug = params.spaceSlug as string;

  const {
    isAuthenticated,
    isLoading,
    isOfficeRnDVerified,
    bookings,
    spaceInfo,
    setSpaceInfo,
    sessionExpiringWarning,
    minutesUntilExpiry,
  } = useCoworking();

  const { currentStep, setContactInfo } = useCatering();

  const [showAuth, setShowAuth] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingInfo | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);

  // Fetch space info on mount
  useEffect(() => {
    if (!spaceSlug) return;
    if (!spaceInfo) {
      coworkingService
        .getSpaceInfo(spaceSlug)
        .then((info) => setSpaceInfo(info))
        .catch((err) =>
          setSpaceError(err instanceof Error ? err.message : "Failed to load space info")
        );
    }
  }, [spaceSlug, spaceInfo, setSpaceInfo]);

  // When authenticated, hide auth form
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setShowAuth(false);
    }
  }, [isAuthenticated, isLoading]);

  // Reset to auth on session expiry
  useEffect(() => {
    const handleExpired = () => {
      setShowAuth(true);
      setSelectedBooking(null);
    };
    window.addEventListener("coworking-session-expired", handleExpired);
    return () => window.removeEventListener("coworking-session-expired", handleExpired);
  }, []);

  // When a booking is selected, pre-fill the catering contact info with room details
  const handleBookingSelect = (booking: BookingInfo | null) => {
    setSelectedBooking(booking);
    if (booking) {
      setContactInfo({
        organization: "",
        fullName: "",
        email: "",
        phone: "",
        addressLine1: booking.roomLocationDetails || "",
        addressLine2: "",
        city: "",
        zipcode: "",
      });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
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

  // Show auth form if not authenticated
  if (showAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <div className="py-2 max-w mx-auto bg-base-100">
          {spaceInfo && (
            <div className="mx-4 md:mx-10 mb-4">
              <h1 className="text-2xl font-bold">{spaceInfo.name}</h1>
              <p className="text-gray-500 text-sm">{spaceInfo.address}</p>
            </div>
          )}
          <CoworkingAuthForm
            spaceSlug={spaceSlug}
            onSuccess={handleAuthSuccess}
          />
        </div>
      </div>
    );
  }

  // Catering flow steps with coworking enhancements
  const steps = [
    { label: "Menu Selection", step: 1 },
    { label: "Contact & Delivery", step: 2 },
  ];

  return (
    <div className="min-h-screen">
      <div className="py-2 max-w mx-auto bg-base-100">
        {/* Session expiry warning */}
        {sessionExpiringWarning && (
          <div className="mx-4 md:mx-10 mb-4 alert alert-warning">
            <AlertTriangle className="w-5 h-5" />
            <span>
              Your session expires in {minutesUntilExpiry} minute
              {minutesUntilExpiry !== 1 ? "s" : ""}. Please complete your order
              soon.
            </span>
          </div>
        )}

        {/* Space header */}
        {spaceInfo && (
          <div className="mx-4 md:mx-10 mb-4">
            <h1 className="text-2xl font-bold">{spaceInfo.name}</h1>
            <p className="text-gray-500 text-sm">{spaceInfo.address}</p>
          </div>
        )}

        {/* Progress bar — same as event-order */}
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
                  <button
                    disabled={true}
                    type="button"
                    className={`underline-offset-2 font-medium transition-colors ${
                      currentStep === s.step
                        ? "text-dark-pink cursor-default"
                        : "text-gray-600"
                    }`}
                  >
                    {s.label}
                  </button>
                  {idx < steps.length - 1 && (
                    <span className="text-gray-400">&rarr;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step content — same components as event-order */}
        <div className="bg-base-100 rounded-lg max-w-none">
          {currentStep === 1 && <CateringOrderBuilder />}
          {currentStep === 2 && (
            <>
              {/* Booking room picker — shown above Step3 if OfficeRnD verified */}
              {isOfficeRnDVerified && bookings.length > 0 && (
                <CoworkingBookingPicker
                  selectedBooking={selectedBooking}
                  onSelect={handleBookingSelect}
                />
              )}
              <Step3ContactInfo />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
