/**
 * Stripe Configuration Constants
 */

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export const STRIPE_CONFIG = {
  // Add any Stripe-specific configuration here
  CURRENCY: 'GBP',
  LOCALE: 'en-GB',
} as const;
