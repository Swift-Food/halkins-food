/**
 * API TYPE DEFINITIONS - Pricing Breakdown DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/features/payment-features/pricing/dto/order-pricing-breakdown.dto.ts
 * Backend: src/features/order-management/catering/dto/restaurant-payout-response.dto.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 */

import { PricingOrderItem } from './pricing.api.types';

/**
 * Order pricing breakdown from pricing engine
 * Backend: OrderPricingBreakdownDto
 */
export interface OrderPricingBreakdown {
  // Identification
  orderId: string;
  orderType: 'CATERING' | 'CORPORATE' | 'CONSUMER';

  // Customer totals
  customerSubtotal: number;
  customerDeliveryFee: number;
  customerServiceCharge: number;
  promoCodeDiscount: number;
  customerFinalTotal: number;

  // Promo code info
  promoCode?: string;
  promoCodeAbsorbedBy?: 'PLATFORM' | 'RESTAURANT';

  // Per-restaurant breakdown
  restaurants: PricingOrderItem[];

  // Platform totals
  platformCommissionRevenue: number;
  platformAbsorbedDiscountTotal: number;
  platformNetRevenue: number;

  // Restaurant totals
  restaurantsTotalGross: number;
  restaurantsTotalNet: number;

  // Discount summary
  totalDiscountAmount: number;
  discountedItemsCount: number;
  totalItemsCount: number;
}

/**
 * Menu item in restaurant payout
 * Backend: RestaurantPayoutMenuItemDto
 */
export interface RestaurantPayoutMenuItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addon?: string;
}

/**
 * Restaurant payout information
 * Backend: RestaurantPayoutDto
 */
export interface RestaurantPayout {
  restaurantName: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  menuItems: RestaurantPayoutMenuItem[];
}

/**
 * Restaurant payouts response
 * Backend: RestaurantPayoutsResponseDto
 * Maps restaurant IDs to their payout details
 */
export interface RestaurantPayoutsResponse {
  [restaurantId: string]: RestaurantPayout;
}
