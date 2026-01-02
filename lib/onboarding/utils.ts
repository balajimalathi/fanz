import { CATEGORIES } from "@/types/onboarding";

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if user is 18+ years old
 */
export function isAdult(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 18;
}

/**
 * Get list of countries (simplified list - can be expanded or use a library)
 */
export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "South Korea",
  "Brazil",
  "Mexico",
  "Argentina",
  "South Africa",
  "Nigeria",
  "Egypt",
  "Saudi Arabia",
  "United Arab Emirates",
  "Singapore",
  "Malaysia",
  "Thailand",
  "Philippines",
  "Indonesia",
  "Vietnam",
  "China",
  "Russia",
  "Turkey",
  "Poland",
  "Netherlands",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Austria",
  "Portugal",
  "Greece",
  "Ireland",
  "New Zealand",
  "Chile",
  "Colombia",
  "Peru",
  "Venezuela",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
  "Other",
] as const;

/**
 * Get all available categories
 */
export function getCategories(): readonly string[] {
  return CATEGORIES;
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse date from input string
 */
export function parseDateFromInput(dateString: string): Date {
  return new Date(dateString + "T00:00:00");
}

