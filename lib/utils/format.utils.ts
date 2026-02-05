/**
 * Global formatting utilities
 */

export function formatCurrency(amount: number | string, currency = 'GBP'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = currency === 'GBP' ? '£' : '$';
  return `${symbol}${numAmount.toFixed(2)}`;
}

export function formatDate(date: string | Date, locale = 'en-GB'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date, locale = 'en-GB'): string {
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatPhoneNumber(phone: string): string {
  // UK format: +44 7700 900123 → 07700 900123
  return phone.replace(/^\+44/, '0').replace(/\s/g, '');
}
