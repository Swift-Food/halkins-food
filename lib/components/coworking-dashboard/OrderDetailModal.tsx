"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DashboardOrderDetailResponse } from "@/types/api";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import questionsConfigJson from "@/lib/data/coworking-booking-questions.json";
import {
  X,
  User,
  Mail,
  Phone,
  Hash,
  MapPin,
  Clock,
  Receipt,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Info,
} from "lucide-react";

interface OrderDetailModalProps {
  spaceId: string;
  orderId: string;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

interface QuestionSchema {
  key: string;
  title: string;
  description: string;
  type: "short_text" | "long_text" | "single_choice" | "signature";
}

interface SectionSchema {
  id?: string;
  title: string;
  description?: string;
  questions: QuestionSchema[];
}

interface QuestionsConfig {
  sections: SectionSchema[];
}

interface ResponseEntry {
  key: string;
  value: string;
  metadata: QuestionSchema & { sectionTitle: string };
}

interface ResponseSection {
  title: string;
  description?: string;
  responses: ResponseEntry[];
}

const questionsConfig = questionsConfigJson as QuestionsConfig;
const orderedQuestionKeys = questionsConfig.sections.flatMap((section) =>
  section.questions.map((question) => question.key),
);
const questionOrderIndex = orderedQuestionKeys.reduce<Record<string, number>>(
  (accumulator, key, index) => {
    accumulator[key] = index;
    return accumulator;
  },
  {},
);
const questionLookup = questionsConfig.sections.reduce<
  Record<string, QuestionSchema & { sectionTitle: string }>
>((accumulator, section) => {
  section.questions.forEach((question) => {
    accumulator[question.key] = {
      ...question,
      sectionTitle: section.title,
    };
  });
  return accumulator;
}, {});

const statusBadgeColor: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function OrderDetailModal({
  spaceId,
  orderId,
  onClose,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<DashboardOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | "setFee" | null
  >(null);
  const [actionError, setActionError] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showResponses, setShowResponses] = useState(false);
  const [venueHireFeeInput, setVenueHireFeeInput] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await coworkingDashboardService.getOrder(spaceId, orderId);
        setOrder(data);
      } catch (caughtError: unknown) {
        setError(getErrorMessage(caughtError, "Failed to load order details"));
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [spaceId, orderId]);

  useEffect(() => {
    setShowResponses(false);
  }, [orderId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsSheetVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleApprove = async () => {
    setActionLoading("approve");
    setActionError("");
    try {
      const updated = await coworkingDashboardService.approveOrder(
        spaceId,
        orderId,
      );
      setOrder(updated);
      onOrderUpdated?.();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError, "Failed to approve order"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading("reject");
    setActionError("");
    try {
      const updated = await coworkingDashboardService.rejectOrder(
        spaceId,
        orderId,
        rejectReason || undefined,
      );
      setOrder(updated);
      setShowRejectInput(false);
      setRejectReason("");
      onOrderUpdated?.();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError, "Failed to reject order"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetVenueHireFee = async () => {
    const fee = parseFloat(venueHireFeeInput);
    if (isNaN(fee) || fee < 0) {
      setActionError("Please enter a valid fee amount");
      return;
    }
    setActionLoading("setFee");
    setActionError("");
    try {
      const updated = await coworkingDashboardService.setVenueHireFee(
        spaceId,
        orderId,
        fee,
      );
      setOrder(updated);
      onOrderUpdated?.();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError, "Failed to set venue hire fee"));
    } finally {
      setActionLoading(null);
    }
  };

  const isPending = order?.adminReviewStatus === "pending";
  const feeIsLocked = order ? ["paid", "confirmed", "completed", "cancelled"].includes(order.status) : false;

  // Pre-fill venue hire fee input: use DB value if set, otherwise auto-calculate recommendation
  useEffect(() => {
    if (!order) return;
    if (order.total.venueHireFee != null && order.total.venueHireFee > 0) {
      setVenueHireFeeInput(order.total.venueHireFee.toString());
    } else {
      // Auto-calculate recommended fee: 1:1 with subtotal, rounded down to nearest £250, min £250
      const subtotal = order.total.subtotal || 0;
      const recommended = Math.max(250, Math.floor(subtotal / 250) * 250);
      setVenueHireFeeInput(recommended.toString());
    }
  }, [order?.total.venueHireFee, order?.total.subtotal]);
  const sortedMealSessions = Array.isArray(order?.mealSessions)
    ? [...order.mealSessions].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.deliveryTime || "").localeCompare(b.deliveryTime || "");
      })
    : [];

