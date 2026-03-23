"use client";

import { useState } from "react";
import { DashboardOrderSummary, DashboardOrderStatusFilter } from "@/types/api";
import {
  AlertTriangle,
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
  activeStatus: DashboardOrderStatusFilter;
  pendingCount: number;
  onStatusChange: (status: DashboardOrderStatusFilter) => void;
  onOrderClick: (orderId: string) => void;
  onQuickApprove: (orderId: string) => Promise<void>;
  loading: boolean;
}

const statusTabs: {
  value: DashboardOrderStatusFilter;
  label: string;
  icon: typeof Clock;
  color: string;
}[] = [
  {
    value: "all",
    label: "All",
    icon: List,
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: "needs_review",
    label: "Needs Review",
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-700",
  },
  {
    value: "upcoming",
    label: "Upcoming",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "active",
    label: "Active",
    icon: PlayCircle,
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "bg-green-100 text-green-700",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
  },
];

const statusBadgeColor: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
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

export default function OrdersList({
  orders,
  activeStatus,
  pendingCount,
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
      {/* Status Tabs */}
      <div className="border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          Orders
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-3 -mb-px">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStatus === tab.value;
            const isNeedsReview = tab.value === "needs_review";
            return (
              <button
                key={tab.value}
                onClick={() => onStatusChange(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? isNeedsReview
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "bg-primary/10 text-primary border border-primary/30"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {isNeedsReview && pendingCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold bg-amber-500 text-white">
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
                : "There are no orders with this status yet."}
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const needsReview =
              order.adminReviewStatus === "pending" &&
              order.status == "pending_review";
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
                    {needsReview && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-800 border-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        Review Required
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(order.createdAt)}
                    </span>
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
