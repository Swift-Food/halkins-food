"use client";

import { useState } from "react";
import {
  DashboardOrderSummary,
  DashboardOrderStatusFilter,
  DashboardOrderTier,
} from "@/types/api";
import {
  AlertTriangle,
  Archive,
  CalendarRange,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Hash,
  List,
  MapPin,
  PlayCircle,
  User,
  XCircle,
} from "lucide-react";

interface OrdersListProps {
  orders: DashboardOrderSummary[];
  activeTier: DashboardOrderTier;
  activeStatus: DashboardOrderStatusFilter;
  pendingCount: number;
  onTierChange: (tier: DashboardOrderTier) => void;
  onStatusChange: (status: DashboardOrderStatusFilter) => void;
  onOrderClick: (orderId: string) => void;
  onQuickApprove: (orderId: string) => Promise<void>;
  loading: boolean;
}

const activeTierTabs: {
  value: DashboardOrderStatusFilter;
  label: string;
  icon: typeof Clock;
}[] = [
  { value: "all", label: "All", icon: List },
  { value: "needs_review", label: "Needs Review", icon: AlertTriangle },
  { value: "upcoming", label: "Upcoming", icon: Clock },
];

const archiveTierTabs: {
  value: DashboardOrderStatusFilter;
  label: string;
  icon: typeof Clock;
}[] = [
  { value: "all", label: "All", icon: List },
  { value: "completed", label: "Completed", icon: CheckCircle },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

const statusBadgeColor: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  admin_reviewed: "bg-blue-100 text-blue-800 border-blue-300",
  restaurant_reviewed: "bg-indigo-100 text-indigo-800 border-indigo-300",
  payment_link_sent: "bg-purple-100 text-purple-800 border-purple-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabel: Record<string, string> = {
  pending_review: "Under Review",
  approved: "Approved",
  admin_reviewed: "Awaiting Restaurants",
  restaurant_reviewed: "Awaiting Payment",
  payment_link_sent: "Invoice Sent",
  paid: "Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeOnly(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function OrdersList({
  orders,
  activeTier,
  activeStatus,
  pendingCount,
  onTierChange,
  onStatusChange,
  onOrderClick,
  onQuickApprove,
  loading,
}: OrdersListProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleQuickApprove = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setApprovingId(orderId);
    try {
      await onQuickApprove(orderId);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    orderId: string,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOrderClick(orderId);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Tier + Status Tabs */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Orders</h2>

          <div className="flex items-center gap-2">
          {/* Tier segmented control */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => onTierChange("active")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTier === "active"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Active
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onTierChange("archive")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTier === "archive"
                  ? "bg-white text-gray-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>
          </div>
        </div>

        {/* Subtab filters — underline style to visually distinguish from tier toggle */}
        <div className="flex gap-0 overflow-x-auto border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6">
          {(activeTier === "active" ? activeTierTabs : archiveTierTabs).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStatus === tab.value;
            const isNeedsReview = tab.value === "needs_review";
            return (
              <button
                key={tab.value}
                onClick={() => onStatusChange(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive
                    ? isNeedsReview
                      ? "border-amber-500 text-amber-700"
                      : "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {isNeedsReview && pendingCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <List className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No orders found</p>
            <p className="text-sm mt-1">
              {activeStatus === "needs_review"
                ? "No orders are currently awaiting your review."
                : activeTier === "archive"
                ? "No past orders found."
                : "There are no orders with this status yet."}
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const needsReview =
              order.adminReviewStatus === "pending_admin_review";
            const isApproving = approvingId === order.id;

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => onOrderClick(order.id)}
                onKeyDown={(e) => handleRowKeyDown(e, order.id)}
                className={`w-full flex items-center gap-4 p-4 sm:px-6 sm:py-5 transition-colors text-left ${
                  needsReview
                    ? "border-l-4 border-amber-400 bg-amber-50/40 hover:bg-amber-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {needsReview ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-800 border-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        Review Required
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          statusBadgeColor[order.status] ||
                          "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                      >
                        {order.status === "pending_review" && order.adminReviewStatus === "approved"
                          ? "Awaiting Swift Food Review"
                          : statusLabel[order.status] || order.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {order.memberName || order.memberEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {order.bookingReference}
                    </span>
                    {order.roomLocationDetails && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {order.roomLocationDetails}
                      </span>
                    )}
                  </div>

                  {/* Dates row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                    <span>
                      <span className="font-medium text-gray-500">Created: </span>
                      {formatDate(order.createdAt)}
                    </span>
                    {order.bookingStartTime && (
                      <span className="flex items-center gap-1 flex-wrap">
                        <CalendarRange className="h-3 w-3 shrink-0" />
                        <span className="font-medium text-gray-500">Booking:</span>
                        <span className="whitespace-nowrap">{formatDate(order.bookingStartTime)}</span>
                        {order.bookingEndTime && (
                          <span className="whitespace-nowrap">
                            {"– "}
                            {isSameDay(order.bookingStartTime, order.bookingEndTime)
                              ? formatTimeOnly(order.bookingEndTime)
                              : formatDate(order.bookingEndTime)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 text-sm">
                    <span className="text-gray-500">
                      {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      £{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {needsReview ? (
                  <button
                    onClick={(e) => handleQuickApprove(e, order.id)}
                    disabled={isApproving}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isApproving ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