  const responseEntries = useMemo(
    () =>
      order?.additionalAnswers
        ? Object.entries(order.additionalAnswers)
            .filter(([, value]) => Boolean(value))
            .sort(([leftKey], [rightKey]) => {
              const leftIndex = questionOrderIndex[leftKey] ?? Number.MAX_SAFE_INTEGER;
              const rightIndex =
                questionOrderIndex[rightKey] ?? Number.MAX_SAFE_INTEGER;

              if (leftIndex !== rightIndex) {
                return leftIndex - rightIndex;
              }

              return leftKey.localeCompare(rightKey);
            })
        : [],
    [order?.additionalAnswers],
  );
  const groupedResponseSections = useMemo(() => {
    if (responseEntries.length === 0) {
      return [] as ResponseSection[];
    }

    const seenKeys = new Set<string>();
    const sections = questionsConfig.sections
      .map((section): ResponseSection | null => {
        const responses = section.questions
          .map((question) => {
            const entry = responseEntries.find(([key]) => key === question.key);
            if (!entry) {
              return null;
            }

            seenKeys.add(question.key);
            return {
              key: question.key,
              value: entry[1],
              metadata: questionLookup[question.key],
            };
          })
          .filter((response): response is ResponseEntry => response !== null);

        if (responses.length === 0) {
          return null;
        }

        return {
          title: section.title,
          description: section.description,
          responses,
        };
      })
      .filter((section): section is ResponseSection => section !== null);

    const unknownResponses = responseEntries
      .filter(([key]) => !seenKeys.has(key))
      .map(([key, value]) => ({
        key,
        value,
        metadata: questionLookup[key],
      }));

    if (unknownResponses.length > 0) {
      sections.push({
        title: "Other Responses",
        description: undefined,
        responses: unknownResponses,
      });
    }

    return sections;
  }, [responseEntries]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-none max-h-[90vh] overflow-hidden rounded-t-3xl bg-white shadow-xl transition-transform duration-300 ease-out md:max-h-[85vh] md:max-w-lg md:rounded-2xl md:transition-none ${
          isSheetVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            {showResponses && (
              <button
                onClick={() => setShowResponses(false)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {showResponses ? "Booking Responses" : "Order Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div
          className={`flex w-[200%] transition-transform duration-300 ease-out ${
            showResponses ? "-translate-x-1/2" : "translate-x-0"
          }`}
        >
          <div className="w-1/2 max-h-[calc(85vh-73px)] overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : order ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                      statusBadgeColor[order.status] ||
                      "border-gray-300 bg-gray-100 text-gray-700"
                    }`}
                  >
                    {formatStatus(order.status)}
                  </span>
                  {order.adminReviewStatus === "pending" && (
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                      Awaiting Review
                    </span>
                  )}
                  {order.adminReviewStatus === "approved" && (
                    <span className="inline-flex items-center rounded-full border border-green-300 bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                      Approved
                    </span>
                  )}
                  {order.adminReviewStatus === "rejected" && (
                    <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                      Rejected
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Ordered: {formatDate(order.createdAt)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Member
                  </h3>
                  <div className="space-y-1.5 text-sm text-gray-700">
                    {order.member.name && (
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {order.member.name}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {order.member.email}
                    </p>
                    {order.member.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {order.member.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Booking
                  </h3>
                  <div className="space-y-1.5 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      Ref: {order.booking.reference}
                    </p>
                    {order.booking.venueName && (
                      <p className="flex items-center gap-2 font-semibold text-primary">
                        <MapPin className="h-4 w-4" />
                        {order.booking.venueName}
                      </p>
                    )}
                    {order.booking.room && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {order.booking.room}
                      </p>
                    )}
                    {order.booking.startTime && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDate(order.booking.startTime)}
                        {order.booking.endTime &&
                          ` - ${formatDate(order.booking.endTime)}`}
                      </p>
                    )}
                  </div>
                </div>

                {responseEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowResponses(true)}
                    className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                        <MessageSquareText className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          View Responses
                        </span>
                        <span className="block text-xs text-gray-600">
                          Review submitted booking answers
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </button>
                )}

                {sortedMealSessions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Catering Sessions Ordered
                    </h3>
                    <div className="space-y-2">
                      {sortedMealSessions.map((session, index) => (
                        <div
                          key={`${session.name}-${session.date}-${session.deliveryTime ?? "no-time"}-${index}`}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {index + 1}. {session.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {formatSessionDate(session.date)}
                            {session.deliveryTime
                              ? ` at ${session.deliveryTime}`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Summary
                    </h3>
                  </div>
                  <div className="space-y-2 border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Catering Price</span>
                      <span className="font-semibold">
                        {formatCurrency(order.total.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Delivery Price</span>
                      <span className="font-semibold">
                        {formatCurrency(order.total.deliveryFee)}
                      </span>
                    </div>
                    {feeIsLocked ? (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Event Hire Fee</span>
                        <span className="font-semibold">
                          {formatCurrency(order.total.venueHireFee || 0)}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                        <div className="flex items-center gap-1.5">
                          <label className="block text-xs font-semibold text-indigo-700">
                            Event Hire Fee
                          </label>
                          <div className="group relative">
                            <Info className="h-3.5 w-3.5 cursor-help text-indigo-400" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                              <p className="mb-2 font-semibold">How the event hire fee works:</p>
                              <ul className="list-disc space-y-1 pl-3.5">
                                <li>The pre-filled amount is an auto-calculated suggestion based on the catering subtotal.</li>
                                <li>You can adjust it to any amount before sending.</li>
                                <li>Clicking &quot;Send Quote&quot; saves the fee and emails the customer a full breakdown of their order total.</li>
                                <li>You can update the fee and resend at any time — the customer will receive an updated quote email.</li>
                                <li>Once the customer has paid, the fee can no longer be changed.</li>
                              </ul>
                              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={venueHireFeeInput}
                              onChange={(e) => setVenueHireFeeInput(e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-indigo-300 py-2 pl-7 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                          </div>
                          <button
                            onClick={handleSetVenueHireFee}
                            disabled={actionLoading !== null || !venueHireFeeInput}
                            className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading === "setFee" ? "Sending..." : "Send Quote"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatCurrency(
                          order.total.subtotal +
                          order.total.deliveryFee +
                          (parseFloat(venueHireFeeInput) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="space-y-3 border-t border-gray-200 pt-2">
                    {actionError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {actionError}
                      </div>
                    )}

                    {showRejectInput ? (
                      <div className="space-y-3">
                        <textarea
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Reason for rejection (optional)"
                          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                          rows={2}
                          maxLength={500}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleReject}
                            disabled={actionLoading !== null}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading === "reject" ? "Rejecting..." : "Confirm Reject"}
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectInput(false);
                              setRejectReason("");
                            }}
                            disabled={actionLoading !== null}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={handleApprove}
                          disabled={actionLoading !== null}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === "approve" ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve Order
                        </button>
                        <button
                          onClick={() => setShowRejectInput(true)}
                          disabled={actionLoading !== null}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Order
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="w-1/2 max-h-[calc(85vh-73px)] overflow-y-auto border-l border-gray-200 px-4 py-4 md:px-6 md:py-5">
            {!order || groupedResponseSections.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
                <MessageSquareText className="h-8 w-8 text-gray-400" />
                <p className="mt-4 text-sm font-semibold text-gray-900">
                  No responses available
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  This order does not include additional booking responses.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedResponseSections.map((section) => (
                  <section
                    key={section.title}
                    className="md:rounded-2xl md:border md:border-gray-200 md:bg-gray-50/70 md:p-4"
                  >
                    <div className="border-b border-gray-200 pb-2 md:pb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Section
                      </p>
                      <h3 className="mt-1 text-base font-bold text-gray-900">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="mt-2 text-sm text-gray-500">
                          {section.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 space-y-3 md:mt-4 md:space-y-4">
                      {section.responses.map(({ key, value, metadata }) => {
                        const isSignature =
                          metadata?.type === "signature" &&
                          value.startsWith("data:image");

                        return (
                          <div
                            key={key}
                            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:rounded-xl md:p-4"
                          >
                            <h4 className="text-sm font-semibold text-gray-900">
                              {metadata?.title || key}
                            </h4>
                            {metadata?.description && (
                              <p className="mt-1 text-sm leading-6 text-gray-500">
                                {metadata.description}
                              </p>
                            )}

                            <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.04] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                                Answer
                              </p>
                              {isSignature ? (
                                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                  <Image
                                    src={value}
                                    alt="Signature response"
                                    width={640}
                                    height={240}
                                    unoptimized
                                    className="h-auto w-full"
                                  />
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
                                  {value}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
