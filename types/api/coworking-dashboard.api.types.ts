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
  | 'all';

/**
 * Query parameters for listing orders
 * Backend: DashboardOrderQueryDto
 */
export interface DashboardOrderQuery {
  status?: DashboardOrderStatusFilter;
  from?: string; // ISO 8601 date
  to?: string; // ISO 8601 date
  memberEmail?: string;
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
  memberEmail: string;
  memberName: string | null;
  roomLocationDetails: string | null;
  bookingReference: string;
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
}

/**
 * Order totals breakdown
 */
export interface DashboardOrderTotal {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Response for GET /coworking-dashboard/:spaceId/orders/:orderId
 * Backend: DashboardOrderDetailResponse
 */
export interface DashboardOrderDetailResponse {
  id: string;
  status: string;
  member: DashboardOrderMember;
  booking: DashboardOrderBooking;
  items: DashboardOrderItem[];
  total: DashboardOrderTotal;
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
  popularItems: PopularItemStat[];
  ordersByDay: OrdersByDayStat[];
  ordersByHour: OrdersByHourStat[];
  calculatedAt: string | null;
}
