/**
 * API TYPE DEFINITIONS - Coworking Public DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/features/coworking/dto/*.dto.ts
 * Backend: src/features/coworking/services/coworking-auth.service.ts
 * Backend: src/features/coworking/controllers/coworking.controller.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 */

import type { CateringOrderResponse, MealSessionResponse } from "./catering.api.types";

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Start session without OfficeRnD verification
 * Backend: StartSessionDto
 */
export interface StartSessionRequest {
  email: string;
  name: string; // 2-100 chars
}

/**
 * Request magic link for OfficeRnD member verification
 * Backend: VerifyEmailDto
 */
export interface VerifyEmailRequest {
  email: string;
}

/**
 * Verify by booking reference and email
 * Backend: VerifyBookingDto
 */
export interface VerifyBookingRequest {
  bookingReference: string;
  email: string;
}

/**
 * Menu item addon selection
 */
export interface CoworkingMenuItemAddon {
  name: string;
  quantity: number;
  groupTitle?: string;
}

/**
 * Menu item for coworking order
 * Backend: CoworkingMenuItemDto
 */
export interface CoworkingMenuItem {
  menuItemId: string; // UUID
  quantity: number; // min 1
  selectedAddons?: CoworkingMenuItemAddon[];
  notes?: string;
}

/**
 * Restaurant order within a coworking order
 * Backend: CoworkingRestaurantOrderDto
 */
export interface CoworkingRestaurantOrder {
  restaurantId: string; // UUID
  menuItems: CoworkingMenuItem[]; // 1-50 items
  specialInstructions?: string; // max 500 chars
}


export interface LocationDto {

  latitude: number;
  longitude: number;
}

/**
 * Create coworking order request
 * Backend: CreateCoworkingOrderDto
 */
export interface CreateCoworkingOrderRequest {
  deliveryAddress: string; // 10-500 chars
  deliveryLocation: LocationDto;
  venueId?: string;
  bookingId?: string;
  bookingReference?: string;
  roomLocation?: string; // max 200 chars
  customerPhone?: string;
  orderItems?: CoworkingRestaurantOrder[]; // flat items (single-session fallback)
  mealSessions?: CoworkingMealSessionRequest[]; // per-session items with date/time
  specialInstructions?: string; // max 1000 chars
  scheduledFor?: string; // ISO date string
  scheduledTime?: string; // HH:MM format
  eventStartDateTime?: string; // ISO datetime e.g. "2025-06-15T10:00:00"
  eventEndDateTime?: string; // ISO datetime e.g. "2025-06-15T14:00:00"
  deliveryDate?: string; // "YYYY-MM-DD"
  deliveryTime?: string; // "HH:MM"
  additionalAnswers?: Record<string, string>;
  promoCodes?: string[];
}

export interface CoworkingMealSessionRequest {
  sessionName?: string;
  sessionDate: string; // "YYYY-MM-DD"
  eventTime: string; // "HH:MM"
  collectionTime?: string; // "HH:MM"
  guestCount?: number;
  specialRequirements?: string;
  orderItems: CoworkingRestaurantOrder[];
}

// ============================================================================
// VENUE TYPES
// ============================================================================

/**
 * A bookable venue within a coworking space
 */
export interface CoworkingVenue {
  id: string;
  name: string;
  capacity: number;
  latitude: number;
  longitude: number;
  coverPhoto?: string;
  galleryPhotos?: string[] | null;
  description?: string;
  attendanceTags?: string[] | null;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Coworking space public info
 * Backend: SpaceInfoResponse in coworking.service.ts
 */
export interface CoworkingSpaceInfo {
  id: string;
  name: string;
  slug: string;
  address: string;
  deliveryInstructions: string | null;
  operatingHours: {
    start: string;
    end: string;
  } | null;
}

/**
 * Response for POST /start-session
 * Backend: StartSessionResult
 */
export interface StartSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  email: string;
  name: string;
  isOfficeRnDVerified: boolean;
}

/**
 * Response for POST /verify-email
 * Always returns success to prevent email enumeration
 */
export interface VerifyEmailResponse {
  success: true;
  message: string;
}

/**
 * Member info from OfficeRnD
 * Backend: MemberInfo
 */
export interface MemberInfo {
  email: string;
  name: string;
  memberId: string;
}

