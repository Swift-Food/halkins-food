"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useCoworking } from "@/context/CoworkingContext";
import { useCatering } from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import CoworkingAuthForm from "./CoworkingAuthForm";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";

export default function CoworkingOrderFlow() {
  const params = useParams();
  const spaceSlug = params.spaceSlug as string;

  const { isAuthenticated, isLoading, member, spaceInfo, setSpaceInfo } =
    useCoworking();
  const { currentStep, setContactInfo } = useCatering();

  const [spaceError, setSpaceError] = useState<string | null>(null);
  const hasPrefilledContact = useRef(false);

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
          {spaceInfo && (
            <div className="mx-4 md:mx-10 mb-4">
              <h1 className="text-2xl font-bold">{spaceInfo.name}</h1>
              <p className="text-gray-500 text-sm">{spaceInfo.address}</p>
            </div>
          )}
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
        {/* Space header */}
        {spaceInfo && (
          <div className="mx-4 md:mx-10 mb-4">
            <h1 className="text-2xl font-bold">{spaceInfo.name}</h1>
            <p className="text-gray-500 text-sm">{spaceInfo.address}</p>
          </div>
        )}

        {/* Progress bar */}
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
                  <span
                    className={
                      currentStep === s.step
                        ? "text-dark-pink"
                        : "text-gray-600"
                    }
                  >
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

        {/* Step content */}
        <div className="bg-base-100 rounded-lg max-w-none">
          {currentStep === 1 && <CateringOrderBuilder />}
          {currentStep === 2 && <Step3ContactInfo />}
        </div>
      </div>
    </div>
  );
}
