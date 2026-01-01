/**
 * Calculate split payments between platform and creator
 * Platform fee: 10%
 * Creator amount: 90%
 */

export interface SplitPaymentResult {
  totalAmount: number; // Original amount in paise
  platformFee: number; // 10% in paise
  creatorAmount: number; // 90% in paise
}

/**
 * Calculate split payment (90% creator, 10% platform)
 * @param amount - Amount in paise (smallest currency unit)
 * @returns Split payment result
 */
export function calculateSplitPayment(amount: number): SplitPaymentResult {
  if (amount < 0) {
    throw new Error("Amount cannot be negative");
  }

  // Calculate platform fee (10%)
  const platformFee = Math.round(amount * 0.1);

  // Calculate creator amount (90%)
  const creatorAmount = amount - platformFee;

  return {
    totalAmount: amount,
    platformFee,
    creatorAmount,
  };
}

/**
 * Convert rupees to paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise to rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

