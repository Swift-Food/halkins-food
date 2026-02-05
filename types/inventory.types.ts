// Inventory Management Types

/**
 * Catering Daily Portions Tracking
 * Limits total catering portions per day, resets at midnight
 */
export interface CateringPortionsConfig {
  maximumCateringPortionsPerDay: number; // Editable: Max portions allowed per day (default: 150)
  cateringPortionsToday: number; // Read-only: Current count used today
}

export interface CateringPortionsStatus extends CateringPortionsConfig {
  remainingPortions: number; // Calculated: maximum - used
  percentageUsed: number; // Calculated: (used / maximum) * 100
  isAvailable: boolean; // Calculated: remainingPortions > 0
}

/**
 * Corporate Session-Based Inventory
 * Limits portions and specific ingredients during sessions
 * Can reset daily or twice daily (lunch/dinner)
 */
export type SessionResetPeriod = 'daily' | 'lunch_dinner' | null;

export interface CorporateInventoryConfig {
  // When to reset inventory
  sessionResetPeriod: SessionResetPeriod;

  // Optional: Limit total portions per session
  maxPortionsPerSession: number | null;

  // Optional: Limit specific ingredients per session
  // Key = ingredient name (e.g., "chicken", "lobster")
  // Value = max quantity for that ingredient
  limitedIngredientsPerSession: { [ingredientName: string]: number } | null;
}

export interface CorporateInventoryStatus extends CorporateInventoryConfig {
  // Read-only: Current remaining portions in this session
  portionsRemaining: number | null;

  // Read-only: Current remaining ingredients in this session
  limitedIngredientsRemaining: { [ingredientName: string]: number } | null;

  // Calculated fields
  portionsUsed?: number; // maxPortionsPerSession - portionsRemaining
  ingredientsStatus?: {
    [ingredientName: string]: {
      max: number;
      remaining: number;
      used: number;
      percentageUsed: number;
    };
  };
}

/**
 * Complete Restaurant Inventory Settings
 * Combines both catering and corporate inventory systems
 */
export interface RestaurantInventorySettings {
  // Restaurant type flags
  isCatering: boolean;
  isCorporate: boolean;

  // Catering settings
  catering: {
    enabled: boolean;
    dailyPortionsLimit: CateringPortionsConfig;
  };

  // Corporate settings
  corporate: {
    enabled: boolean;
    sessionConfig: CorporateInventoryConfig;
  };
}

/**
 * API Response Types
 */

// GET /restaurant/:restaurantId/catering-portions-availability
export interface CateringPortionsAvailabilityResponse {
  restaurantId: string;
  restaurantName: string;
  maximumCateringPortionsPerDay: number;
  cateringPortionsToday: number;
  remainingPortions: number;
  isAvailable: boolean;
}

// PATCH /restaurant/:restaurantId/catering-portions-limit
export interface UpdateCateringPortionsLimitDto {
  maximumCateringPortionsPerDay: number;
}

// PATCH /restaurant/:restaurantId - Corporate inventory fields
export interface UpdateCorporateInventoryDto {
  sessionResetPeriod?: SessionResetPeriod;
  maxPortionsPerSession?: number | null;
  limitedIngredientsPerSession?: { [ingredientName: string]: number } | null;
}

// PATCH /restaurant/:restaurantId/order-settings
export interface UpdateOrderSettingsDto {
  minimumDeliveryNoticeHours?: number;
  maxPortionsPerOrder?: number | null;
}

/**
 * Form Data Types
 */
export interface InventoryManagementFormData {
  // Catering
  cateringEnabled: boolean;
  maximumCateringPortionsPerDay: number;

  // Corporate
  corporateEnabled: boolean;
  sessionResetPeriod: SessionResetPeriod;
  maxPortionsPerSession: number | null;

  // Ingredient tracking
  ingredientsEnabled: boolean;
  ingredients: IngredientLimit[];
}

export interface IngredientLimit {
  id: string; // Local UI ID for managing the list
  name: string; // Ingredient name (e.g., "chicken", "lobster")
  maxPerSession: number; // Max quantity per session
}

/**
 * Reset Schedule Information
 */
export interface ResetScheduleInfo {
  period: SessionResetPeriod;
  description: string;
  nextResetTime?: Date;
  cronExpression?: string;
}

export const RESET_SCHEDULES: Record<string, ResetScheduleInfo> = {
  daily: {
    period: 'daily',
    description: 'Daily at midnight (00:00)',
    cronExpression: '0 0 0 * * *',
  },
  lunch_dinner: {
    period: 'lunch_dinner',
    description: 'Lunch (12:00) & Dinner (18:00)',
    cronExpression: '0 0 12,18 * * *',
  },
};
