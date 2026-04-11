/**
 * Calculate split payments between platform and creator
 * Platform fee: 0%
 * Creator amount: 100%
 */

export interface SplitPaymentResult {
  totalAmount: number; // Original amount in paise
  platformFee: number; // 10% in paise
  creatorAmount: number; // 90% in paise
}

/**
 * Split payment: 100% to creator, no platform commission.
 * @param amount - Amount in paise (smallest currency unit)
 * @returns Split payment result
 */
export function calculateSplitPayment(amount: number): SplitPaymentResult {
  if (amount < 0) {
    throw new Error("Amount cannot be negative");
  }

  const platformFee = 0;
  const creatorAmount = amount;

  return {
    totalAmount: amount,
    platformFee,
    creatorAmount,
  };
}

