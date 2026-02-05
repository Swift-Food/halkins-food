/**
 * Application-wide Constants
 */

// Catering
export const CATERING = {
  DEFAULT_QUANTITY_UNIT: 7,
  DEFAULT_FEEDS_PER_UNIT: 10,
  MIN_PORTIONS: 10,
  MAX_PORTIONS: 1000,
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Event Types
export const EVENT_TYPES = [
  { label: 'Corporate Event', value: 'corporate' },
  { label: 'Private Party', value: 'private' },
  { label: 'Wedding', value: 'wedding' },
  { label: 'Conference', value: 'conference' },
  { label: 'Birthday Party', value: 'birthday' },
  { label: 'Other', value: 'other' },
] as const;

// User Types
export const USER_TYPES = {
  CUSTOMER: 'customer',
  CORPORATE: 'corporate',
  RESTAURANT: 'restaurant',
  RIDER: 'rider',
  ADMIN: 'admin',
} as const;

// Validation
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 11,
  MIN_PASSWORD_LENGTH: 8,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Date/Time
export const DATE_TIME = {
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
} as const;

// Currency
export const CURRENCY = {
  CODE: 'GBP',
  SYMBOL: '£',
  DECIMAL_PLACES: 2,
} as const;
