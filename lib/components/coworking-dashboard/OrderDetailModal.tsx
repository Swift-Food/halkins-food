"use client";

import { useEffect, useState } from "react";
import { DashboardOrderDetailResponse } from "@/types/api";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
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
} from "lucide-react";

interface OrderDetailModalProps {
  spaceId: string;
  orderId: string;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

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

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await coworkingDashboardService.getOrder(spaceId, orderId);
        setOrder(data);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Failed to load order details"));
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [spaceId, orderId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to approve order"));
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
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to reject order"));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          ) : order ? (
            <>
              {/* Status & Date */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
                    statusBadgeColor[order.status] ||
                    "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {formatStatus(order.status)}
                </span>
                {order.adminReviewStatus === "pending" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-amber-100 text-amber-800 border-amber-300">
                    Awaiting Review
                  </span>
                )}
                {order.adminReviewStatus === "approved" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-green-100 text-green-800 border-green-300">
                    Approved
                  </span>
                )}
                {order.adminReviewStatus === "rejected" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-red-100 text-red-800 border-red-300">
                    Rejected
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  Ordered: {formatDate(order.createdAt)}
                </span>
              </div>

              {/* Member Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
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

              {/* Booking Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
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

              {sortedMealSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
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

              {/* Summary */}
              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Summary
                  </h3>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-200">
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
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(order.total.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approve / Reject Actions */}
              {isPending && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  {actionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {actionError}
                    </div>
                  )}

                  {showRejectInput ? (
                    <div className="space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={actionLoading !== null}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === "reject" ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectInput(false);
                            setRejectReason("");
                          }}
                          disabled={actionLoading !== null}
                          className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject Order
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
