/**
 * API Configuration Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_ENDPOINTS = {
  // Restaurant
  RESTAURANT: '/restaurant',
  RESTAURANT_DETAILS: (id: string) => `/restaurant/${id}`,
  RESTAURANT_CATERING: '/restaurant/catering/restaurants',


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
  CATERING_BUNDLES_RESTAURANT: (restaurantId: string) =>
    `/catering-bundles/restaurant/${restaurantId}`,
  CATERING_BUNDLES_CATERING: '/catering-bundles?type=catering',

  // Coworking Dashboard (Partner)
  COWORKING_DASHBOARD_ME_BY_SLUG: (spaceSlug: string) =>
    `/coworking-dashboard/slug/${spaceSlug}/me`,
  COWORKING_DASHBOARD_ME: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/me`,
  COWORKING_DASHBOARD_ORDERS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/orders`,
  COWORKING_DASHBOARD_ORDER: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}`,
  COWORKING_DASHBOARD_STATS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stats`,
  COWORKING_DASHBOARD_APPROVE_ORDER: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}/approve`,
  COWORKING_DASHBOARD_REJECT_ORDER: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}/reject`,
  COWORKING_DASHBOARD_SET_VENUE_HIRE_FEE: (spaceId: string, orderId: string) =>
    `/coworking-dashboard/${spaceId}/orders/${orderId}/set-venue-hire-fee`,
  COWORKING_DASHBOARD_VENUES: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/venues`,
  COWORKING_DASHBOARD_VENUE: (spaceId: string, venueId: string) =>
    `/coworking-dashboard/${spaceId}/venues/${venueId}`,
  COWORKING_DASHBOARD_VENUE_ACTIVE_ORDER_COUNT: (spaceId: string, venueId: string) =>
    `/coworking-dashboard/${spaceId}/venues/${venueId}/active-order-count`,
  COWORKING_DASHBOARD_VENUE_TRANSFER_AND_DELETE: (spaceId: string, venueId: string) =>
    `/coworking-dashboard/${spaceId}/venues/${venueId}/transfer-and-delete`,
  COWORKING_DASHBOARD_STRIPE_STATUS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/status`,
  COWORKING_DASHBOARD_STRIPE_SETUP: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/setup`,
  COWORKING_DASHBOARD_STRIPE_REFRESH: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/refresh`,
  COWORKING_DASHBOARD_STRIPE_BALANCE: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/balance`,
  COWORKING_DASHBOARD_STRIPE_WITHDRAW: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/withdraw`,
  COWORKING_DASHBOARD_STRIPE_TRANSACTIONS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/transactions`,
  COWORKING_DASHBOARD_CALENDAR: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/calendar`,
  COWORKING_DASHBOARD_PROMO_CODES: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/promo-codes`,
  COWORKING_DASHBOARD_PROMO_CODE: (spaceId: string, code: string) =>
    `/coworking-dashboard/${spaceId}/promo-codes/${code}`,

  // Coworking Public (Member Flow)
  COWORKING_SPACE: (spaceSlug: string) => `/coworking/${spaceSlug}`,
  COWORKING_START_SESSION: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/start-session`,
  COWORKING_VERIFY_EMAIL: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/verify-email`,
  COWORKING_VERIFY: (spaceSlug: string) => `/coworking/${spaceSlug}/verify`,
  COWORKING_VERIFY_BOOKING: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/verify-booking`,
  COWORKING_REFRESH: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/refresh`,
  COWORKING_BOOKINGS: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/bookings`,
  COWORKING_ORDERS: (spaceSlug: string) => `/coworking/${spaceSlug}/orders`,
  COWORKING_ORDER: (spaceSlug: string, orderId: string) =>
    `/coworking/${spaceSlug}/orders/${orderId}`,
  COWORKING_CART_PRICING: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/cart-pricing`,
  COWORKING_CREATE_CHECKOUT: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/create-checkout`,
  COWORKING_CONFIRM_CHECKOUT: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/confirm-checkout`,
  COWORKING_VIEW_BY_TOKEN: (spaceSlug: string, token: string) =>
    `/coworking/${spaceSlug}/view/${token}`,
  COWORKING_VENUES: (spaceSlug: string) => `/coworking-dashboard/${spaceSlug}/venues`,

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
