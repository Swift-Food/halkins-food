/**
 * API TYPE DEFINITIONS - Catering Order DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/features/order-management/catering/dto/catering-order-response.dto.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 * Any field name changes here MUST be reflected in the backend
 */

import { PricingOrderItem } from './pricing.api.types';

/**
 * Catering order status enum
 * Backend: CateringOrderStatus
 */
export type CateringOrderStatus =
  | 'pending_review'
  | 'admin_reviewed'
  | 'restaurant_reviewed'
  | 'payment_link_sent'
  | 'paid'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

// ============================================================================
// APPLIED PROMOTIONS TYPES
// ============================================================================

/**
 * Applied promotion details
 * Backend: Used in appliedPromotions JSONB field
 */
export interface AppliedPromotion {
  id: string;
  name: string;
  type: string;
  discountAmount: number;
}

/**
 * Map of restaurant IDs to their applied promotions
 */
export interface AppliedPromotionsMap {
  [restaurantId: string]: AppliedPromotion[];
}

// ============================================================================
// MEAL SESSION TYPES (Multi-meal order support)
// ============================================================================

/**
 * Represents a single meal session within a catering order
 * Backend: MealSession entity (src/shared/entities/orders/mealSessions.entity.ts)
 *
 * Supports multi-meal orders (e.g., breakfast, lunch, dinner in one submission)
 */
export interface MealSessionResponse {
  id: string;
  cateringOrderId: string;

  // Session identification
  sessionName: string; // "Breakfast", "Lunch", "Dinner", "Main Event", etc.
  sessionOrder: number; // 1, 2, 3... for sorting

  // Session date & time
  sessionDate: string | Date; // Date of this specific meal
  eventTime: string; // "09:00" - when the event/meal starts
  collectionTime: string; // "08:00" - when restaurant should prepare/deliver

  // Session details
  guestCount?: number; // Guest count for this specific meal
  specialRequirements?: string; // Meal-specific requirements

  // Order items for this session
  orderItems: PricingOrderItem[];

  // Session pricing
  subtotal: number;
  deliveryFee: number;
  serviceCharge: number;
  promoDiscount: number;
  promotionDiscount: number;
  sessionTotal: number;

  // Applied promotions for this session
  appliedPromotions?: AppliedPromotionsMap;

  // Restaurant coordination for this session
  restaurantReviews?: string[]; // Restaurant IDs that have reviewed this session
  restaurantRejections?: string[]; // Restaurant IDs that have rejected this session
  restaurantCollectionTimes?: any;

  // Session status tracking
  reminder24HourSent: boolean;
  reminder1HourSent: boolean;
  deliveryTimeChangedAt?: string | Date;
  deliveryTimeChangedBy?: string;

  // Timestamps
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Complete catering order response with pricing breakdown
 * Backend: CateringOrderResponseDto
 *
 * Note: This is a SUBSET of fields - backend returns more fields for internal use.
 * Only commonly used frontend fields are typed here.
 */
export interface CateringOrderResponse {
  id: string;
  orderReference?: string;
  userId?: string;

