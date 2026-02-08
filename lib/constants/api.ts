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

  // Coworking Dashboard
  COWORKING_DASHBOARD_ME: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/me`,
  COWORKING_DASHBOARD_ORDERS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/orders`,
  COWORKING_DASHBOARD_ORDER: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}`,
  COWORKING_DASHBOARD_STATS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stats`,
} as const;

export const EXTERNAL_APIS = {
  GOOGLE_MAPS: (apiKey: string) =>
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
} as const;
