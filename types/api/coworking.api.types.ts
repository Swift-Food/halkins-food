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
}

export interface CoworkingMealSessionRequest {
  sessionName?: string;
  sessionDate: string; // "YYYY-MM-DD"
  eventTime: string; // "HH:MM"
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
  maxCapacity: number;
  address: string;
  addressLine1: string;
  city: string;
  zipcode: string;
  latitude: number;
  longitude: number;
  image?: string;
}

/**
 * Hardcoded venue list — replace with API data when available
 */
export const COWORKING_VENUES: CoworkingVenue[] = [
  {
    id: "paris-garden",
    name: "Paris Garden",
    maxCapacity: 80,
    address: "1-2 Paris Gardens, London, SE1 8ND",
    addressLine1: "1-2 Paris Gardens",
    city: "London",
    zipcode: "SE1 8ND",
    latitude: 51.50664530535029,
    longitude: -0.10636436057400264,
    image: "/coworking-images/cow-3.webp",
  },
  {
    id: "monument",
    name: "Monument",
    maxCapacity: 60,
    address: "10 Lower Thames Street, London",
    addressLine1: "10 Lower Thames Street",
    city: "London",
    zipcode: "EC3R 6EN",
    latitude: 51.50927965675505,
    longitude: -0.08475660290304882,
    image: "/coworking-images/cow-2.jpg",
  },
];

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Coworking space public info
 * Backend: SpaceInfoResponse in coworking.service.ts
 */
export interface CoworkingSpaceInfo {
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
 * Response for POST /orders (order creation)
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
