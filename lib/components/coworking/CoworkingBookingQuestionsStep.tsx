"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import { useCatering } from "@/context/CateringContext";
import { useCoworking } from "@/context/CoworkingContext";
import { ContactInfo, CoworkingBookingQuestionnaire } from "@/types/catering.types";

const emptyContactInfo: ContactInfo = {
  organization: "",
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  zipcode: "",
};

const emptyQuestionnaire: CoworkingBookingQuestionnaire = {
  eventUrl: "",
  eventInformation: "",
  invitedGuestCount: "",
  runsOvernight: "",
  hasCatering: "",
  specialEquipment: "",
  sponsors: "",
  outcomes: "",
  invoicingOrganisation: "",
  invoiceEmailAddress: "",
  signature: "",
};

type ValidationErrors = Partial<Record<keyof ContactInfo | keyof CoworkingBookingQuestionnaire, string>>;

const fieldLabelClass = "mb-2 block text-sm font-semibold text-slate-900";
const fieldClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";
const errorClass = "mt-1 text-xs text-red-600";

export default function CoworkingBookingQuestionsStep() {
  const { contactInfo, bookingQuestionnaire, setContactInfo, setBookingQuestionnaire, setCurrentStep } =
    useCatering();
  const { selectedVenue } = useCoworking();
  const [errors, setErrors] = useState<ValidationErrors>({});

  const currentContactInfo = useMemo(
    () => ({
      ...emptyContactInfo,
      ...contactInfo,
    }),
    [contactInfo]
  );

  const currentQuestionnaire = useMemo(
    () => ({
      ...emptyQuestionnaire,
      ...bookingQuestionnaire,
    }),
    [bookingQuestionnaire]
  );

  const updateContactField = (field: keyof ContactInfo, value: string) => {
    setContactInfo({
      ...currentContactInfo,
      [field]: value,
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateQuestionnaireField = (
    field: keyof CoworkingBookingQuestionnaire,
    value: string
  ) => {
    setBookingQuestionnaire({
      ...currentQuestionnaire,
      [field]: value,
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleTextField =
    (field: keyof CoworkingBookingQuestionnaire) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateQuestionnaireField(field, event.target.value);
    };

  const validate = () => {
    const nextErrors: ValidationErrors = {};

    if (!currentContactInfo.fullName.trim()) {
      nextErrors.fullName = "Please enter a value";
    }
    if (!currentContactInfo.email.trim()) {
      nextErrors.email = "Please enter a value";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentContactInfo.email)) {
      nextErrors.email = "Please enter a valid email address";
    }
    if (!currentContactInfo.phone.trim()) {
      nextErrors.phone = "Please enter a value";
    }
    if (!currentContactInfo.organization.trim()) {
      nextErrors.organization = "Please enter a value";
    }

    if (!currentQuestionnaire.eventUrl.trim()) {
      nextErrors.eventUrl = "Please enter a value";
    }
    if (!currentQuestionnaire.eventInformation.trim()) {
      nextErrors.eventInformation = "Please enter a value";
    }
    if (!currentQuestionnaire.invitedGuestCount.trim()) {
      nextErrors.invitedGuestCount = "Please enter a value";
    }
    if (!currentQuestionnaire.runsOvernight) {
      nextErrors.runsOvernight = "Please select an option";
    }
    if (!currentQuestionnaire.hasCatering) {
      nextErrors.hasCatering = "Please select an option";
    }
    if (!currentQuestionnaire.specialEquipment.trim()) {
      nextErrors.specialEquipment = "Please enter a value";
    }
    if (!currentQuestionnaire.invoicingOrganisation.trim()) {
      nextErrors.invoicingOrganisation = "Please enter a value";
    }
    if (!currentQuestionnaire.invoiceEmailAddress.trim()) {
      nextErrors.invoiceEmailAddress = "Please enter a value";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentQuestionnaire.invoiceEmailAddress)
    ) {
      nextErrors.invoiceEmailAddress = "Please enter a valid email address";
    }
    if (!currentQuestionnaire.signature.trim()) {
      nextErrors.signature = "Please enter a value";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setCurrentStep(3);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="space-y-6">
          <div className="space-y-5 text-slate-900">
            <p className="text-2xl font-semibold leading-tight">
              You must complete this form to confirm your booking.
            </p>
            <p className="text-2xl font-semibold leading-tight">
              Do not list a Halkin venue on Luma or any other platform until
              your booking is confirmed by Halkin staff.
            </p>
            <p className="text-2xl font-semibold leading-tight">
              You must add{" "}
              <a
                href="mailto:oliver@halkin.com"
                className="text-blue-600 underline underline-offset-2"
              >
                oliver@halkin.com
              </a>{" "}
              as an organiser to your Luma event.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-3xl font-semibold text-slate-900">Your details</h2>
            <p className="mt-3 text-lg text-slate-700">
              Please provide the name and details of the lead person and the
              company hosting this event.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>
                  Your name <span className="text-slate-400">*</span>
                </label>
                <input
                  type="text"
                  value={currentContactInfo.fullName}
                  onChange={(event) => updateContactField("fullName", event.target.value)}
                  placeholder="First and last name"
                  className={fieldClass}
                />
                {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Your email address <span className="text-slate-400">*</span>
                </label>
                <input
                  type="email"
                  value={currentContactInfo.email}
                  onChange={(event) => updateContactField("email", event.target.value)}
                  placeholder="organiser@example.com"
                  className={fieldClass}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Your mobile / WhatsApp number <span className="text-slate-400">*</span>
                </label>
                <input
                  type="tel"
                  value={currentContactInfo.phone}
                  onChange={(event) => updateContactField("phone", event.target.value)}
                  placeholder="+44 7835 555 555"
                  className={fieldClass}
                />
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Your company or organisation <span className="text-slate-400">*</span>
                </label>
                <input
                  type="text"
                  value={currentContactInfo.organization}
                  onChange={(event) =>
                    updateContactField("organization", event.target.value)
                  }
                  placeholder="Team Rocket"
                  className={fieldClass}
                />
                {errors.organization && (
                  <p className={errorClass}>{errors.organization}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-3xl font-semibold text-slate-900">About your event</h2>
            <p className="mt-3 text-lg text-slate-700">
              Your request will most likely be accepted at{" "}
              <span className="font-semibold">
                Halkin - {selectedVenue?.name || "1-2 Paris Garden"}
              </span>
              .
            </p>

            <div className="mt-8 space-y-8">
              <div>
                <label className={fieldLabelClass}>
                  Event URL <span className="text-slate-400">*</span>
                </label>
                <p className="mb-3 text-base text-slate-700">
                  Share the link where your attendees will register
                </p>
                <input
                  type="url"
                  value={currentQuestionnaire.eventUrl}
                  onChange={handleTextField("eventUrl")}
                  placeholder="https://luma.com/q108auy0"
                  className={fieldClass}
                />
                {errors.eventUrl && <p className={errorClass}>{errors.eventUrl}</p>}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Event information <span className="text-slate-400">*</span>
                </label>
                <p className="mb-3 text-base text-slate-700">What are you hosting?</p>
                <textarea
                  value={currentQuestionnaire.eventInformation}
                  onChange={handleTextField("eventInformation")}
                  placeholder="A hackathon for commercial real estate"
                  className={`${fieldClass} min-h-36 resize-y`}
                />
                {errors.eventInformation && (
                  <p className={errorClass}>{errors.eventInformation}</p>
                )}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  How many people are you inviting? <span className="text-slate-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentQuestionnaire.invitedGuestCount}
                  onChange={handleTextField("invitedGuestCount")}
                  placeholder="150"
                  className={fieldClass}
                />
                {errors.invitedGuestCount && (
                  <p className={errorClass}>{errors.invitedGuestCount}</p>
                )}
                <div className="mt-4 space-y-2 text-base font-semibold text-slate-800">
                  <p>
                    Warning: Your selected venue seats a maximum of{" "}
                    {selectedVenue?.capacity ?? 80} people.
                  </p>
                  <p>Warning: The maximum capacity across our venues is 150 people.</p>
                </div>
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Will your event run overnight? <span className="text-slate-400">*</span>
                </label>
                <p className="mb-4 text-base text-slate-700">
                  Will your event run between the hours of 12am to 9am?
                </p>
                <div className="space-y-3">
                  {[
                    "Yes - our event will run through the night",
                    "No - our event will finish before midnight and resume again after 9am",
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateQuestionnaireField("runsOvernight", option)}
                      className={`flex w-full items-center rounded-2xl border px-4 py-3 text-left text-lg transition-colors ${
                        currentQuestionnaire.runsOvernight === option
                          ? "border-primary bg-primary/10 text-slate-900"
                          : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {errors.runsOvernight && (
                  <p className={errorClass}>{errors.runsOvernight}</p>
                )}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Will your event have catering? <span className="text-slate-400">*</span>
                </label>
                <p className="mb-4 text-base text-slate-700">
                  Halkin exclusively uses{" "}
                  <Link
                    href="https://swiftfood.uk"
                    target="_blank"
                    className="text-blue-600 underline underline-offset-2"
                  >
                    https://swiftfood.uk
                  </Link>{" "}
                  for catering.
                </p>
                <div className="space-y-3">
                  {[
                    "Yes - we will use Swift Food to arrange food and drink",
                    "No - food and catering will not be provided",
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateQuestionnaireField("hasCatering", option)}
                      className={`flex w-full items-center rounded-2xl border px-4 py-3 text-left text-lg transition-colors ${
                        currentQuestionnaire.hasCatering === option
                          ? "border-primary bg-primary/10 text-slate-900"
                          : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {errors.hasCatering && <p className={errorClass}>{errors.hasCatering}</p>}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Do you require any special equipment?{" "}
                  <span className="text-slate-400">*</span>
                </label>
                <textarea
                  value={currentQuestionnaire.specialEquipment}
                  onChange={handleTextField("specialEquipment")}
                  placeholder="Screens, microphones for speakers, 3D printers, 5-axis CNC mills...."
                  className={`${fieldClass} min-h-32 resize-y`}
                />
                {errors.specialEquipment && (
                  <p className={errorClass}>{errors.specialEquipment}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-3xl font-semibold text-slate-900">
              Sponsors and supporting organisations
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              If you&apos;re looking for sponsorship - tell us! We have a vast
              network of people who can help.
            </p>

            <div className="mt-8 space-y-8">
              <div>
                <label className={fieldLabelClass}>List of sponsors</label>
                <p className="mb-3 text-base text-slate-700">
                  Please list the names of any organisations that are supporting
                  the event financially.
                </p>
                <textarea
                  value={currentQuestionnaire.sponsors}
                  onChange={handleTextField("sponsors")}
                  placeholder="Union Aerospace Corporation, Umbrella Corporation, UNATCO"
                  className={`${fieldClass} min-h-32 resize-y`}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>List of outcomes</label>
                <p className="mb-3 text-base text-slate-700">
                  What are you (and any sponsors) hoping to achieve from hosting
                  your event?
                </p>
                <textarea
                  value={currentQuestionnaire.outcomes}
                  onChange={handleTextField("outcomes")}
                  placeholder="Hiring founding engineers"
                  className={`${fieldClass} min-h-32 resize-y`}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-3xl font-semibold text-slate-900">Billing</h2>
            <div className="mt-4 space-y-4 text-lg text-slate-700">
              <p className="font-semibold">
                The venue hire charge is £1 for every £1 spent with Swift Food.
              </p>
              <p>For example, if you spend £500 on food, the venue hire fee is £500.</p>
              <p>We require payment details to recover this cost.</p>
              <p>We may waive this fee at our discretion for communities that we sponsor.</p>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>
                  Invoicing organisation <span className="text-slate-400">*</span>
                </label>
                <p className="mb-3 text-base text-slate-700">
                  Please list the full company name as it appears on Companies House
                  or other registry.
                </p>
                <input
                  type="text"
                  value={currentQuestionnaire.invoicingOrganisation}
                  onChange={handleTextField("invoicingOrganisation")}
                  placeholder="Shinra Electric Power Company Ltd"
                  className={fieldClass}
                />
                {errors.invoicingOrganisation && (
                  <p className={errorClass}>{errors.invoicingOrganisation}</p>
                )}
              </div>

              <div>
                <label className={fieldLabelClass}>
                  Invoice email address <span className="text-slate-400">*</span>
                </label>
                <p className="mb-3 text-base text-slate-700">
                  Please ensure this email address is able to receive invoices.
                </p>
                <input
                  type="email"
                  value={currentQuestionnaire.invoiceEmailAddress}
                  onChange={handleTextField("invoiceEmailAddress")}
                  placeholder="accounts@"
                  className={fieldClass}
                />
                {errors.invoiceEmailAddress && (
                  <p className={errorClass}>{errors.invoiceEmailAddress}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-3xl font-semibold text-slate-900">Damage waiver</h2>
            <div className="mt-4 space-y-4 text-lg text-slate-700">
              <p>By submitting this form, you agree that:</p>
              <p className="font-semibold">
                You will ensure that the venue is returned in its original condition
              </p>
              <p className="font-semibold">
                You will cover the venue hire fee as stated above
              </p>
              <p className="font-semibold">
                You will include the Halkin logo on any marketing and social media materials
              </p>
              <Link
                href="https://github.com/halkin-offices/media-assets"
                target="_blank"
                className="inline-block text-blue-600 underline underline-offset-2"
              >
                Download our media assets
              </Link>
            </div>

            <div className="mt-8">
              <label className={fieldLabelClass}>
                Signature <span className="text-slate-400">*</span>
              </label>
              <input
                type="text"
                value={currentQuestionnaire.signature}
                onChange={handleTextField("signature")}
                placeholder="Type your full name as signature"
                className={fieldClass}
              />
              {errors.signature && <p className={errorClass}>{errors.signature}</p>}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to catering
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Continue to contact details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
