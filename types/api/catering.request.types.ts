/**
 * REQUEST TYPE DEFINITIONS - Catering Order Creation
 *
 * These types define what to SEND to the backend when creating/updating orders.
 * They are intentionally minimal - the backend recalculates all pricing.
 *
 * Backend: src/features/order-management/catering/dto/create-catering.dto.ts
 */

/**
 * Addon selection for a menu item (request format)
 * Just the selection data - backend calculates pricing
 */
export interface CateringAddonRequest {
  addonId?: string;
  name: string;
  quantity: number;
  groupTitle?: string;
}

/**
 * Menu item in an order (request format)
 * Minimal data - backend looks up item details and calculates pricing
 */
export interface CateringMenuItemRequest {
  menuItemId: string;
  quantity: number;
  selectedAddons?: CateringAddonRequest[];
  groupTitle?: string;
}

/**
 * Restaurant order item (request format)
 * Backend expects this structure in CreateCateringOrderDto.orderItems[]
 */
export interface CateringRestaurantOrderRequest {
  restaurantId: string;
  menuItems: CateringMenuItemRequest[];
  specialInstructions?: string;
}

// ============================================================================
// MEAL SESSION REQUEST TYPES (Multi-meal order support)
// ============================================================================

/**
 * Meal session request for multi-meal orders
 * Backend: MealSessionDto
 *
 * Each session represents a distinct meal (breakfast, lunch, dinner, etc.)
 * within a single catering order submission.
 */
export interface MealSessionRequest {
  // Session identification
  sessionName: string; // "Breakfast", "Lunch", "Dinner", "Main Event", etc.
  sessionOrder?: number; // 1, 2, 3... for sorting (auto-assigned if not provided)

  // Session date & time
  sessionDate: string; // ISO date string - date of this specific meal
  eventTime: string; // "09:00" - when the event/meal starts
  collectionTime?: string; // "08:00" - when restaurant should prepare/deliver

  // Session details
  guestCount?: number; // Guest count for this specific meal (overrides order-level)
  specialRequirements?: string; // Meal-specific requirements

  // Order items for this session
  orderItems: CateringRestaurantOrderRequest[];

  // Promo codes specific to this session (optional)
  promoCodes?: string[];
}

/**
 * Create catering order request
 * This is what you send to POST /catering-orders
 *
 * Supports two modes:
 * 1. Single-meal (backward compatible): Use orderItems + eventDate/eventTime
 * 2. Multi-meal (new): Use mealSessions array
 *
 * If mealSessions is provided, it takes precedence and orderItems/eventDate/eventTime
 * at the top level are ignored. The backend will create MealSession entities for each.
 */
export interface CreateCateringOrderRequest {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ccEmails?: string[];
  organization?: string;

  // Optional billing address for Stripe invoices
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // ============================================================
  // TOP-LEVEL EVENT DETAILS (for backward compatibility)
  // For single-meal orders, these are used directly
  // For multi-meal orders, these are taken from the first session
  // ============================================================
  eventDate?: string; // Optional if mealSessions provided
  eventTime?: string; // Optional if mealSessions provided
  collectionTime?: string;
  eventId?: string; // Link to Event entity if applicable
  guestCount?: number;
  eventType?: string;
  deliveryAddress: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  specialRequirements?: string; // General requirements (applies to all sessions)

  // Corporate/Organization
  organizationId?: string;
  corporateUserId?: string;
  useOrganizationWallet?: boolean;

  // ============================================================
  // ORDER ITEMS (for backward compatibility - single meal)
  // Required if mealSessions is not provided
  // ============================================================
  orderItems?: CateringRestaurantOrderRequest[];

  // ============================================================
  // MEAL SESSIONS (for multi-meal orders)
  // If provided, orderItems/eventDate/eventTime at top level are ignored
  // Backend creates MealSession entities for each session
  // ============================================================
  mealSessions?: MealSessionRequest[];

  // ============================================================
  // PRICING & PAYMENT
  // ============================================================
  estimatedTotal?: number;
  promoCodes?: string[];
  paymentMethodId?: string;
  paymentIntentId?: string;
  paymentMethod?: 'wallet' | 'stripe_direct';
  restaurantPayoutDetails?: Record<string, {
    selectedAccountId: string;
    accountName: string;
    stripeAccountId: string;
    earningsAmount: number;
    selectedAt: string;
  }>;
}

/**
 * Update pickup contact request
 */
export interface UpdatePickupContactRequest {
  orderId: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupContactEmail: string;
  userId?: string;
  accessToken?: string;
}

/**
 * Update delivery time request
 */
export interface UpdateDeliveryTimeRequest {
  orderId: string;
  newEventTime: string;
  newCollectionTime?: string;
  userId?: string;
  accessToken?: string;
}

/**
 * Add shared access request
 */
export interface AddSharedAccessRequest {
  orderId: string;
  email: string;
  name: string;
  userId?: string;
  role: 'viewer' | 'manager';
}

/**
 * Remove shared access request
 */
export interface RemoveSharedAccessRequest {
  orderId: string;
  email: string;
}

/**
 * Update shared access role request
 */
export interface UpdateSharedAccessRoleRequest {
  orderId: string;
  email: string;
  newRole: 'viewer' | 'manager';
}
