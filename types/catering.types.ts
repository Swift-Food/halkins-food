/**
 * LEGACY CATERING TYPES
 *
 * ⚠️ IMPORTANT: This file contains MIXED types:
 *
 * 1. **Frontend-only types** (✅ USE THESE):
 *    - EventDetails, SelectedMenuItem, ContactInfo
 *    - SearchResult, SearchResponse, SearchFilters
 *    - DTOs for SENDING to backend (CreateCateringOrderDto, OrderItemDto)
 *
 * 2. **API Response types** (⚠️ PREFER types/api/ instead):
 *    - CateringOrderDetails, PricingOrderItemDto, etc.
 *    - For NEW code, use types from @/types/api/catering.api.types
 *    - These are kept for backwards compatibility only
 *
 * See: /types/api/README.md for migration guide
 */

import { MenuItem } from "./restaurant.types";
import { PricingMenuItem } from "./api";
import { deprecate } from "util";

export interface SelectedAddon {
  name: string;
  price: number; // Legacy field - kept for backwards compatibility
  customerUnitPrice?: number; // New field matching backend DTO
  quantity: number;
  groupTitle: string;
  allergens?: string | string[];
  dietaryRestrictions?: string[];
}

export interface SearchResult {
  type: "restaurant" | "menu_item";
  id: string;
  menuItemName: string;
  description?: string;
  image?: string;
  price: string;
  isDiscount: boolean;
  discountPrice?: string;
  groupTitle?: string;
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
  rating?: number;
  reviews?: number;
  isOpen?: boolean;
  openHours?: string;
  openingHours?: any[];
  marketId?: string;
  restaurantId: string;
  fsa?: number;
  fsaLink?: string;
  minimumDeliveryNoticeHours?: number;
  addonPrice?: number;
  itemDisplayOrder: number;
  addons: any[];
  allergens?: string[];
  averageRating?: string;
  status?: string;
  portionQuantity?: number;
  selectedAddons?: {
    name: string;
    price: number;
    quantity: number;
    groupTitle: string;
  }[];
  restaurant?: {
    id: string;
    name: string;
    description: string;
    matchType: string;
    image: string[];
    rating: string;
    reviews: number;
    isOpen: boolean;
    openHours: string;
    openingHours: any[];
    minimumDeliveryNoticeHours?: number;
    marketId: string;
    restaurantId: string;
    fsa?: number;
    fsaLink?: string;
  };
  score: number;
  matchType: "exact" | "prefix" | "word" | "partial" | "description";
  // Category context for cart grouping
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export interface SearchResponse {
  restaurants: any[];
  menuItems: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SearchFilters {
  page?: number;
  limit?: number;
  marketId?: string;
  categoryId?: string;
  minRating?: number;
  maxPrice?: number;
  dietaryFilters?: string[];
  allergens?: string[];
}


export interface EventDetails {
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  specialRequests?: string;
  address: string;
  userType: "guest" | "corporate";
}

export interface SelectedMenuItem {
  item: SearchResult | MenuItem;
  quantity: number;
}

/**
 * Represents a single meal session within a catering order (frontend state).
 * Used in CateringContext to manage multi-meal orders.
 * A single-meal order is just mealSessions.length === 1.
 */
export interface MealSessionState {
  sessionName: string;           // "Breakfast", "Lunch", "Dinner", "Main Event", etc.
  sessionDate: string;           // ISO date string
  eventTime: string;             // "14:00" format
  guestCount?: number;           // Per-session guest count (optional override)
  specialRequirements?: string;  // Session-specific notes
  orderItems: SelectedMenuItem[]; // Items for THIS session
}

export interface ContactInfo {
  organization: string;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  latitude?: number;
  longitude?: number;
  // Optional billing address for Stripe invoices
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * @deprecated This is the OLD format - DO NOT use for new order creation!
 */
export interface CateringOrder {
  eventDetails: EventDetails;
  selectedItems: SelectedMenuItem[];
  contactInfo: ContactInfo;
}

/**
 * @deprecated This is the OLD format - DO NOT use for new order creation!
 *
 * Still temporarily used ONLY for:
 * - Pricing verification (POST /pricing/catering-verify-cart)
 * - Promo validation (POST /promotions/validate-catering)
 *
 * For ORDER CREATION, use CateringRestaurantOrderRequest from @/types/api instead.
 * The backend will migrate these pricing endpoints to use the new format soon.
 */
export interface OrderItemDto {
  restaurantId: string;
  restaurantName: string;
  menuItems: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customerTotalPrice?: number; // New pricing format field
    selectedAddons?: SelectedAddon[];
    addonPrice?: number;
    cateringQuantityUnit?: number;
    feedsPerUnit?: number;
    // New pricing fields
    restaurantNetAmount?: number;
    commissionPrice?: number;
    restaurantBaseTotalPrice?: number;
    restaurantBaseUnitPrice?: number;
    commissionRate?: number;
    priceForRestaurant?: number;
  }[];
  status: string;
  restaurantCost: number;
  totalPrice: number;
  specialInstructions?: string;
  promotionDiscount?: number; // Promotion discount applied
}

// ============================================================================
// DEPRECATED API RESPONSE TYPES - Use types from @/types/api/ instead
// ============================================================================
// These types are kept for backwards compatibility but should not be used
// in new code. For API responses, prefer:
// - @/types/api/pricing.api.types for pricing types
// - @/types/api/catering.api.types for catering order responses
// ============================================================================

/**
 * @deprecated Use PricingAddon from @/types/api/pricing.api.types instead
 */
export interface PricingAddonDto {
  name: string;
  price?: number; // Legacy field - kept for backwards compatibility
  customerUnitPrice: number; // New field matching backend DTO
  quantity: number;
  groupTitle?: string;
}

/**
 * @deprecated Use PricingMenuItem from @/types/api/pricing.api.types instead
 */
export interface PricingMenuItemDto {
  menuItemId: string;
  menuItemName: string;
  quantity: number;

  // Customer Layer - What customer pays
  customerUnitPrice: number;
  customerTotalPrice: number;

  // Restaurant Layer - Before commission
  restaurantBaseUnitPrice: number;
  restaurantBaseTotalPrice: number;

  // Commission
  commissionRate: number;
  commissionAmount: number;
  restaurantNetAmount: number;

  // Discount Info
  isDiscounted: boolean;
  originalUnitPrice?: number;
  discountAmount?: number;
  discountType?: "PLATFORM_ABSORBED" | "RESTAURANT_ABSORBED";

  // Platform Layer
  platformCommissionRevenue: number;
  platformAbsorbedDiscount: number;
  platformNetRevenue: number;

  // Additional Info
  selectedAddons: PricingAddonDto[];
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
  restaurantId: string;
}

/**
 * @deprecated Use PricingOrderItem from @/types/api/pricing.api.types instead
 */
export interface PricingOrderItemDto {
  restaurantId: string;
  restaurantName: string;
  status: string;
  menuItems: PricingMenuItem[];

  // Commission info
  commissionRate: number;

  // Customer totals
  customerTotal: number;
  customerTotalAfterPromotions: number;

  // Restaurant totals
  restaurantBaseTotal: number;
  restaurantPromotionDiscount: number;
  restaurantBaseTotalAfterPromotions: number;
  restaurantCommissionTotal: number;
  restaurantNetAmount: number;

  // Platform totals
  platformCommissionRevenue: number;
  platformAbsorbedDiscountTotal: number;
  platformNetRevenue: number;

  // Discount summary
  totalDiscountAmount: number;
  discountedItemsCount: number;
  totalItemsCount: number;
  appliedPromotions: any[];
}

/**
 * @deprecated Legacy type - use types from @/types/api/ instead
 */
export interface PricingBreakdownDto {
  orderId: string;
  orderType: "CATERING" | "CORPORATE";

  // Customer totals
  customerSubtotal: number;
  customerDeliveryFee: number;
  customerServiceCharge: number;
  promoCodeDiscount: number;
  customerFinalTotal: number;

  // Promo code info
  promoCode?: string;
  promoCodeAbsorbedBy?: "PLATFORM" | "RESTAURANT";

  // Per-restaurant breakdown
  restaurants: PricingOrderItemDto[];
}

export interface RestaurantPayoutDto {
  restaurantName: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  menuItems: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    addon: string;
  }[];
}

/**
 * @deprecated Use CreateCateringOrderRequest from @/types/api/catering.request.types instead
 *
 * This legacy type uses OrderItemDto which includes client-calculated prices.
 * The new format uses CateringRestaurantOrderRequest with minimal data (IDs and quantities only).
 * Backend calculates all pricing server-side for accuracy.
 */
export interface CreateCateringOrderDto {
  userId: string;
  organization: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ccEmails: string[];
  eventDate: string;
  eventTime: string;
  collectionTime?: string;
  guestCount: number;
  eventType?: string;
  deliveryAddress: string;
  specialRequirements?: string;
  orderItems: OrderItemDto[];
  estimatedTotal?: number;
  promoCodes?: string[];
  paymentMethodId?: string;
  paymentIntentId?: string;
}

/**
 * @deprecated No longer used - pricing endpoints now accept CateringRestaurantOrderRequest[]
 *
 * The backend pricing endpoints have been updated to accept minimal format
 * (CateringRestaurantOrderRequest with just IDs and quantities).
 * Backend calculates all pricing from database.
 */
export interface CateringPricingData {
  orderItems: OrderItemDto[];
  deliveryAddressId: string;
  promoCodes?: string[];
}

export interface CateringPricingResult {
  isValid: boolean;
  subtotal: number;
  deliveryFee: number;
  restaurantPromotionDiscount?: number; // NEW: Restaurant promotion discount
  totalDiscount?: number; // NEW: Combined discount
  promoDiscount?: number;
  total: number;
  error?: string;

