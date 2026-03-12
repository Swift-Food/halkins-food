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
  Hash,
  MapPin,
  Clock,
  Receipt,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
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
  title: string;
  questions: QuestionSchema[];
}

interface QuestionsConfig {
  sections: SectionSchema[];
}

const questionsConfig = questionsConfigJson as QuestionsConfig;
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

  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | null
  >(null);
  const [actionError, setActionError] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showResponses, setShowResponses] = useState(false);

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

  const isPending = order?.adminReviewStatus === "pending";
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
        ? Object.entries(order.additionalAnswers).filter(([, value]) =>
            Boolean(value),
          )
        : [],
    [order?.additionalAnswers],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl">
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
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Venue Hire</span>
                      <span className="font-semibold">
                        {formatCurrency(order.total.venueHireFee)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatCurrency(order.total.total)}
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

          <div className="w-1/2 max-h-[calc(85vh-73px)] overflow-y-auto border-l border-gray-200 px-6 py-5">
            {!order || responseEntries.length === 0 ? (
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
                {responseEntries.map(([key, value]) => {
                  const metadata = questionLookup[key];
                  const isSignature =
                    metadata?.type === "signature" && value.startsWith("data:image");

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        {metadata?.sectionTitle || "Response"}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        {metadata?.title || key}
                      </h3>
                      {metadata?.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {metadata.description}
                        </p>
                      )}
                      {isSignature ? (
                        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
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
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-700">
                          {value}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
