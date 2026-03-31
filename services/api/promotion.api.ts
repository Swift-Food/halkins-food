import { API_BASE_URL } from "@/lib/constants";

export interface Promotion {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  promotionType:
    | "RESTAURANT_WIDE"
    | "CATEGORY_SPECIFIC"
    | "ITEM_SPECIFIC"
    | "BUY_MORE_SAVE_MORE"
    | "BOGO";
  status: "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED";
  applicability: "CATERING" | "CORPORATE" | "BOTH";
  discountPercentage: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startDate: string;
  endDate: string;
  priority: number;
  isStackable: boolean;
  hasPromotion: boolean;
  discountTiers?: { minQuantity: number; discountPercentage: number }[];
  applicableCategories?: string[];
  applicableMenuItemIds?: string[];
  bogoItemIds?: string[];
  bogoType?: "BUY_ONE_GET_ONE_FREE" | "BUY_X_GET_Y_FREE";
  buyQuantity?: number | null;
  getQuantity?: number | null;
  applyToAllGroups?: boolean;
}

export async function getActivePromotions(
  restaurantId: string,
  orderType: "CATERING" | "CORPORATE"
): Promise<Promotion[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/promotions/restaurant/${restaurantId}/active?orderType=${orderType}`
    );
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