  // NEW: Distance-based delivery fee fields
  distanceInMiles?: number;
  deliveryFeeBreakdown?: {
    baseFee: number;              // Always £6
    portionFee: number;            // £6, £8, or £8+£4/50 portions
    drinksFee: number;             // Always 0 for now
    subtotal: number;              // Sum of above
    distanceMultiplier: number;    // 1.0x, 1.2x, 1.5x, or 2.0x
    finalDeliveryFee: number;      // Subtotal × multiplier
    requiresCustomQuote: boolean;  // true if >6 miles
  };
}

export interface PromoCodeValidation {
  valid: boolean;
  reason?: string;
  discount?: number;
}

// NEW TYPES FOR DASHBOARD
export interface SharedAccessUser {
  email: string;
  name: string;
  accessToken: string;
  addedAt: string;
  addedBy: string;
  role: SharedAccessRole;
}

// ============================================================================
// MEAL SESSION TYPES (Multi-meal order support)
// ============================================================================

export interface AppliedPromotion {
  id: string;
  name: string;
  type: string;
  discountAmount: number;
}

export interface AppliedPromotionsMap {
  [restaurantId: string]: AppliedPromotion[];
}

/**
 * Represents a single meal session within a catering order
 * Supports multi-meal orders (e.g., breakfast, lunch, dinner in one submission)
 */
export interface MealSession {
  id: string;
  cateringOrderId: string;

