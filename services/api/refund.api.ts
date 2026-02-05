// services/refundServices.ts
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-client/auth-client";
import { RefundRequest } from "@/types/refund.types";

class RefundService {
  async createRefundRequest(
    data: {
      orderType: 'catering' | 'corporate';
      orderId: string;
      refundItems?: {
        menuItemId: string;
        itemName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
      restaurantId: string;
      reason: string;
      additionalDetails?: string;
      images?: string[];
      requestedAmount: number;
    },
    userId: string
  ): Promise<RefundRequest> {
    const response = await fetchWithAuth(`${API_BASE_URL}/refunds/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create refund request');
    }

    return response.json();
  }

  async getOrderRefunds(orderId: string): Promise<RefundRequest[]> {
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/refunds/order/${orderId}?orderType=catering`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch order refunds');
    }

    return response.json();
  }

  async getRestaurantRefundRequests(restaurantId: string): Promise<RefundRequest[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/refunds/restaurant/${restaurantId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch restaurant refund requests');
    }

    return response.json();
  }

  async processRefund(
    refundId: string,
    restUserId: string,
    data: {
      status: 'approved' | 'rejected';
      approvedAmount?: number;
      restaurantResponse?: string;
    }
  ): Promise<any> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/refunds/${refundId}/${restUserId}/process`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process refund');
    }

    return response.json();
  }
}

export const refundService = new RefundService();