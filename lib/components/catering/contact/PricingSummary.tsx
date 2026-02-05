import { CateringPricingResult } from "@/types/catering.types";
import { useState } from "react";

interface PricingSummaryProps {
  pricing: CateringPricingResult | null;
  calculatingPricing: boolean;
  estimatedTotal?: number;
}

export default function PricingSummary({
  pricing,
  calculatingPricing,
  estimatedTotal,
}: PricingSummaryProps) {
  const [showDeliveryBreakdown, setShowDeliveryBreakdown] = useState(false);
  if (calculatingPricing) {
    return (
      <div className="text-center py-4 text-base-content/60 text-sm">
        Calculating pricing...
      </div>
    );
  }


  if (pricing) {
    // Extract delivery breakdown from meal sessions if available
    const deliveryBreakdown = pricing.deliveryFeeBreakdown ||
      (pricing as any).mealSessions?.[0]?.deliveryFeeBreakdown;
    const distanceInMiles = pricing.distanceInMiles ||
      (pricing as any).mealSessions?.[0]?.distanceInMiles;
    return (
      <div className="space-y-2 pt-4 border-t border-base-300">
        {/* Subtotal */}
        <div className="flex justify-between text-sm text-base-content/70">
          <span>Subtotal</span>
          <span>£{pricing.subtotal.toFixed(2)}</span>
        </div>

        {/* Restaurant Promotion Discount */}
        {(pricing.restaurantPromotionDiscount ?? 0) > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-semibold">
            <span>Restaurant Promotion</span>
            <span>-£{pricing.restaurantPromotionDiscount!.toFixed(2)}</span>
          </div>
        )}

        {/* Delivery fee */}
        <div className="space-y-1">
          <div className="flex justify-between items-start text-sm text-base-content/70 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="whitespace-nowrap">Delivery Cost</span>
              
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!distanceInMiles ? (
                <span className="text-base-content/50 text-xs italic">Enter address for quote</span>
              ) : (
                <>
                  {deliveryBreakdown && (
                    <button
                      onClick={() => setShowDeliveryBreakdown(!showDeliveryBreakdown)}
                      className="text-base-content/40 hover:text-base-content/70"
                      type="button"
                      aria-label={showDeliveryBreakdown ? "Hide breakdown" : "Show breakdown"}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${showDeliveryBreakdown ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  <span>£{pricing.deliveryFee.toFixed(2)}</span>
                  
                </>
              )}
            </div>
          </div>

          {/* Delivery fee breakdown - Show per session */}
          {showDeliveryBreakdown && (pricing as any).mealSessions && (
            <div className="pl-4 space-y-1 text-xs text-base-content/60">
              {(pricing as any).mealSessions.map((session: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{session.sessionName}:</span>
                  <span>£{session.deliveryFee.toFixed(2)}</span>
                </div>
              ))}
              
            </div>
          )}
          {deliveryBreakdown?.requiresCustomQuote && (
            <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded text-warning-content">
              <p className="text-xs">
                ⚠️ Delivery exceeds 6 miles. Final fee subject to review.
              </p>
            </div>
          )}
        </div>

        {/* Promo code discount */}
        {(pricing.promoDiscount ?? 0) > 0 && (
          <div className="flex justify-between text-sm text-success font-medium">
            <span>Promo Code Discount</span>
            <span>-£{pricing.promoDiscount!.toFixed(2)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-bold text-base-content pt-3 border-t border-base-300">
          <span>Total</span>
          <div className="text-right">
            {!distanceInMiles ? (
              <div>
                <p>£{pricing.subtotal.toFixed(2)}</p>
                <p className="text-xs font-normal text-base-content/50">+ delivery (address required)</p>
              </div>
            ) : (
              <>
                <p>£{pricing.total.toFixed(2)}</p>
                {(pricing.totalDiscount ?? 0) > 0 && (
                  <p className="text-xs line-through text-base-content/50">
                    £{(pricing.subtotal + pricing.deliveryFee).toFixed(2)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (estimatedTotal !== undefined) {
    return (
      <div className="flex justify-between pt-4 border-t border-base-300">
        <span className="font-semibold text-base-content">
          Estimated Total:
        </span>
        <span className="font-bold text-xl text-base-content">
          £{estimatedTotal.toFixed(2)}
        </span>
      </div>
    );
  }

  return null;
}