  // Customer contact information
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  organization?: string;
  publicNote?: string;
  internalNote?: string;
  ccEmails?: string[];
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Event details (represents primary/first meal session for backward compatibility)
  eventDate: string | Date;
  deliveryDate?: string | Date; // Alias for eventDate
  eventTime: string;
  deliveryTime?: string; // Alias for eventTime
  collectionTime?: string;
  guestCount?: number;
  eventType?: string;
  deliveryAddress?: string | {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  specialRequirements?: string;
  specialInstructions?: string; // Alias for specialRequirements

  // ============================================================
  // MEAL SESSIONS (Multi-meal order support)
  // For SINGLE-MEAL orders: mealSessions will have 1 item or be undefined
  // For MULTI-MEAL orders: mealSessions contains all meals
  // ============================================================
  mealSessions?: MealSessionResponse[];

  // Order items (kept for backward compatibility)
  // For SINGLE-MEAL orders: contains the actual order items
  // For MULTI-MEAL orders: aggregated view of all meal sessions
  restaurants: PricingOrderItem[];
  orderItems?: any[]; // Legacy format

  // Restaurant coordination (aggregated across all sessions for multi-meal)
  restaurantReviews?: string[];
  restaurantRejections?: string[];

  // Pricing (Grand totals across all meal sessions)
  subtotal?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  promoDiscount?: number;
  promotionDiscount?: number;
  depositAmount?: number;
  estimatedTotal?: number;
  finalTotal?: number;
  promoCodes?: string[];
  appliedPromotions?: AppliedPromotionsMap;

  // Order totals
  customerFinalTotal: number;
  platformCommissionRevenue: number;
  restaurantsTotalGross: number;
  restaurantsTotalNet: number;

  // Status & payment
  status: CateringOrderStatus;
  paid: boolean;
  paymentId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paymentLinkUrl?: string;
  paymentLinkSentAt?: string | Date;
  paidAt?: string | Date;

  // Admin & review
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string | Date;
  reminder24HourSent?: boolean;
  reminder1HourSent?: boolean;

  // Shared access
  accessToken?: string;
  sharedAccessUsers?: Array<{
    userId?: string;
    email: string;
    role: 'viewer' | 'editor' | 'manager';
    accessToken?: string;
    name?: string;
    addedAt?: string | Date;
    addedBy?: string;
  }>;

  // Pickup contact
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupContactEmail?: string;

  // Delivery time tracking
  deliveryTimeChangedAt?: string | Date;
  deliveryTimeChangedBy?: string;

  // Transfer management
  scheduledTransferDate?: string | Date;
  transfersCompleted?: boolean;
  transferFailureReason?: string;
  transferRetryCount?: number;


  // Event relationship
  eventId?: string | null;

  // Timestamps
  createdAt: string | Date;
  updatedAt: string | Date;

  // Restaurant payout details
  restaurantPayoutDetails?: Record<string, {
    accountId?: string;
    accountName?: string;
    selectedAccountId?: string;
    stripeAccountId?: string;
    earningsAmount?: number;
    selectedAt?: string;
  }>;

  // Legacy fields for backwards compatibility
  restaurantTotalCost?: number;
  isUnassigned?: boolean; // Restaurant endpoint only
}

/**
 * Lightweight catering order summary for list endpoints
 * Backend: CateringOrderSummaryDto
 */
export interface CateringOrderSummary {
  id: string;
  orderReference?: string;
  eventDate: string | Date;
  deliveryDate?: string | Date; // Alias
  eventTime?: string;
  status: CateringOrderStatus;
  customerFinalTotal: number;
  restaurantCount: number;
  customerName: string;
  guestCount?: number;
  eventType?: string;
  paid: boolean;
  createdAt: string | Date;

  // Multi-meal order info
  mealSessionCount?: number; // Number of meal sessions (1 for single-meal, >1 for multi-meal)
  isMultiMeal?: boolean; // Quick check if this is a multi-meal order
}

// ============================================================================
// CATERING BUNDLE TYPES
// ============================================================================

/**
 * Catering bundle item details
 * Backend: CateringBundleItemResponseDto
 */
export interface CateringBundleItem {
  id: string;
  cateringBundleId: string;
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  selectedAddons: Array<{
    name: string;
    price: number;
    quantity: number;
    groupTitle: string;
  }>;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Complete catering bundle response
 * Backend: CateringBundleResponseDto
 */
export interface CateringBundleResponse {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson: number;
  baseGuestCount: number;
  isActive: boolean;
  items: CateringBundleItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ============================================================================
// DELIVERY TRACKING TYPES
// ============================================================================

/**
 * Customer-facing delivery status for a meal session
 * Backend: CustomerDeliveryStatus enum
 */
export type CustomerDeliveryStatus =
  | 'awaiting_pickup'
  | 'out_for_delivery'
  | 'at_collection_point'
  | 'delivered';

/**
 * Delivery tracking response for a single meal session
 * Backend: GET /catering-driver/delivery-tracking/:mealSessionId
 */
export interface DeliveryTrackingDto {
  mealSessionId: string;
  status: string;
  customerStatus: CustomerDeliveryStatus | null;
  estimatedDeliveryTime: string | Date | null;
  estimatedDeliveryWindow: {
    earliest: string | Date;
    latest: string | Date;
  } | null;
  isDelayed: boolean;
  delayMessage: string | null;
  driverInfo: {
    name: string;
    rating: number;
  } | null;
}