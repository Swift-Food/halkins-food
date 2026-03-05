/**
 * Coworking Dashboard API Service
 *
 * Provides API methods for the coworking partner dashboard.
 * Partners can view their space's orders and statistics.
 *
 * Backend: src/features/coworking/controllers/coworking-dashboard.controller.ts
 */

import { fetchWithAuth } from '@/lib/api-client/auth-client';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import {
  DashboardMeResponse,
  DashboardOrdersResponse,
  DashboardOrderDetailResponse,
  DashboardStatsResponse,
  DashboardOrderQuery,
  DashboardStatsQuery,
} from '@/types/api';

class CoworkingDashboardService {
  /**
   * Get current user info by space slug (resolves slug → spaceId)
   */
  async getMeBySlug(spaceSlug: string): Promise<DashboardMeResponse> {
    console.log("endopjnt", API_ENDPOINTS.COWORKING_DASHBOARD_ME_BY_SLUG(spaceSlug))
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_ME_BY_SLUG(spaceSlug)}`
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have access to this coworking space');
      }
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  /**
   * Get current user info and their role for the specified space
   */
  async getMe(spaceId: string): Promise<DashboardMeResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_ME(spaceId)}`
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have access to this coworking space');
      }
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  /**
   * List orders for the coworking space with optional filtering
   */
  async getOrders(
    spaceId: string,
    query?: DashboardOrderQuery
  ): Promise<DashboardOrdersResponse> {
    const params = new URLSearchParams();

    if (query?.status) {
      params.append('status', query.status);
    }
    if (query?.from) {
      params.append('from', query.from);
    }
    if (query?.to) {
      params.append('to', query.to);
    }
    if (query?.memberEmail) {
      params.append('memberEmail', query.memberEmail);
    }
    if (query?.page) {
      params.append('page', query.page.toString());
    }
    if (query?.limit) {
      params.append('limit', query.limit.toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_ORDERS(spaceId)}${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have access to this coworking space');
      }
      throw new Error('Failed to fetch orders');
    }

    return response.json();
  }

  /**
   * Get detailed information about a specific order
   */
  async getOrder(
    spaceId: string,
    orderId: string
  ): Promise<DashboardOrderDetailResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_ORDER(spaceId, orderId)}`
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have access to this coworking space');
      }
      if (response.status === 404) {
        throw new Error('Order not found');
      }
      throw new Error('Failed to fetch order details');
    }

    return response.json();
  }

  /**
   * Approve a pending order
   */
  async approveOrder(
    spaceId: string,
    orderId: string
  ): Promise<DashboardOrderDetailResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_APPROVE_ORDER(spaceId, orderId)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to approve order');
    }

    return response.json();
  }

  /**
   * Reject a pending order
   */
  async rejectOrder(
    spaceId: string,
    orderId: string,
    reason?: string
  ): Promise<DashboardOrderDetailResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_REJECT_ORDER(spaceId, orderId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to reject order');
    }

    return response.json();
  }

  /**
   * Get aggregated statistics for the coworking space
   */
  async getStats(
    spaceId: string,
    query?: DashboardStatsQuery
  ): Promise<DashboardStatsResponse> {
    const params = new URLSearchParams();

    if (query?.from) {
      params.append('from', query.from);
    }
    if (query?.to) {
      params.append('to', query.to);
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_STATS(spaceId)}${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have access to this coworking space');
      }
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }
}

// Export singleton instance
export const coworkingDashboardService = new CoworkingDashboardService();
