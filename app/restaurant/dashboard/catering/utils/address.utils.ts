/**
 * Address formatting utilities
 * Handles both string and object address formats from backend
 */

/**
 * Format delivery address (handles both string and object formats)
 */
export function formatDeliveryAddress(address: any): string {
  if (typeof address === 'string') return address;
  if (typeof address === 'object' && address !== null) {
    const { street, city, postcode, country } = address;
    return [street, city, postcode, country].filter(Boolean).join(', ');
  }
  return '';
}
