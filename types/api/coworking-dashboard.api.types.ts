/**
 * API TYPE DEFINITIONS - Coworking Dashboard DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/features/coworking/dto/coworking-dashboard.dto.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 */

// ============================================================================
// QUERY PARAMETER TYPES (Request)
// ============================================================================

/**
 * Filter status for dashboard order listing
 */
export type DashboardOrderStatusFilter =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'all'
  | 'needs_review'; // frontend-only: fetches 'upcoming' + filters by adminReviewStatus === 'pending_admin_review'

export type DashboardOrderSortBy = 'created_at' | 'event_start_time';

/**
 * Query parameters for listing orders
 * Backend: DashboardOrderQueryDto
 */
export interface DashboardOrderQuery {
  status?: DashboardOrderStatusFilter;
  from?: string; // ISO 8601 date
  to?: string; // ISO 8601 date
  memberEmail?: string;
  sortBy?: DashboardOrderSortBy;
  page?: number;
  limit?: number;
}

/**
 * Query parameters for stats endpoint
 * Backend: DashboardStatsQueryDto
 */
export interface DashboardStatsQuery {
  from?: string; // ISO 8601 date
  to?: string; // ISO 8601 date
}

export interface CreateAdminEventRequest {
  memberEmail: string;
  memberName: string;
  venueId: string;
  bookingStartTime: string;
  bookingEndTime: string;
  notes?: string;
}

export interface ImportedCoworkingEventData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  image?: string;
  url?: string;
  eventFormat?: "IN_PERSON" | "VIRTUAL" | "BOTH";
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * User information for dashboard
 */
export interface DashboardUserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Space information for dashboard
 */
export interface DashboardSpaceInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * Response for GET /coworking-dashboard/:spaceId/me
 * Backend: DashboardMeResponse
 */
export interface DashboardMeResponse {
  user: DashboardUserInfo;
  role: string;
  space: DashboardSpaceInfo;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Order summary for list view
 * Backend: DashboardOrderSummary
 */
export interface DashboardOrderSummary {
  id: string;
  status: string;
  adminReviewStatus: string;
  memberEmail: string;
  memberName: string | null;
  roomLocationDetails: string | null;
  bookingReference: string;
  subtotal: number;
  venueHireFee: number;
  total: number;
  itemCount: number;
  estimatedDelivery: string | null;
  createdAt: string;
}

/**
 * Response for GET /coworking-dashboard/:spaceId/orders
 * Backend: DashboardOrdersResponse
 */
export interface DashboardOrdersResponse {
  orders: DashboardOrderSummary[];
  pagination: PaginationInfo;
}

/**
 * Order item details
 */
export interface DashboardOrderItem {
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
}

/**
 * Booking details for an order
 */
export interface DashboardOrderBooking {
  reference: string;
  venueName: string | null;
  room: string | null;
  startTime: string | null;
  endTime: string | null;
}

/**
 * Member information for order detail
 */
export interface DashboardOrderMember {
  email: string;
  name: string | null;
  phone: string | null;
}

/**
 * Order totals breakdown
 */
export interface DashboardOrderTotal {
  subtotal: number;
  deliveryFee: number;
  venueHireFee: number | null;
  total: number;
}

export interface DashboardOrderMealSession {
  name: string;
  date: string;
  deliveryTime: string | null;
}

/**
 * Response for GET /coworking-dashboard/:spaceId/orders/:orderId
 * Backend: DashboardOrderDetailResponse
 */
export interface DashboardOrderDetailResponse {
  id: string;
  status: string;
  adminReviewStatus: string;
  adminReviewedAt: string | null;
  adminReviewNotes: string | null;
  member: DashboardOrderMember;
  booking: DashboardOrderBooking;
  mealSessions: DashboardOrderMealSession[];
  items: DashboardOrderItem[];
  total: DashboardOrderTotal;
  additionalAnswers: Record<string, string> | null;
  eventDate: string | null;
  createdAt: string;
  estimatedDelivery: string | null;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Summary statistics
 */
export interface DashboardStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  uniqueMembers: number;
}

export interface DashboardHeadlineMetrics {
  upcomingEventsNext7Days: number;
  eventsTomorrow: number;
  confirmedRevenueLastMonth: number;
  confirmedRevenueThisMonth: number;
  averageBookingValuePast30Days: number;
}

/**
 * Popular item statistics
 */
export interface PopularItemStat {
  name: string;
  count: number;
  revenue: number;
}

/**
 * Orders by day statistics
 */
export interface OrdersByDayStat {
  date: string;
  count: number;
  revenue: number;
}

/**
 * Orders by hour statistics
 */
export interface OrdersByHourStat {
  hour: number;
  count: number;
}

/**
 * Response for GET /coworking-dashboard/:spaceId/stats
 * Backend: DashboardStatsResponse
 */
export interface DashboardStatsResponse {
  summary: DashboardStatsSummary;
  headlineMetrics: DashboardHeadlineMetrics;
  popularItems: PopularItemStat[];
  ordersByDay: OrdersByDayStat[];
  ordersByHour: OrdersByHourStat[];
  calculatedAt: string | null;
}

// ============================================================================
// PAYMENTS & TRANSACTIONS
// ============================================================================

export interface StripeBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface WithdrawResponse {
  success: boolean;
  amount: number;
  payoutId: string;
}

export interface Transaction {
  date: string;
  type: 'transfer' | 'withdrawal';
  description: string;
  amount: number;
  status: string;
  reference: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: PaginationInfo;
}

export type TransactionFilter = 'all' | 'transfers' | 'withdrawals';

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface CalendarOrderItem {
  id: string;
  memberEmail: string;
  memberName: string | null;
  bookingStartTime: string | null;
  bookingEndTime: string | null;
  status: string;
  adminReviewStatus: string;
  bookingReference: string | null;
  roomLocationDetails: string | null;
  subtotal: number;
  venueHireFee: number;
  total: number;
}

export interface CalendarDateGroup {
  date: string;
  orders: CalendarOrderItem[];
}

export interface CalendarVenueGroup {
  venueId: string | null;
  venueName: string | null;
  dates: CalendarDateGroup[];
}

export interface CalendarResponse {
  venues: CalendarVenueGroup[];
}