/**
 * Booking info from OfficeRnD
 * Backend: BookingInfo
 */
export interface BookingInfo {
  id: string;
  reference: string;
  roomLocationDetails: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
}

/**
 * Response for GET /verify (magic link verification)
 * Backend: VerifyMagicLinkResult
 */
export interface VerifyMagicLinkResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  member: MemberInfo;
  bookings: BookingInfo[];
}

/**
 * Response for POST /verify-booking
 * Backend: VerifyBookingResult
 */
export interface VerifyBookingResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  member: MemberInfo;
  booking: BookingInfo;
}

/**
 * Response for POST /refresh
 * Backend: RefreshTokenResult
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

/**
 * Response for GET /bookings
 */
export interface GetBookingsResponse {
  bookings: BookingInfo[];
  message?: string; // Present for non-OfficeRnD sessions
}

/**
 * Order summary in list view
 */
export interface CoworkingOrderSummary {
  id: string;
  status: string;
  bookingReference: string | null;
  roomLocationDetails: string | null;
  total: number;
  createdAt: string; // ISO datetime
}

/**
 * Response for GET /orders
 */
export interface GetOrdersResponse {
  orders: CoworkingOrderSummary[];
}

/**
 * Order totals breakdown
 */
export interface CoworkingOrderTotal {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Response for GET /orders/:orderId
 */
export interface GetOrderDetailResponse {
  orderId: string;
  status: string;
  deliveryAddress: string;
  total: CoworkingOrderTotal;
  createdAt: string; // ISO datetime
}

/**
 * Response for POST /cart-pricing in the Stripe Checkout flow.
 */
export interface CoworkingCheckoutPricingResponse {
  isValid: boolean;
  subtotal: number;
  deliveryFee: number;
  restaurantPromotionDiscount?: number;
  promotionDiscount?: number;
  totalDiscount?: number;
  promoDiscount?: number;
  venueHireFee?: number;
  venueHireDiscount?: number;
  total: number;
  error?: string;
  distanceInMiles?: number;
  deliveryFeeBreakdown?: {
    baseFee: number;
    portionFee: number;
    drinksFee: number;
    subtotal: number;
    distanceMultiplier: number;
    finalDeliveryFee: number;
    requiresCustomQuote: boolean;
  };
  deposit?: {
    amount: number;
    perDayRate: number;
    days: number;
  } | null;
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
}

/**
 * Response for POST /create-checkout — creates a Stripe Checkout session.
 * Call this only when the user clicks "Pay deposit".
 */
export interface CoworkingCreateCheckoutResponse {
  checkoutUrl: string;
  deposit: {
    amount: number;
    perDayRate: number;
    days: number;
  } | null;
}

/**
 * Response for POST /orders (legacy order creation flow)
 * Backend: CreateOrderResult
 */
export interface CreateOrderResponse {
  orderId: string;
  status: string;
  total: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    total: number;
  };
  deliveryAddress: string;
  estimatedDelivery: string;
  accessToken?: string;
}

/**
 * Response for POST /confirm-checkout in the Stripe Checkout flow.
 */
export interface ConfirmCoworkingCheckoutResponse {
  orderId: string;
  adminReviewStatus: string;
  depositStatus: string;
  depositAmount?: number;
  venueId?: string | null;
  venueName?: string | null;
  deliveryAddress?: string | null;
  bookingStartTime?: string | null;
  bookingEndTime?: string | null;
  bookingReference?: string | null;
  roomLocationDetails?: string | null;
  requiresCatering?: boolean;
  cateringOrder?: unknown | null;
  accessToken?: string | null;
}

export interface CoworkingOrderViewResponse extends CateringOrderResponse {
  coworkingOrderId: string;
  cateringOrderId: string;
  orderId: string;
  adminReviewStatus: string;
  depositStatus: string;
  depositAmount: number;
  venueHireFee: number;
  venueId: string | null;
  venueName: string | null;
  bookingStartTime: string | null;
  bookingEndTime: string | null;
  bookingReference: string | null;
  roomLocationDetails: string | null;
  requiresCatering: boolean;
  currentUserRole: "viewer" | "editor" | "manager" | null;
  mealSessions?: MealSessionResponse[];
}
