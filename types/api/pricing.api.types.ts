/**
 * API TYPE DEFINITIONS - Pricing DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/shared/entities/orders/dto/pricing-order-item.dto.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 * Any field name changes here MUST be reflected in the backend
 */

/**
 * Pricing information for a menu item addon
 * Backend: PricingAddonDto
 */
export interface PricingAddon {
  addonId: string;
  name: string;
  customerUnitPrice: number;
  quantity: number;
  groupTitle?: string;
  allergens?: string | string[];
  dietaryRestrictions?: string[];
}

/**
 * Complete pricing breakdown for a single menu item
 * Backend: PricingMenuItemDto
 */
export interface PricingMenuItem {
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string;
  /** @deprecated Use menuItemName instead - kept for backward compatibility with old orders */
  name?: string;
  quantity: number;

  // Customer pricing (what customer pays)
  customerUnitPrice: number;
  customerTotalPrice: number;

  // Restaurant base pricing (before commission)
  restaurantBaseUnitPrice: number;
  restaurantBaseTotalPrice: number;

  // Commission details
  commissionRate: number;
  commissionAmount: number;
  restaurantNetAmount: number;

  // Discount information
  isDiscounted: boolean;
  originalUnitPrice?: number;
  discountAmount?: number;

  // Catering specific
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
  groupTitle?: string;

  // Category information
  category?: {
    id: string;
    name: string;
    displayOrder: number;
  };
  subcategory?: {
    id: string;
    name: string;
    categoryId: string;
    displayOrder: number;
  };

  // Add-ons
  selectedAddons?: PricingAddon[];
}

/**
 * Pricing breakdown for all items from a single restaurant
 * Backend: PricingOrderItemDto
 */
export interface PricingOrderItem {
  restaurantId: string;
  restaurantName: string;
  status: string;
  specialInstructions?: string;
  reminderConfirmed?: boolean;
  reminderConfirmedAt?: string | Date;

  // Menu Items
  menuItems: PricingMenuItem[];

  // Restaurant-Level Totals
  customerTotal: number;              // Total customer pays for this restaurant
  restaurantGrossAmount: number;      // Total before commission
  restaurantCommissionTotal: number;  // Total commission deducted
  restaurantNetAmount: number;        // Total restaurant receives after commission
}

// Backend DTO name aliases (for exact backend matching)
export type PricingAddonDto = PricingAddon;
export type PricingMenuItemDto = PricingMenuItem;
export type PricingOrderItemDto = PricingOrderItem;
