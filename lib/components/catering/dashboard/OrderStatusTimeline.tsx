"use client";

import { CateringOrderStatus } from "@/types/catering.types";
import { CateringOrderStatus as ApiCateringOrderStatus } from "@/types/api";
import {
  Clock,
  Search,
  CheckCircle2,
  CreditCard,
  Package,
  XCircle,
  ClipboardList,
} from "lucide-react";

interface OrderStatusTimelineProps {
  status: CateringOrderStatus | ApiCateringOrderStatus;
}

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const timelineSteps = [
    { keys: [CateringOrderStatus.PENDING_REVIEW], label: "Submitted", icon: Clock },
    { keys: [CateringOrderStatus.ADMIN_REVIEWED, CateringOrderStatus.RESTAURANT_REVIEWED], label: "Reviewing", icon: Search },
    { keys: [CateringOrderStatus.PAYMENT_LINK_SENT], label: "Payment", icon: CreditCard },
    { keys: [CateringOrderStatus.PAID, CateringOrderStatus.CONFIRMED], label: "Confirmed", icon: CheckCircle2 },
    { keys: [CateringOrderStatus.COMPLETED], label: "Delivered", icon: Package },
  ];

  const statusIndex = timelineSteps.findIndex((step) => step.keys.includes(status as CateringOrderStatus));
  const isCancelled = status === CateringOrderStatus.CANCELLED;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-pink-100 p-2">
          <ClipboardList className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Order Progress</h3>
          <p className="text-sm text-gray-500">Track your order status</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= statusIndex;
            const isCurrent = index === statusIndex;

            return (
              <div key={step.keys[0]} className="flex flex-col items-center flex-1">
                <div className="relative flex items-center w-full">
                  {index > 0 && (
                    <div
                      className={`flex-1 h-1 ${
                        isCompleted && !isCancelled ? "bg-pink-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                      isCancelled
                        ? "border-red-500 bg-red-50"
                        : isCompleted
                          ? "border-pink-500 bg-pink-100"
                          : "border-gray-200 bg-white"
                    } ${isCurrent && !isCancelled ? "ring-2 sm:ring-4 ring-pink-200" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        isCancelled
                          ? "text-red-500"
                          : isCompleted
                            ? "text-pink-500"
                            : "text-gray-400"
                      }`}
                    />
                  </div>
                  {index < timelineSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 ${
                        isCompleted && !isCancelled ? "bg-pink-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
                <div className="mt-2 text-center px-1">
                  <p
                    className={`text-xs font-medium ${
                      isCancelled
                        ? "text-red-500"
                        : isCompleted
                          ? "text-gray-900"
                          : "text-gray-400"
                    }`}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {isCancelled && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-500 border border-red-200">
              <XCircle className="w-4 h-4" />
              Order Cancelled
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
