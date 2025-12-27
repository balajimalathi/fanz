/**
 * Bundle pricing configuration for membership subscriptions
 */

export type BundleDuration = 1 | 3 | 6 | 12;

export interface BundleOption {
  duration: BundleDuration;
  label: string;
  discountPercent: number;
  multiplier: number; // Price multiplier (e.g., 0.9 for 10% discount)
}

export const BUNDLE_OPTIONS: BundleOption[] = [
  { duration: 1, label: "1 Month", discountPercent: 0, multiplier: 1.0 },
  { duration: 3, label: "3 Months", discountPercent: 10, multiplier: 0.9 },
  { duration: 6, label: "6 Months", discountPercent: 15, multiplier: 0.85 },
  { duration: 12, label: "1 Year", discountPercent: 20, multiplier: 0.8 },
];

/**
 * Calculate the total price for a membership subscription based on duration
 * @param monthlyPrice - The monthly recurring fee in rupees
 * @param duration - The subscription duration in months (1, 3, 6, or 12)
 * @returns The total price for the subscription period
 */
export function calculateBundlePrice(monthlyPrice: number, duration: BundleDuration): number {
  const bundle = BUNDLE_OPTIONS.find((b) => b.duration === duration);
  if (!bundle) {
    throw new Error(`Invalid duration: ${duration}. Must be 1, 3, 6, or 12 months.`);
  }

  const pricePerMonth = monthlyPrice * bundle.multiplier;
  return Math.round(pricePerMonth * duration);
}

/**
 * Get bundle option by duration
 */
export function getBundleOption(duration: BundleDuration): BundleOption {
  const bundle = BUNDLE_OPTIONS.find((b) => b.duration === duration);
  if (!bundle) {
    throw new Error(`Invalid duration: ${duration}. Must be 1, 3, 6, or 12 months.`);
  }
  return bundle;
}

/**
 * Calculate savings amount for a bundle compared to monthly pricing
 * @param monthlyPrice - The monthly recurring fee in rupees
 * @param duration - The subscription duration in months
 * @returns The amount saved compared to paying monthly
 */
export function calculateSavings(monthlyPrice: number, duration: BundleDuration): number {
  const totalMonthlyPrice = monthlyPrice * duration;
  const bundlePrice = calculateBundlePrice(monthlyPrice, duration);
  return totalMonthlyPrice - bundlePrice;
}

