import { CateringPricingResult } from "@/types/catering.types";
import { useState } from "react";

interface PricingSummaryProps {
  pricing: CateringPricingResult | null;
  calculatingPricing: boolean;
  estimatedTotal?: number;
  hasDeliveryAddress?: boolean;
  compact?: boolean;
}

export default function PricingSummary({
  pricing,
  calculatingPricing,
  estimatedTotal,
  hasDeliveryAddress = false,
  compact = false,
}: PricingSummaryProps) {
  const [showPromotionBreakdown, setShowPromotionBreakdown] = useState(false);
  if (calculatingPricing && !pricing) {
    return (
      <div className={`text-center text-base-content/60 ${compact ? "py-2 text-xs" : "py-4 text-sm"}`}>
        Calculating pricing...
      </div>
    );
  }


  if (pricing && compact) {
    const pricingWithPromotions = pricing as CateringPricingResult & {
      promotionDiscount?: number;
      restaurantPromotionDiscount?: number;
      mealSessions?: Array<{ distanceInMiles?: number }>;
    };
    const promotionDiscount =
      pricingWithPromotions.promotionDiscount ??
      pricingWithPromotions.restaurantPromotionDiscount ??
      0;
    const distanceInMiles =
      pricing.distanceInMiles ??
      pricingWithPromotions.mealSessions?.[0]?.distanceInMiles;
    const hasDeliveryQuote =
      hasDeliveryAddress ||
      (typeof distanceInMiles === "number" && !Number.isNaN(distanceInMiles));

    return (
      <div className={`space-y-1.5 transition-opacity duration-200 ${calculatingPricing ? "opacity-50" : "opacity-100"}`}>
        <div className="flex justify-between text-xs text-base-content/70">
          <span>Subtotal</span>
          <span>£{pricing.subtotal.toFixed(2)}</span>
        </div>
        {promotionDiscount > 0 && (
          <div className="flex justify-between text-xs text-green-600 font-semibold">
            <span>Promotion Savings</span>
            <span>-£{promotionDiscount.toFixed(2)}</span>
          </div>
        )}
        {(pricing.promoDiscount ?? 0) > 0 && (
          <div className="flex justify-between text-xs text-success font-medium">
            <span>Promo Code</span>
            <span>-£{pricing.promoDiscount!.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-base-content/70">
          <div className="flex items-center gap-1">
            <span>Delivery</span>
            <div className="relative group">
              <button type="button" className="text-base-content/30 hover:text-base-content/60 leading-none">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-0 mb-1.5 w-52 hidden group-hover:block z-50">
                <div className="bg-base-content text-base-100 text-[10px] leading-relaxed rounded-lg px-2.5 py-2 shadow-lg">
                  Based on number of restaurants, distance to your delivery address, and catering order size.
                </div>
              </div>
            </div>
          </div>
          {!hasDeliveryQuote ? (
            <span className="italic text-base-content/50">TBC</span>
          ) : (
            <span>£{pricing.deliveryFee.toFixed(2)}</span>
          )}
        </div>
        <div className="flex justify-between border-t border-base-300 pt-2 text-sm font-bold text-base-content">
          <span>Total</span>
          <div className="text-right">
            {!hasDeliveryQuote ? (
              <div>
                <p>£{pricing.subtotal.toFixed(2)}</p>
                <p className="text-[10px] font-normal text-base-content/50">+ delivery (address required)</p>
              </div>
            ) : (
              <p>£{pricing.total.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pricing) {
    const pricingWithPromotions = pricing as CateringPricingResult & {
      promotionDiscount?: number;
      restaurantPromotionDiscount?: number;
      appliedPromotions?: Array<{
        restaurantId: string;
        promotionId: string;
        name: string;
        promotionType: string;
        discountPercentage: number | string;
        discountTiers?: Array<{
          minQuantity: number;
          discountPercentage: number;
        }> | null;
        discount: number;
      }>;
      mealSessions?: Array<{
        sessionName?: string;
        deliveryFee: number;
        deliveryFeeBreakdown?: {
          baseFee: number;
          portionFee: number;
          drinksFee: number;
          subtotal: number;
          distanceMultiplier: number;
          finalDeliveryFee: number;
          requiresCustomQuote: boolean;
        };
        distanceInMiles?: number;
      }>;
    };

    // Extract delivery breakdown from meal sessions if available
    const deliveryBreakdown = pricing.deliveryFeeBreakdown ||
      pricingWithPromotions.mealSessions?.[0]?.deliveryFeeBreakdown;
    const distanceInMiles = pricing.distanceInMiles ||
      pricingWithPromotions.mealSessions?.[0]?.distanceInMiles;
    const promotionDiscount =
      pricingWithPromotions.promotionDiscount ??
      pricingWithPromotions.restaurantPromotionDiscount ??
      0;
    const appliedPromotions = pricingWithPromotions.appliedPromotions ?? [];
    const hasDistanceQuote =
      typeof distanceInMiles === "number" && !Number.isNaN(distanceInMiles);
    const hasDeliveryQuote =
      hasDeliveryAddress || hasDistanceQuote || deliveryBreakdown !== undefined;
    return (
      <div className={`space-y-4 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] p-4 transition-opacity duration-200 ${calculatingPricing ? "opacity-50" : "opacity-100"}`}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Pending Balance
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Catering is shown at its current total, while venue hire remains estimated.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            The deposit below is paid now and deducted from the final amount later.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45">
                Catering
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-base-content/70">
              <span>Food subtotal</span>
              <span>£{pricing.subtotal.toFixed(2)}</span>
            </div>

            {promotionDiscount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between items-start text-sm text-green-600 font-semibold gap-2">
                  <div className="flex items-center gap-2">
                    <span>Promotion Savings</span>
                    {appliedPromotions.length > 0 && (
                      <button
                        onClick={() => setShowPromotionBreakdown(!showPromotionBreakdown)}
                        className="text-green-600/70 hover:text-green-700"
                        type="button"
                        aria-label={showPromotionBreakdown ? "Hide promotion breakdown" : "Show promotion breakdown"}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${showPromotionBreakdown ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <span>-£{promotionDiscount.toFixed(2)}</span>
                </div>

                {showPromotionBreakdown && appliedPromotions.length > 0 && (
                  <div className="pl-4 space-y-1 text-xs text-green-700/90">
                    {appliedPromotions.map((promotion) => (
                      <div key={promotion.promotionId} className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate">{promotion.name}</p>
                        </div>
                        <span className="whitespace-nowrap">-£{promotion.discount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between items-start text-sm text-base-content/70 gap-2">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="whitespace-nowrap">Delivery Cost</span>
                  <div className="relative group">
                    <button type="button" className="text-base-content/30 hover:text-base-content/60 leading-none">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <div className="absolute bottom-full left-0 mb-1.5 w-52 hidden group-hover:block z-50">
                      <div className="bg-base-content text-base-100 text-[10px] leading-relaxed rounded-lg px-2.5 py-2 shadow-lg">
                        Based on number of restaurants, distance to your delivery address, and catering order size.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!hasDeliveryQuote ? (
                    <span className="text-base-content/50 text-xs italic">Enter address for quote</span>
                  ) : (
                    <span>£{pricing.deliveryFee.toFixed(2)}</span>
                  )}
                </div>
              </div>
              {deliveryBreakdown?.requiresCustomQuote && (
                <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2 text-warning-content">
                  <p className="text-xs">
                    Delivery exceeds 6 miles. Final fee subject to review.
                  </p>
                </div>
              )}
            </div>

            {(pricing.promoDiscount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-success font-medium">
                <span>Promo Code Discount</span>
                <span>-£{pricing.promoDiscount!.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between border-t border-base-300 pt-3 text-lg font-bold text-base-content">
            <span>Catering total</span>
            <div className="text-right">
              {!hasDeliveryQuote ? (
                <div>
                  <p>£{pricing.subtotal.toFixed(2)}</p>
                  <p className="text-xs font-normal text-base-content/50">+ delivery once quoted</p>
                </div>
              ) : (
                <>
                  <p>£{pricing.total.toFixed(2)}</p>
                  {(pricing.totalDiscount ?? 0) > 0 && (
                    <p className="text-xs font-normal line-through text-base-content/50">
                      £{(pricing.subtotal + pricing.deliveryFee).toFixed(2)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {(pricing.venueHireFee ?? 0) > 0 && (
          <div className="rounded-2xl border border-base-300 bg-[linear-gradient(180deg,#fffdf7_0%,#fff9eb_100%)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800/55">
              Venue
            </p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Estimated Hire Fee</p>
              </div>
              <p className="text-lg font-bold text-slate-900">
                £{pricing.venueHireFee!.toFixed(2)}
              </p>
            </div>
          </div>
        )}

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
