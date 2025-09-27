/**
 * Format a price with proper thousands separators and currency symbol
 * @param price - The price number to format
 * @param currency - The currency symbol (default: '$')
 * @returns Formatted price string (e.g., "$1,234.56")
 */
export function formatPrice(price: number, currency: string = '$'): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return `${currency}0`;
  }
  
  // Use Intl.NumberFormat for proper localization and formatting
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(price);
}

/**
 * Format a price as a number with thousands separators (no currency symbol)
 * @param price - The price number to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatPriceNumber(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0';
  }
  
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(price);
}