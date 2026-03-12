"use client";

import Link from "next/link";
import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import questionsConfigJson from "@/lib/data/coworking-booking-questions.json";
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
  specialEquipment: "",
  sponsors: "",
  outcomes: "",
  invoicingOrganisation: "",
  invoiceEmailAddress: "",
  signature: "",
};

type QuestionSource = "contactInfo" | "bookingQuestionnaire";
type QuestionType = "short_text" | "long_text" | "single_choice" | "signature";
type SectionLayout = "grid" | "stack";

interface QuestionSchema {
  key: string;
  title: string;
  description: string;
  type: QuestionType;
  required: boolean;
  source: QuestionSource;
  inputType?: string;
  placeholder?: string;
  options?: string[];
  notes?: string[];
}

interface SectionSchema {
  id: string;
  title: string;
  layout: SectionLayout;
  description: string;
  body?: string[];
  link?: {
    label: string;
    href: string;
  };
  questions: QuestionSchema[];
}

interface QuestionsConfig {
  sections: SectionSchema[];
}

const questionsConfig = questionsConfigJson as QuestionsConfig;

type ValidationErrors = Record<string, string>;

const fieldLabelClass = "mb-2 block text-sm font-semibold text-slate-900";
const fieldClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";
const errorClass = "mt-1 text-xs text-red-600";

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
}

function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const drawImageFromValue = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;

    context.clearRect(0, 0, width, height);

    if (!dataUrl) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
    };
    image.src = dataUrl;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    drawImageFromValue(value);
  }, [drawImageFromValue, value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (!isDrawingRef.current) {
      drawImageFromValue(value);
    }
  }, [drawImageFromValue, value]);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getPoint(event);
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const finishDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    context.closePath();
    onChange(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full touch-none bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Draw your signature using your finger, mouse, or trackpad.</span>
        <button
          type="button"
          onClick={clearSignature}
          className="font-semibold text-primary hover:opacity-80"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function interpolateText(
  text: string,
  replacements: Record<string, string | number>
) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, token) => String(replacements[token] ?? ""));
}

export default function CoworkingBookingQuestionsStep() {
  const {
    contactInfo,
    bookingQuestionnaire,
    setContactInfo,
    setBookingQuestionnaire,
    setCurrentStep,
  } = useCatering();
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

  const replacements = useMemo(
    () => ({
      venueName: selectedVenue?.name || "1-2 Paris Garden",
      venueCapacity: selectedVenue?.capacity ?? 80,
    }),
    [selectedVenue]
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

  const getQuestionValue = (question: QuestionSchema) => {
    if (question.source === "contactInfo") {
      return String(
        currentContactInfo[question.key as keyof ContactInfo] ?? ""
      );
    }

    return String(
      currentQuestionnaire[
        question.key as keyof CoworkingBookingQuestionnaire
      ] ?? ""
    );
  };

  const updateQuestionValue = (question: QuestionSchema, value: string) => {
    if (question.source === "contactInfo") {
      updateContactField(question.key as keyof ContactInfo, value);
      return;
    }

    updateQuestionnaireField(
      question.key as keyof CoworkingBookingQuestionnaire,
      value
    );
  };

  const validate = () => {
    const nextErrors: ValidationErrors = {};

    for (const section of questionsConfig.sections) {
      for (const question of section.questions) {
        const value = getQuestionValue(question).trim();

        if (question.required && !value) {
          nextErrors[question.key] =
            question.type === "single_choice"
              ? "Please select an option"
              : "Please enter a value";
          continue;
        }

        if (
          value &&
          question.inputType === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          nextErrors[question.key] = "Please enter a valid email address";
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setCurrentStep(3);
  };

  const renderQuestion = (question: QuestionSchema) => {
    const value = getQuestionValue(question);

    return (
      <div key={question.key}>
        <label className={fieldLabelClass}>
          {question.title}
          {question.required && <span className="text-slate-400"> *</span>}
        </label>
        {question.description && (
          <p className="mb-3 text-base text-slate-700">
            {interpolateText(question.description, replacements)}
          </p>
        )}

        {question.type === "short_text" && (
          <input
            type={question.inputType ?? "text"}
            min={question.inputType === "number" ? "1" : undefined}
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateQuestionValue(question, event.target.value)
            }
            placeholder={question.placeholder}
            className={fieldClass}
          />
        )}

        {question.type === "long_text" && (
          <textarea
            value={value}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              updateQuestionValue(question, event.target.value)
            }
            placeholder={question.placeholder}
            className={`${fieldClass} min-h-32 resize-y`}
          />
        )}

        {question.type === "single_choice" && (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateQuestionValue(question, option)}
                className={`flex w-full items-center rounded-2xl border px-4 py-3 text-left text-lg transition-colors ${
                  value === option
                    ? "border-primary bg-primary/10 text-slate-900"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {question.type === "signature" && (
          <SignaturePad
            value={value}
            onChange={(nextValue) => updateQuestionValue(question, nextValue)}
          />
        )}

        {question.notes && (
          <div className="mt-4 space-y-2 text-base font-semibold text-slate-800">
            {question.notes.map((note) => (
              <p key={note}>{interpolateText(note, replacements)}</p>
            ))}
          </div>
        )}

        {errors[question.key] && <p className={errorClass}>{errors[question.key]}</p>}
      </div>
    );
  };

  const renderSectionBodyLine = (
    sectionId: string,
    line: string,
    index: number
  ) => {
    if (sectionId === "billing" && index === 0) {
      return (
        <p key={line} className="font-semibold">
          {line}
        </p>
      );
    }

    if (sectionId === "damage_waiver" && index > 0) {
      return (
        <p key={line} className="font-semibold">
          {line}
        </p>
      );
    }

    return <p key={line}>{line}</p>;
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

          {questionsConfig.sections.map((section) => (
            <div key={section.id} className="border-t border-slate-200 pt-8">
              <h2 className="text-3xl font-semibold text-slate-900">
                {section.title}
              </h2>

              {section.description && (
                <p className="mt-3 text-lg text-slate-700">
                  {interpolateText(section.description, replacements)}
                </p>
              )}

              {section.body && (
                <div className="mt-4 space-y-4 text-lg text-slate-700">
                  {section.body.map((line, index) =>
                    renderSectionBodyLine(section.id, line, index)
                  )}
                </div>
              )}

              {section.link && (
                <Link
                  href={section.link.href}
                  target="_blank"
                  className="mt-4 inline-block text-blue-600 underline underline-offset-2"
                >
                  {section.link.label}
                </Link>
              )}

              <div
                className={
                  section.layout === "grid"
                    ? "mt-8 grid gap-6 md:grid-cols-2"
                    : "mt-8 space-y-8"
                }
              >
                {section.questions.map((question) => renderQuestion(question))}
              </div>
            </div>
          ))}

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
