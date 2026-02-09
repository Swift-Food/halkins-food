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
  Package,
  Receipt,
} from "lucide-react";

interface OrderDetailModalProps {
  spaceId: string;
  orderId: string;
  onClose: () => void;
}

const statusBadgeColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

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

export default function OrderDetailModal({
  spaceId,
  orderId,
  onClose,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<DashboardOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await coworkingDashboardService.getOrder(spaceId, orderId);
        setOrder(data);
      } catch (err: any) {
        setError(err.message || "Failed to load order details");
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
              <span className="loading loading-spinner loading-md text-pink-500" />
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
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDate(order.createdAt)}
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

              {/* Estimated Delivery */}
              {order.estimatedDelivery && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Clock className="h-4 w-4" />
                    Est. Delivery: {formatDate(order.estimatedDelivery)}
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items ({order.items.length})
                </h3>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.quantity}x {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-gray-700 ml-3">
                        £{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-pink-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>£{order.total.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>£{order.total.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-pink-600">
                    £{order.total.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
