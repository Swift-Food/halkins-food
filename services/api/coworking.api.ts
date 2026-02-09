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
  RefreshTokenResponse,
} from '@/types/api';

const ACCESS_TOKEN_KEY = 'coworking_access_token';
const REFRESH_TOKEN_KEY = 'coworking_refresh_token';
const SPACE_SLUG_KEY = 'coworking_space_slug';

/**
 * Custom error for session expiration
 * Components can catch this to redirect to login
 */
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

class CoworkingService {
  /**
   * Store tokens after authentication
   */
  setTokens(accessToken: string, refreshToken: string, spaceSlug?: string): void {
    if (typeof window === 'undefined') return;

    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (spaceSlug) {
      sessionStorage.setItem(SPACE_SLUG_KEY, spaceSlug);
    }
  }

  /**
   * Get the current access token
   */
  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get the stored space slug
   */
  getSpaceSlug(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SPACE_SLUG_KEY);
  }

  /**
   * Clear the session (logout)
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(SPACE_SLUG_KEY);
  }

  /**
   * Refresh tokens using the refresh token
   */
  private async refreshTokens(): Promise<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    const spaceSlug = this.getSpaceSlug();

    if (!refreshToken || !spaceSlug) {
      throw new SessionExpiredError('No refresh token available');
    }

    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_REFRESH(spaceSlug)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!response.ok) {
      throw new SessionExpiredError('Token refresh failed');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  /**
   * Make an authenticated request with the session token
   * Automatically refreshes on 401 and retries the request
   */
  private async fetchWithSession(
    url: string,
    options: RequestInit & { _retry?: boolean } = {}
  ): Promise<Response> {
    const token = this.getSessionToken();
    if (!token) {
      this.clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('coworking-session-expired'));
      }
      throw new SessionExpiredError('No session token. Please authenticate first.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    // Handle 401 with refresh logic
    if (response.status === 401 && !options._retry) {
      // Skip refresh for refresh endpoint itself
      if (url.includes('/refresh')) {
        this.clearSession();
        throw new SessionExpiredError('Session expired. Please authenticate again.');
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          return this.fetchWithSession(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
            _retry: true,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResult = await this.refreshTokens();
        processQueue(null, refreshResult.access_token);
        isRefreshing = false;

        // Retry original request with new token
        return this.fetchWithSession(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${refreshResult.access_token}`,
          },
          _retry: true,
        });
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        this.clearSession();

        // Dispatch event for UI to handle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('coworking-session-expired'));
        }

        throw new SessionExpiredError('Session expired. Please authenticate again.');
      }
    }

    return response;
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
    this.setTokens(result.access_token, result.refresh_token, spaceSlug);
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
    this.setTokens(result.access_token, result.refresh_token, spaceSlug);
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
    this.setTokens(result.access_token, result.refresh_token, spaceSlug);
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
