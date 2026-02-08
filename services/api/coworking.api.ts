/**
 * Coworking Public API Service
 *
 * Provides API methods for the coworking member-facing flow.
 * Handles authentication (session start, magic link, booking verification)
 * and order management for coworking space members.
 *
 * Backend: src/features/coworking/controllers/coworking.controller.ts
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import {
  CoworkingSpaceInfo,
  StartSessionRequest,
  StartSessionResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  VerifyBookingRequest,
  VerifyBookingResponse,
  VerifyMagicLinkResponse,
  GetBookingsResponse,
  CreateCoworkingOrderRequest,
  CreateOrderResponse,
  GetOrdersResponse,
  GetOrderDetailResponse,
} from '@/types/api';

const SESSION_TOKEN_KEY = 'coworking_session_token';

class CoworkingService {
  /**
   * Set the session token for authenticated requests
   * Uses sessionStorage to persist across page refreshes but clear on tab close
   */
  setSessionToken(token: string | null): void {
    if (typeof window === 'undefined') return;

    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }

  /**
   * Get the current session token
   */
  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  /**
   * Clear the session (logout)
   */
  clearSession(): void {
    this.setSessionToken(null);
  }

  /**
   * Make an authenticated request with the session token
   */
  private async fetchWithSession(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getSessionToken();
    if (!token) {
      throw new Error('No session token set. Please authenticate first.');
    }

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  // ============================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ============================================================

  /**
   * Get coworking space info (public)
   */
  async getSpaceInfo(spaceSlug: string): Promise<CoworkingSpaceInfo> {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_SPACE(spaceSlug)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch space info');
    }

    return response.json();
  }

  /**
   * Start a simple session with email and name (no OfficeRnD verification)
   * Rate limited: 5 requests per minute per IP
   */
  async startSession(
    spaceSlug: string,
    data: StartSessionRequest
  ): Promise<StartSessionResponse> {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_START_SESSION(spaceSlug)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error('Failed to start session');
    }

    const result = await response.json();
    this.setSessionToken(result.sessionToken);
    return result;
  }

  /**
   * Send magic link email for OfficeRnD member verification
   * Rate limited: 3 requests per minute per IP
   * Always returns success to prevent email enumeration
   */
  async sendMagicLink(
    spaceSlug: string,
    data: VerifyEmailRequest
  ): Promise<VerifyEmailResponse> {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_VERIFY_EMAIL(spaceSlug)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error('Failed to send verification email');
    }

    return response.json();
  }

  /**
   * Verify magic link token (called when user clicks link in email)
   */
  async verifyMagicLink(
    spaceSlug: string,
    token: string
  ): Promise<VerifyMagicLinkResponse> {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_VERIFY(spaceSlug)}?token=${encodeURIComponent(token)}`
    );

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid or expired verification link');
      }
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to verify link');
    }

    const result = await response.json();
    this.setSessionToken(result.sessionToken);
    return result;
  }

  /**
   * Verify by booking reference and email
   * Rate limited: 5 requests per minute per IP
   */
  async verifyBooking(
    spaceSlug: string,
    data: VerifyBookingRequest
  ): Promise<VerifyBookingResponse> {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_VERIFY_BOOKING(spaceSlug)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid booking reference or email');
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error('Failed to verify booking');
    }

    const result = await response.json();
    this.setSessionToken(result.sessionToken);
    return result;
  }

  // ============================================================
  // AUTHENTICATED ENDPOINTS (require session token)
  // ============================================================

  /**
   * Get member's bookings for today
   * Only returns bookings for OfficeRnD verified members
   */
  async getBookings(spaceSlug: string): Promise<GetBookingsResponse> {
    const response = await this.fetchWithSession(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_BOOKINGS(spaceSlug)}`
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please authenticate again.');
      }
      throw new Error('Failed to fetch bookings');
    }

    return response.json();
  }

  /**
   * Create a coworking order
   */
  async createOrder(
    spaceSlug: string,
    data: CreateCoworkingOrderRequest
  ): Promise<CreateOrderResponse> {
    const response = await this.fetchWithSession(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_ORDERS(spaceSlug)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please authenticate again.');
      }
      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Invalid order data');
      }
      throw new Error('Failed to create order');
    }

    return response.json();
  }

  /**
   * Get member's orders
   */
  async getOrders(spaceSlug: string): Promise<GetOrdersResponse> {
    const response = await this.fetchWithSession(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_ORDERS(spaceSlug)}`
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please authenticate again.');
      }
      throw new Error('Failed to fetch orders');
    }

    return response.json();
  }

  /**
   * Get detailed order information
   */
  async getOrder(
    spaceSlug: string,
    orderId: string
  ): Promise<GetOrderDetailResponse> {
    const response = await this.fetchWithSession(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_ORDER(spaceSlug, orderId)}`
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please authenticate again.');
      }
      if (response.status === 404) {
        throw new Error('Order not found');
      }
      throw new Error('Failed to fetch order details');
    }

    return response.json();
  }
}

// Export singleton instance
export const coworkingService = new CoworkingService();
