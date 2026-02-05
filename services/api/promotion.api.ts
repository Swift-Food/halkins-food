// app/api/promotionsApi.ts
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-client/auth-client";

export interface DiscountTier {
  minQuantity: number;
  discountPercentage: number;
}

export interface Promotion {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  promotionType:
    | "RESTAURANT_WIDE"
    | "ITEM_SPECIFIC"
    | "CATEGORY_SPECIFIC"
    | "BUY_MORE_SAVE_MORE"
    | "BOGO";
  status: "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED";
  applicability: "CATERING" | "CORPORATE" | "BOTH";
  discountPercentage: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startDate: string;
  endDate: string;
  applicableMenuItemIds?: string[] | null;
  applicableCategories?: string[] | null;
  priority: number;
  discountTiers?: DiscountTier[] | null;
  applyToAllGroups?: boolean;
  bogoItemIds?: string[] | null;
  bogoType?: "BUY_ONE_GET_ONE_FREE" | "BUY_X_GET_Y_FREE" | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  isStackable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionDto {
  restaurantId: string;
  name: string;
  description?: string;
  promotionType:
    | "RESTAURANT_WIDE"
    | "ITEM_SPECIFIC"
    | "CATEGORY_SPECIFIC"
    | "BUY_MORE_SAVE_MORE";
  applicability: "CATERING" | "CORPORATE" | "BOTH";
  discountPercentage: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startDate: string;
  endDate: string;
  applicableMenuItemIds?: string[];
  applicableCategories?: string[];
  discountTiers?: DiscountTier[];
  applyToAllGroups?: boolean;
  bogoItemIds?: string[];
  bogoType?: "BUY_ONE_GET_ONE_FREE" | "BUY_X_GET_Y_FREE";
  buyQuantity?: number;
  getQuantity?: number;
  priority?: number;
  isStackable?: boolean;
}

export interface UpdatePromotionDto extends Partial<CreatePromotionDto> {
  status?: "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED";
}

export interface PromotionValidationResult {
  isValid: boolean;
  discount: number;
  message?: string;
}

export const promotionsServices = {
  // Get all promotions for a restaurant
  getRestaurantPromotions: async (restaurantId: string, status?: string) => {
    const url = status
      ? `${API_BASE_URL}/promotions/restaurant/${restaurantId}?status=${status}`
      : `${API_BASE_URL}/promotions/restaurant/${restaurantId}`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error("Failed to fetch restaurant promotions");
    }

    return response.json();
  },

  // Get active promotions (customer view) - Public endpoint
  getActivePromotions: async (
    restaurantId: string,
    orderType: "CATERING" | "CORPORATE"
  ) => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/promotions/restaurant/${restaurantId}/active?orderType=${orderType}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch active promotions");
    }

    return response.json();
  },

  // Get single promotion
  getPromotion: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/promotions/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch promotion");
    }

    return response.json();
  },

  // Create promotion
  createPromotion: async (data: CreatePromotionDto) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/promotions`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create promotion");
    }

    return response.json();
  },

  // Update promotion
  updatePromotion: async (id: string, data: Partial<CreatePromotionDto>) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/promotions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update promotion");
    }

    return response.json();
  },

  // Update status
  updatePromotionStatus: async (id: string, status: "ACTIVE" | "INACTIVE") => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/promotions/${id}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update promotion status");
    }

    return response.json();
  },

  // Delete promotion
  deletePromotion: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/promotions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete promotion");
    }

    return response.json();
  },

  // Validate promotion
  validatePromotion: async (
    promotionId: string,
    restaurantId: string,
    orderSubtotal: number,
    orderType: "CATERING" | "CORPORATE"
  ) => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/promotions/validate`,
      {
        method: "POST",
        body: JSON.stringify({
          promotionId,
          restaurantId,
          orderSubtotal,
          orderType,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to validate promotion");
    }

    return response.json();
  },

  async getPromotionById(promotionId: string): Promise<Promotion> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/promotions/${promotionId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch promotion by ID");
    }

    return response.json();
  },
};
