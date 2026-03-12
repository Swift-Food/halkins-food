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
import {
  AlertTriangle,
  Building2,
  Check,
  FileSignature,
  Globe,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
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

const fieldLabelClass =
  "mb-2 block text-sm font-semibold text-slate-900";
const fieldClass =
  "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";
const errorClass =
  "mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700";

const sectionTheme: Record<
  string,
  {
    eyebrow: string;
    icon: typeof ListChecks;
  }
> = {
  your_details: {
    eyebrow: "Lead organiser",
    icon: Building2,
  },
  about_event: {
    eyebrow: "Event profile",
    icon: Globe,
  },
  sponsors: {
    eyebrow: "Support network",
    icon: ListChecks,
  },
  billing: {
    eyebrow: "Finance",
    icon: ShieldCheck,
  },
  damage_waiver: {
    eyebrow: "Confirmation",
    icon: FileSignature,
  },
};

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
      <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full touch-none bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Draw your signature with your finger, mouse, or trackpad.</span>
        <button
          type="button"
          onClick={clearSignature}
          className="shrink-0 font-semibold text-primary hover:opacity-80"
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
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const scrollToQuestion = (questionKey: string) => {
    const element = fieldRefs.current[questionKey];
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const validate = () => {
    const nextErrors: ValidationErrors = {};
    let firstInvalidQuestionKey: string | null = null;

    for (const section of questionsConfig.sections) {
      for (const question of section.questions) {
        const value = getQuestionValue(question).trim();

        if (question.required && !value) {
          nextErrors[question.key] =
            question.type === "single_choice"
              ? "Please select an option"
              : "Please enter a value";
          if (!firstInvalidQuestionKey) {
            firstInvalidQuestionKey = question.key;
          }
          continue;
        }

        if (
          value &&
          question.inputType === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          nextErrors[question.key] = "Please enter a valid email address";
          if (!firstInvalidQuestionKey) {
            firstInvalidQuestionKey = question.key;
          }
        }
      }
    }

    setErrors(nextErrors);

    if (firstInvalidQuestionKey) {
      window.requestAnimationFrame(() => {
        scrollToQuestion(firstInvalidQuestionKey);
      });
    }

    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setCurrentStep(3);
  };

  const introChecks = [
    "This short form is required before Halkin can confirm the booking.",
    "Do not publish a Halkin venue on Luma or another platform until approval is complete.",
    "Add oliver@halkin.com as an organiser on your Luma event.",
  ];

  const renderQuestion = (question: QuestionSchema) => {
    const value = getQuestionValue(question);

    return (
      <div
        key={question.key}
        ref={(element) => {
          fieldRefs.current[question.key] = element;
        }}
        className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5"
      >
        <label className={fieldLabelClass}>
          {question.title}
          {question.required && <span className="text-slate-400"> *</span>}
        </label>
        {question.description && (
          <p className="mb-3 text-sm leading-6 text-slate-600">
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
            {question.options?.map((option, index) => {
              const isSelected = value === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateQuestionValue(question, option)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-base leading-6">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "signature" && (
          <SignaturePad
            value={value}
            onChange={(nextValue) => updateQuestionValue(question, nextValue)}
          />
        )}

        {question.notes && (
          <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {question.notes.map((note) => (
              <p key={note} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{interpolateText(note, replacements)}</span>
              </p>
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

    if (sectionId === "damage_waiver") {
      return (
        <p key={line} className="font-semibold">
          {line}
        </p>
      );
    }

    return <p key={line}>{line}</p>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#f8fafc_0%,#f3f4f6_48%,#eef2f7_100%)] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-primary/20" />
                <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                  Booking Confirmation
                </p>
                <span className="h-px flex-1 bg-primary/20" />
              </div>

              <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-slate-950 sm:text-[2.4rem]">
                Final booking questions before Halkin reviews your event.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Complete the organiser, billing, and event information below so the team can review your request without follow-up emails.
              </p>

              <div className="mt-6 grid gap-3">
                {introChecks.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 backdrop-blur"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-slate-700 sm:text-[15px]">
                      {item.includes("oliver@halkin.com") ? (
                        <>
                          Add{" "}
                          <a
                            href="mailto:oliver@halkin.com"
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            oliver@halkin.com
                          </a>{" "}
                          as an organiser on your Luma event.
                        </>
                      ) : (
                        item
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 backdrop-blur sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                Review Snapshot
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Venue
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedVenue?.name || "Selected venue"}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        What this step covers
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Organiser details, event context, invoicing information, and a signed confirmation for the booking request.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Before you continue
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The quicker this is completed, the faster the Halkin team can review and approve the event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {questionsConfig.sections.map((section) => {
          const theme = sectionTheme[section.id] ?? {
            eyebrow: "Section",
            icon: ListChecks,
          };
          const SectionIcon = theme.icon;

          return (
            <section
              key={section.id}
              className="sm:rounded-[2rem] sm:border sm:border-slate-200/80 sm:bg-white/85 p-0 shadow-none backdrop-blur sm:p-8 sm:shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                  <SectionIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {theme.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
                    {section.title}
                  </h2>

                  {section.description && (
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                      {interpolateText(section.description, replacements)}
                    </p>
                  )}
                </div>
              </div>

              {section.body && (
                <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5 text-base leading-7 text-slate-700">
                  <div className="space-y-3">
                    {section.body.map((line, index) =>
                      renderSectionBodyLine(section.id, line, index)
                    )}
                  </div>
                </div>
              )}

              {section.link && (
                <Link
                  href={section.link.href}
                  target="_blank"
                  className="mt-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/[0.05] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.08]"
                >
                  {section.link.label}
                </Link>
              )}

              <div
                className={
                  section.layout === "grid"
                    ? "mt-6 grid gap-4 md:grid-cols-2 md:gap-5"
                    : "mt-6 space-y-4"
                }
              >
                {section.questions.map((question) => renderQuestion(question))}
              </div>
            </section>
          );
        })}

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur sm:p-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
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
