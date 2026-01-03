export type CreatorType = "ai" | "human";
export type ContentType = "18+" | "general";

export type GenderOption = "male" | "female" | "non-binary" | "prefer-not-to-say" | "other";

export interface OnboardingStepData {
  country?: string;
  currency?: string;
  creatorType?: CreatorType;
  contentType?: ContentType;
  username?: string;
  displayName?: string;
  gender?: GenderOption;
  dateOfBirth?: string;
  categories?: string[];
}

export interface OnboardingFormData extends OnboardingStepData {
  // All fields required for completion
  country: string;
  creatorType: CreatorType;
  contentType: ContentType;
  username: string;
  displayName: string;
  gender: GenderOption;
  dateOfBirth: string;
  categories: string[];
}

export const CATEGORIES = [
  "Fitness",
  "Cooking",
  "Gaming",
  "Education",
  "Entertainment",
  "Lifestyle",
  "Technology",
  "Art",
  "Music",
  "Business",
  "Fashion",
  "Travel",
  "Health",
  "Finance",
  "Sports",
] as const;
