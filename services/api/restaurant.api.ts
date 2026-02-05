// api/restaurantApi.ts
import {
  TokenPair,
  SignInDto,
  StripeOnboardingStatus,
  BalanceInfo,
  WithdrawalRequest,
  AnalyticsDashboard,
  PaymentAccounts,
} from "@/types/restaurant.types";
import { CorporateUser } from "@/types/catering.types";
import {
  UpdateCorporateInventoryDto,
  UpdateCateringPortionsLimitDto,
  CateringPortionsAvailabilityResponse,
  UpdateOrderSettingsDto,
} from "@/types/inventory.types";
import { fetchWithAuth } from "@/lib/api-client/auth-client";
import { API_BASE_URL } from "@/lib/constants";
import { CateringOrderResponse } from "@/types/api";

export const restaurantApi = {
  // Auth endpoints - Keep using regular fetch (no auth needed)
  login: async (credentials: SignInDto): Promise<TokenPair> => {
    const response = await fetch(`${API_BASE_URL}/auth/login-consumer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error("Login failed");
    return response.json();
  },

  loginCorporate: async (credentials: {
    email: string;
    password: string;
  }): Promise<TokenPair> => {
    const response = await fetch(`${API_BASE_URL}/auth/corporate-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error("Corporate login failed");
    return response.json();
  },

  refreshToken: async (refreshToken: string): Promise<TokenPair> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) throw new Error("Token refresh failed");
    return response.json();
  },

  getProfile: async (): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  // Stripe onboarding endpoints
  checkStripeStatus: async (
    userId: string,
    accountId?: string | null
  ): Promise<StripeOnboardingStatus | null> => {
    try {
      const url = accountId
        ? `${API_BASE_URL}/restaurant-user/${userId}/stripe-status?accountId=${accountId}`
        : `${API_BASE_URL}/restaurant-user/${userId}/stripe-status`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        console.warn("Stripe status fetch failed:", response.status);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("Stripe status error:", error);
      return null;
    }
  },

  async getMenuGroups(restaurantId: string): Promise<string[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}/menu-groups`
    );
    if (!response.ok) throw new Error("Failed to get menu group titles");
    return response.json();
  },

  refreshOnboardingLink: async (
    userId: string,
    token: string,
    accountId?: string
  ): Promise<{ onboardingUrl: string }> => {
    // console.log("onboarding details sent", userId, accountId)
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant-user/${userId}/stripe-refresh`,
      {
        method: "POST",
        body: accountId ? JSON.stringify({ accountId }) : undefined,
      }
    );
    if (!response.ok) throw new Error("Failed to refresh onboarding link");
    return response.json();
  },

  // Withdrawal endpoints
  getBalance: async (
    userId: string,
    token: string,
    accountId?: string | null
  ): Promise<BalanceInfo | null> => {
    try {
      const url = accountId
        ? `${API_BASE_URL}/withdrawals/balance/${userId}/restaurant?accountId=${accountId}`
        : `${API_BASE_URL}/withdrawals/balance/${userId}/restaurant`;
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        console.warn("Balance fetch failed:", response.status);
        return null;
      }
      return response.json();
    } catch (error) {
      console.error("Balance error:", error);
      return null;
    }
  },

  getPaymentAccounts: async (
    restaurantUserId: string
  ): Promise<PaymentAccounts | null> => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/restaurant-user/${restaurantUserId}/payment-accounts`
      );
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error("Failed to fetch payment accounts:", error);
      return null;
    }
  },

  requestWithdrawal: async (data: {
    userId: string;
    userType: string;
    amount: number;
    notes?: string;
    isInstantPayout: boolean;
    accountId: string;
  }): Promise<WithdrawalRequest> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/withdrawals/request`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error("Failed to request withdrawal");
    return response.json();
  },

  getWithdrawalHistory: async (
    userId: string,
    token: string,
    accountId?: string | null
  ): Promise<WithdrawalRequest[]> => {
 
    const url = accountId
      ? `${API_BASE_URL}/withdrawals/history/${userId}/restaurant?accountId=${accountId}`
      : `${API_BASE_URL}/withdrawals/history/${userId}/restaurant`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error("Failed to fetch withdrawal history");
    return response.json();
  },

  // Catering endpoints
  getCateringOrders: async (
    restaurantId: string,
    selectedAccountId?: string | null
  ): Promise<CateringOrderResponse[]> => {
    console.log("id sent", restaurantId, selectedAccountId)
    console.log("url sent", `${API_BASE_URL}/catering-orders/restaurant/${restaurantId}`)
    const url = selectedAccountId
      ? `${API_BASE_URL}/catering-orders/restaurant/${restaurantId}?accountId=${selectedAccountId}`
      : `${API_BASE_URL}/catering-orders/restaurant/${restaurantId}`;

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error("Failed to fetch catering orders");
    return response.json();
  },

  reviewCateringOrder: async (
    orderId: string,
    restaurantId: string,
    accepted: boolean,
    token: string,
    selectedAccountId?: string,
    pickupAddressIndex?: number
  ): Promise<CateringOrderResponse> => {
    const body: Record<string, any> = {
      restaurantId,
      accepted,
      selectedAccountId,
    };
    if (pickupAddressIndex !== undefined) {
      body.pickupAddressIndex = pickupAddressIndex;
    }
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/${orderId}/restaurant-review`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) throw new Error("Failed to review catering order");
    return response.json();
  },

  reviewMealSession: async (
    sessionId: string,
    restaurantId: string,
    accepted: boolean,
    token?: string,
    selectedAccountId?: string
  ): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/sessions/${sessionId}/restaurant-review`,
      {
        method: "POST",
        body: JSON.stringify({
          restaurantId,
          accepted,
          selectedAccountId,
        }),
      }
    );
    if (!response.ok) throw new Error("Failed to review meal session");
    return response.json();
  },

  claimCateringOrder: async (
    orderId: string,
    restaurantId: string,
    selectedAccountId: string
  ): Promise<CateringOrderResponse> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/${orderId}/claim`,
      {
        method: "POST",
        body: JSON.stringify({
          restaurantId,
          selectedAccountId,
        }),
      }
    );
    if (!response.ok) throw new Error("Failed to claim catering order");
    return response.json();
  },

  // Analytics endpoints
  getAnalyticsDashboard: async (
    restaurantId: string
  ): Promise<AnalyticsDashboard> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant-analytics/${restaurantId}/dashboard`
    );
    if (!response.ok) throw new Error("Failed to fetch analytics dashboard");
    return response.json();
  },

  getMonthlyAnalytics: async (
    restaurantId: string,
    year: number,
    month: number
  ): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant-analytics/${restaurantId}/monthly?year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error("Failed to fetch monthly analytics");
    return response.json();
  },

  getYearlyAnalytics: async (
    restaurantId: string,
    year: number
  ): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant-analytics/${restaurantId}/yearly?year=${year}`
    );
    if (!response.ok) throw new Error("Failed to fetch yearly analytics");
    return response.json();
  },

  // Corporate user endpoints
  getCorporateUser: async (corporateUserId: string): Promise<CorporateUser> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/corporate-users/${corporateUserId}`
    );
    if (!response.ok) throw new Error("Failed to fetch corporate user");
    return response.json();
  },

  // Organization endpoints
  getOrganization: async (organizationId: string): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/organizations/${organizationId}`
    );
    if (!response.ok) throw new Error("Failed to fetch organization");
    return response.json();
  },

  // Inventory Management endpoints

  // Get catering portions availability
  getCateringPortionsAvailability: async (
    restaurantId: string
  ): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}/catering-portions-availability`
    );
    if (!response.ok)
      throw new Error("Failed to fetch catering portions availability");
    return response.json();
  },

  // Update catering portions limit
  updateCateringPortionsLimit: async (
    restaurantId: string,
    maximumCateringPortionsPerDay: number
  ): Promise<CateringPortionsAvailabilityResponse> => {
    const payload: UpdateCateringPortionsLimitDto = {
      maximumCateringPortionsPerDay,
    };

    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}/catering-portions-limit`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );


    if (!response.ok) {
      const errorText = await response.text();
      console.error("🟢 Catering Error:", errorText);
      throw new Error(
        `Failed to update catering portions limit: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  },

  // Get corporate inventory settings
  getCorporateInventorySettings: async (restaurantId: string): Promise<any> => {
    const url = `${API_BASE_URL}/restaurant/${restaurantId}/corporate-inventory`;


    const response = await fetchWithAuth(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🟣 Failed to get corporate inventory:", errorText);
      throw new Error(
        `Failed to get corporate inventory settings: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  },

  // Update corporate inventory settings
  updateCorporateInventory: async (
    restaurantId: string,
    data: UpdateCorporateInventoryDto
  ): Promise<any> => {
    const url = `${API_BASE_URL}/restaurant/${restaurantId}/corporate-inventory`;


    const response = await fetchWithAuth(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🟣 Corporate Error Response:", errorText);
      throw new Error(
        `Failed to update corporate inventory: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  },

  // Get restaurant details (includes inventory settings)
  getRestaurantDetails: async (restaurantId: string): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}`
    );
    if (!response.ok) throw new Error("Failed to fetch restaurant details");
    return response.json();
  },

  // Update order settings (notice hours, max portions per order)
  updateOrderSettings: async (
    restaurantId: string,
    data: UpdateOrderSettingsDto
  ): Promise<any> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}/order-settings`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update order settings: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
};
