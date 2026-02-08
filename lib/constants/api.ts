/**
 * API Configuration Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_ENDPOINTS = {
  // Restaurant
  RESTAURANT: '/restaurant',
  RESTAURANT_DETAILS: (id: string) => `/restaurant/${id}`,
  RESTAURANT_CATERING: '/restaurant/catering/restaurants',

  // Corporate
  CORPORATE_WALLET_PAYMENT_INTENT: (orgId: string) =>
    `/corporate/organization/wallet/organization/wallet/catering-payment-intent/${orgId}`,

  // Image Upload
  IMAGE_UPLOAD: '/image-upload',
  IMAGE_UPLOAD_BATCH: '/image-upload/batch',
  IMAGE_DELETE: '/image-upload',

  // Catering Orders
  CATERING_ORDERS: '/catering-orders',
  CATERING_ORDER_RECEIPT: (orderId: string, restaurantId: string) =>
    `/catering-orders/${orderId}/restaurant/${restaurantId}/receipt-calc?style=MENU_ITEM`,

  // Catering Bundles
  CATERING_BUNDLE: (id: string) => `/catering-bundles/${id}`,

  // Coworking Dashboard (Partner)
  COWORKING_DASHBOARD_ME: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/me`,
  COWORKING_DASHBOARD_ORDERS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/orders`,
  COWORKING_DASHBOARD_ORDER: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}`,
  COWORKING_DASHBOARD_STATS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stats`,

  // Coworking Public (Member Flow)
  COWORKING_SPACE: (spaceSlug: string) => `/coworking/${spaceSlug}`,
  COWORKING_START_SESSION: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/start-session`,
  COWORKING_VERIFY_EMAIL: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/verify-email`,
  COWORKING_VERIFY: (spaceSlug: string) => `/coworking/${spaceSlug}/verify`,
  COWORKING_VERIFY_BOOKING: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/verify-booking`,
  COWORKING_BOOKINGS: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/bookings`,
  COWORKING_ORDERS: (spaceSlug: string) => `/coworking/${spaceSlug}/orders`,
  COWORKING_ORDER: (spaceSlug: string, orderId: string) =>
    `/coworking/${spaceSlug}/orders/${orderId}`,

  // Coworking Admin
  ADMIN_COWORKING: '/admin/coworking',
  ADMIN_COWORKING_SPACE: (id: string) => `/admin/coworking/${id}`,
  ADMIN_COWORKING_RESTORE: (id: string) => `/admin/coworking/${id}/restore`,
  ADMIN_COWORKING_CREDENTIALS: (id: string) =>
    `/admin/coworking/${id}/credentials`,
  ADMIN_COWORKING_USERS: (id: string) => `/admin/coworking/${id}/users`,
  ADMIN_COWORKING_USER: (id: string, userId: string) =>
    `/admin/coworking/${id}/users/${userId}`,
} as const;

export const EXTERNAL_APIS = {
  GOOGLE_MAPS: (apiKey: string) =>
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
} as const;
