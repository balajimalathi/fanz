/**
 * Currency utility functions for formatting amounts
 * All amounts in the database are stored in paise (smallest currency unit)
 * These functions convert paise to rupees for display
 */

/**
 * Convert paise to rupees
 * @param amountInPaise - Amount in paise
 * @returns Amount in rupees
 */
export function paiseToRupees(amountInPaise: number): number {
  return amountInPaise / 100;
}

/**
 * Format currency from paise to rupees with Indian currency symbol
 * @param amountInPaise - Amount in paise
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "₹1,234.56")
 */
export function formatCurrency(
  amountInPaise: number,
  options?: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {};

  const amountInRupees = paiseToRupees(amountInPaise);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: showSymbol ? "currency" : "decimal",
    currency: "INR",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amountInRupees);

  return formatted;
}

/**
 * Format currency in compact notation (e.g., "₹1.2K", "₹5.4M")
 * @param amountInPaise - Amount in paise
 * @returns Compact formatted currency string
 */
export function formatCurrencyCompact(amountInPaise: number): string {
  const amountInRupees = paiseToRupees(amountInPaise);

  if (amountInRupees >= 10000000) {
    // 1 crore and above
    return `₹${(amountInRupees / 10000000).toFixed(1)}Cr`;
  } else if (amountInRupees >= 100000) {
    // 1 lakh and above
    return `₹${(amountInRupees / 100000).toFixed(1)}L`;
  } else if (amountInRupees >= 1000) {
    // 1 thousand and above
    return `₹${(amountInRupees / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amountInPaise);
  }
}

