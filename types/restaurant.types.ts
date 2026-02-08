
export interface Restaurant {
  id: string;
  restaurant_name: string;
  restaurantType: string;
  images: string[];
  eventImages?: string[];
  averageRating: string;
  minCateringOrderQuantity?: number;
  minimumDeliveryNoticeHours?: number;
  contactEmail?: string;
  contactNumber?: string;
  cateringMinOrderSettings: {
    required?: Array<{
      minQuantity: number;
      applicableSections: string[];
    }>;
    optional?: Array<{
      minQuantity: number;
      applicableSections: string[];
    }>;
  } | null;
  cateringOperatingHours?:
    | {
        day: string;
        open: string | null;
        close: string | null;
        enabled: boolean;
      }[]
    | null;
}

export interface Addon {
  name: string;
  price: string;
  allergens: string;
  dietaryRestrictions?: string[];
  groupTitle: string;
  isRequired: boolean;
  selectionType: "single" | "multiple";
}

export interface MenuItem {
  id: string;
  menuItemName: string;
  description?: string;
  price: string;
  discountPrice?: string;
  allergens?: string[];
  isDiscount: boolean;
  image?: string;
  averageRating?: string;
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
  restaurantId: string;
  restaurantName?: string;
  groupTitle?: string;
  status?: string;
  itemDisplayOrder: number;
  addons: Addon[];
  selectedAddons?: {
    name: string;
    price: number;
    quantity: number;
    groupTitle: string;
    allergens?: string | string[];
    dietaryRestrictions?: string[];
  }[];
  addonPrice?: number;
  portionQuantity?: number;
  restaurant?: {
    id: string;
    name: string;
    restaurantId: string;
    menuGroupSettings?: Record<string, any>;
  };
  dietaryFilters?: string[];
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

// types/restaurant.types.ts
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  adminMode: boolean;
}

export interface SignInDto {
  email: string;
  password: string;
  role: string;
}

export interface StripeOnboardingStatus {
  complete: boolean;
  currentlyDue: string[];
  detailsSubmitted: boolean;
}

export interface BalanceInfo {
  available: number;
  pending: number;
  lastWithdrawal?: string;
  canWithdrawWithoutFee: boolean;
}

export type WithdrawalStatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "failed";

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  feeCharged: number;
  netAmount: number;
  status: WithdrawalStatusType;
  notes?: string;
  rejectionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  isInstantPayout: boolean;
}

export interface AnalyticsDashboard {
  today: DailyAnalytics;
  thisMonth: MonthlyAnalytics;
  lastMonth: MonthlyAnalytics;
  growth: {
    revenue: number;
    orders: number;
    earnings: number;
  };
}

export interface DailyAnalytics {
  // Corporate metrics
  corporateOrdersCount: number;
  corporateTotalRevenue: number;
  corporateRestaurantEarnings: number;
  corporateTotalItems: number;
  corporateUniqueCustomers: number;
  corporateAverageOrderValue: number;
  corporatePendingOrders: number;
  corporateDeliveredOrders: number;
  corporateCancelledOrders: number;

  // Catering metrics
  cateringOrdersCount: number;
  cateringTotalRevenue: number;
  cateringRestaurantEarnings: number;
  cateringTotalItems: number;
  cateringUniqueCustomers: number;
  cateringAverageOrderValue: number;
  cateringPendingOrders: number;
  cateringCompletedOrders: number;
  cateringCancelledOrders: number;

  // Combined metrics
  totalOrdersCount: number;
  totalRevenue: number;
  totalRestaurantEarnings: number;
  totalItems: number;

  // Insights
  topSellingItems?: TopSellingItem[];
  peakOrderTimes?: PeakOrderTime[];
  topCorporateOrganizations?: TopOrganization[];
}

export interface MonthlyAnalytics {
  // Corporate metrics
  corporateOrdersCount: number;
  corporateTotalRevenue: number;
  corporateRestaurantEarnings: number;
  corporateTotalItems: number;
  corporateAverageOrderValue: number;

  // Catering metrics
  cateringOrdersCount: number;
  cateringTotalRevenue: number;
  cateringRestaurantEarnings: number;
  cateringTotalItems: number;
  cateringAverageOrderValue: number;

  // Combined metrics
  totalOrdersCount: number;
  totalRevenue: number;
  totalRestaurantEarnings: number;
  totalItems: number;

  // Optional breakdown
  dailyBreakdown?: DailyAnalytics[];
}

export interface TopSellingItem {
  menuItemId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  orderType: "corporate" | "catering" | "both";
}

export interface PeakOrderTime {
  hour: number;
  orderCount: number;
}

export interface TopOrganization {
  organizationId: string;
  organizationName: string;
  orderCount: number;
  totalSpent: number;
}

export interface PickupAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  location: { latitude: number; longitude: number };
}

export interface PaymentAccount {
  name: string;
  stripeAccountId: string;
  stripeOnboardingComplete?: boolean;
}

export interface PaymentAccounts {
  [accountId: string]: PaymentAccount;
}