  // Session identification
  sessionName: string; // "Breakfast", "Lunch", "Dinner", "Main Event", etc.
  sessionOrder: number; // 1, 2, 3... for sorting

  // Session date & time
  sessionDate: string; // Date of this specific meal (ISO string)
  eventTime: string; // "09:00" - when the event/meal starts
  collectionTime: string; // "08:00" - when restaurant should prepare/deliver

  // Session details
  guestCount?: number; // Guest count for this specific meal
  specialRequirements?: string; // Meal-specific requirements

  // Order items for this session
  orderItems: PricingOrderItemDto[];

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

  // Session status tracking
  reminder24HourSent: boolean;
  reminder1HourSent: boolean;
  deliveryTimeChangedAt?: string;
  deliveryTimeChangedBy?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export enum CateringOrderStatus {
  PENDING_REVIEW = "pending_review",
  ADMIN_REVIEWED = "admin_reviewed",
  RESTAURANT_REVIEWED = "restaurant_reviewed",
  PAYMENT_LINK_SENT = "payment_link_sent",
  PAID = "paid",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

/**
 * @deprecated Use CateringOrderResponse from @/types/api/catering.api.types instead
 *
 * This legacy type has field name mismatches with backend DTOs.
 * For API responses, use the strict types from @/types/api/ to prevent bugs.
 */
export interface CateringOrderDetails {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  organization?: string;
  publicNote?: string;
  internalNote?: string;
  ccEmails: string[];

  // Event details (represents primary/first meal session for backward compatibility)
  eventDate: string;
  eventTime: string;
  collectionTime: string;
  guestCount: number;
  eventType: string;
  deliveryAddress: string;
  specialRequirements?: string;

  // ============================================================
  // MEAL SESSIONS (Multi-meal order support)
  // For SINGLE-MEAL orders: mealSessions will have 1 item or be undefined
  // For MULTI-MEAL orders: mealSessions contains all meals (breakfast, lunch, dinner, etc.)
  // ============================================================
  mealSessions?: MealSession[];

  // Order items (kept for backward compatibility)
  // For SINGLE-MEAL orders: contains the actual order items
  // For MULTI-MEAL orders: aggregated view of all meal sessions
  orderItems: OrderItemDto[]; // Legacy format still returned by some endpoints
  restaurants?: PricingOrderItemDto[]; // NEW: Clear pricing format returned by new endpoints

  // Restaurant coordination (aggregated across all sessions for multi-meal)
  restaurantReviews?: string[];
  restaurantRejections?: string[];

  // Pricing (Grand totals across all meal sessions)
  estimatedTotal: number;
  finalTotal: number;
  depositAmount: number;
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  promoDiscount: number;
  promotionDiscount?: number;
  promoCodes: string[];
  appliedPromotions?: AppliedPromotionsMap;

  // Status & payment
  status: CateringOrderStatus;
  paymentId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paymentLinkUrl?: string;
  paymentLinkSentAt?: string;
  paidAt?: string;

  // Admin & review
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reminder24HourSent?: boolean;
  reminder1HourSent?: boolean;

  // Shared access
  sharedAccessUsers?: SharedAccessUser[];

  // Pickup contact
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupContactEmail?: string;

  // Delivery time tracking
  deliveryTimeChangedAt?: string;
  deliveryTimeChangedBy?: string;

  // Transfer management
  scheduledTransferDate?: string;
  transfersCompleted?: boolean;
  transferFailureReason?: string;
  transferRetryCount?: number;


  // Event relationship
  eventId?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // NEW: Clear pricing totals
  customerFinalTotal?: number;
  platformCommissionRevenue?: number;
  restaurantsTotalGross?: number;
  restaurantsTotalNet?: number;

  // Restaurant payout details
  restaurantPayoutDetails?: Record<
    string,
    {
      accountId?: string;
      accountName?: string;
      selectedAccountId?: string;
      stripeAccountId?: string;
      earningsAmount?: number;
      selectedAt?: string;
    }
  >;

  // Legacy fields for backwards compatibility
  restaurantTotalCost?: number;
  isUnassigned?: boolean; // Flag for unassigned orders
}

export enum SharedAccessRole {
  VIEWER = "viewer",
  MANAGER = "manager",
}

export interface AddSharedAccessDto {
  orderId: string;
  email: string;
  name: string;
  userId?: string;
  role: SharedAccessRole;
}

export interface RemoveSharedAccessDto {
  orderId: string;
  email: string;
}

export interface UpdatePickupContactDto {
  orderId: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupContactEmail: string;
  userId?: string;
  accessToken?: string;
}
export interface UpdateSharedAccessRoleDto {
  orderId: string;
  email: string;
  newRole: SharedAccessRole;
}

export interface UpdateDeliveryTimeDto {
  orderId: string;
  newEventTime: string;
  newCollectionTime?: string;
  userId?: string;
  accessToken?: string;
}

// MENU MANAGEMENT TYPES
export interface MenuItemAddon {
  name: string;
  price: number;
  allergens: string[];
  dietaryRestrictions?: string[];
  groupTitle?: string;
  selectionType?: "single" | "multiple";
  isRequired?: boolean;
}

export enum MenuItemStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
  SOLD_OUT = "SOLD_OUT",
  // CATERING = "CATERING",
}

export enum MenuItemStyle {
  CARD = "CARD",
  HORIZONTAL = "HORIZONTAL",
}

export interface MenuCategory {
  id: string;
  name: string;
  images: string | null;
  clicks: number;
}

export interface Subcategory {
  id: string;
  name: string;
  clicks: number;
  images?: string | null;
}

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  images?: string | null;
  clicks: number;
  subcategories: Subcategory[];
}

export interface CreateMenuItemDto {
  restaurantId: string;
  categoryIds: string[];
  subcategoryIds?: string[];
  groupTitle: string;
  name: string;
  description: string;
  price: number;
  prepTime: number;
  discountPrice?: number;
  isDiscount?: boolean;
  image: string;
  isAvailable: boolean;
  allergens: string[];
  dietaryFilters?: string[];
  addons: MenuItemAddon[] | null;
  itemDisplayOrder?: number;
  popular?: boolean;
  style?: MenuItemStyle;
  status: MenuItemStatus;
  feedsPerUnit?: number;
}

export interface MenuItemDetails extends CreateMenuItemDto {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  averageRating: string;
  categories?: MenuCategory[];
  subCategories?: Subcategory[];
}

export interface UpdateMenuItemDto {
  categoryIds?: string[];
  subcategoryIds?: string[];
  groupTitle?: string;
  name?: string;
  description?: string;
  price?: number;
  prepTime?: number;
  discountPrice?: number;
  isDiscount?: boolean;
  image?: string;
  isAvailable?: boolean;
  allergens?: string[];
  dietaryFilters?: string[];
  addons?: MenuItemAddon[] | null;
  itemDisplayOrder?: number;
  popular?: boolean;
  style?: MenuItemStyle;
  status?: MenuItemStatus;
  feedsPerUnit?: number;
  cateringQuantityUnit?: number;
}
