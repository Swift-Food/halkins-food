"use client";

import { PricingOrderItem } from "@/types/api/pricing.api.types";
import { Circle, CheckCircle2, Package, Truck, Store } from "lucide-react";

interface RestaurantStatusTimelineProps {
  restaurant: PricingOrderItem;
}

export function RestaurantStatusTimeline({ restaurant }: RestaurantStatusTimelineProps) {
  const timelineSteps = [
    { key: "pending", label: "Pending", icon: Circle },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "preparing", label: "Preparing", icon: Package },
    { key: "ready", label: "Ready", icon: Store },
    { key: "delivered", label: "Delivered", icon: Truck },
  ];

  const statusIndex = timelineSteps.findIndex((step) => step.key === restaurant.status);
  const isCancelled = restaurant.status === "cancelled" || restaurant.status === "rejected";

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-pink-100 p-2">
          <Store className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{restaurant.restaurantName}</h3>
          <p className="text-sm text-gray-500">Order Status</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= statusIndex;
            const isCurrent = index === statusIndex;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
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
              {restaurant.status === "rejected" ? "Order Rejected" : "Order Cancelled"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
