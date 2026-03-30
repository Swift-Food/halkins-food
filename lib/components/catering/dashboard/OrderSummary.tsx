"use client";

import React, { useState } from "react";
import { CateringOrderResponse } from "@/types/api";
import { Receipt } from "lucide-react";

interface OrderSummaryProps {
  order: CateringOrderResponse;
}

export default function OrderSummary({ order }: OrderSummaryProps) {
  const [showDeliveryBreakdown, setShowDeliveryBreakdown] = useState(false);
  const coworkingOrder = order as CateringOrderResponse & {
    venueHireFee?: number;
    depositAmount?: number;
    depositStatus?: string;
    adminReviewStatus?: string;
  };
  const hasApprovedVenueHireFee =
    coworkingOrder.adminReviewStatus === "approved" &&
    (coworkingOrder.venueHireFee ?? 0) > 0;
  const isVenueFeePendingReview =
    coworkingOrder.adminReviewStatus !== "approved";
  const mealSessions = coworkingOrder.mealSessions as
    | Array<{
        sessionName?: string;
        deliveryFee?: number;
        deliveryFeeBreakdown?: {
          requiresCustomQuote?: boolean;
        };
        distanceInMiles?: number;
      }>
    | undefined;


  // Extract delivery breakdown from meal sessions if available
  const deliveryBreakdown = mealSessions?.[0]?.deliveryFeeBreakdown;
  const distanceInMiles = mealSessions?.[0]?.distanceInMiles;
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" />
        Order Summary
      </h3>
      <div className="space-y-2 sm:space-y-3">
        <div className="flex justify-between text-gray-700 text-sm sm:text-base">
          <span className="font-medium">Subtotal:</span>
          <span className="font-semibold">
            £{Number(order.subtotal).toFixed(2)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-start text-gray-700 text-sm sm:text-base gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-medium whitespace-nowrap">Delivery Fee:</span>
              {typeof distanceInMiles === "number" && distanceInMiles > 0 && (
                <span className="text-xs text-gray-500">
                  ({distanceInMiles.toFixed(1)} mi)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-semibold">
                £{Number(order.deliveryFee).toFixed(2)}
              </span>
              {deliveryBreakdown && mealSessions && (
                <button
                  onClick={() => setShowDeliveryBreakdown(!showDeliveryBreakdown)}
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                  type="button"
                >
                  {showDeliveryBreakdown ? "hide" : "details"}
                </button>
              )}
            </div>
          </div>

          {/* Delivery fee breakdown - Show per session */}
          {showDeliveryBreakdown && mealSessions && (
            <div className="pl-4 space-y-1 text-xs text-gray-600">
              {mealSessions.map((session, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{session.sessionName}:</span>
                  <span>£{Number(session.deliveryFee || 0).toFixed(2)}</span>
                </div>
              ))}
              {deliveryBreakdown?.requiresCustomQuote && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                  <p className="text-xs">
                    ⚠️ Delivery exceeded 6 miles. Custom quote applied.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {(order.promoDiscount ?? 0) > 0 && (
          <div className="flex justify-between text-green-600 text-sm sm:text-base">
            <span className="font-semibold">Promo Discount:</span>
            <span className="font-bold">
              -£{Number(order.promoDiscount).toFixed(2)}
            </span>
          </div>
        )}

        {order.promoCodes && order.promoCodes.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Applied Promo Codes:</p>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {order.promoCodes.map((code, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-lg sm:text-xl font-bold text-gray-900 pt-1 sm:pt-2">
          <span>Catering Total:</span>
          <span className="text-primary">
            £{Number(order.finalTotal ?? order.estimatedTotal).toFixed(2)}
          </span>
        </div>

        {(hasApprovedVenueHireFee || isVenueFeePendingReview) && (
          <div className="pt-2 sm:pt-3 border-t border-gray-200">
            <div className="flex justify-between text-gray-700 text-sm sm:text-base">
              <span className="font-medium">
                {hasApprovedVenueHireFee ? "Venue Hire Fee:" : "Estimated Venue Hire Fee:"}
              </span>
              {hasApprovedVenueHireFee ? (
                <span className="font-semibold">
                  £{Number(coworkingOrder.venueHireFee).toFixed(2)}
                </span>
              ) : (
                <span className="font-semibold text-gray-400">Pending</span>
              )}
            </div>
            {isVenueFeePendingReview && (
              <p className="mt-1 text-xs text-gray-500">
                Awaiting venue organiser review to confirm the final fee.
              </p>
            )}
          </div>
        )}

        {(coworkingOrder.depositAmount ?? 0) > 0 && (
          <div className="pt-2 sm:pt-3 border-t border-gray-200">
            <div className="flex justify-between text-gray-700 text-sm sm:text-base">
              <span className="font-medium">Deposit Amount:</span>
              <span className="font-semibold text-blue-600">
                £{Number(coworkingOrder.depositAmount).toFixed(2)}
              </span>
            </div>
            {coworkingOrder.depositStatus ? (
              <p className="mt-1 text-xs text-gray-500">
                Deposit status: {coworkingOrder.depositStatus}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Payment Status */}
      {order.paidAt && (
        <div className="mt-3 sm:mt-4 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <p className="text-xs sm:text-sm font-semibold text-green-900">
              Payment Received
            </p>
          </div>
          <p className="text-xs text-green-700">
            Paid on{" "}
            {new Date(order.paidAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {order.paymentLinkUrl && !order.paidAt && (
        <div className="mt-3 sm:mt-4">
          <a
            href={order.paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-primary text-white text-center py-2.5 sm:py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            Complete Payment
          </a>
        </div>
      )}
    </div>
  );
}
