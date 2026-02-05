/**
 * Google Maps Configuration Constants
 */

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const GOOGLE_MAPS_CONFIG = {
  COUNTRY_RESTRICTION: 'gb',
  LIBRARIES: ['places'] as const,
  FIELDS: ['address_components', 'geometry', 'formatted_address'] as string[],
} as const;
