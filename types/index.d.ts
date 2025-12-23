import { User } from "@prisma/client";
import type { Icon } from "lucide-react";

import { Icons } from "@/components/shared/icons";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  mailSupport: string;
  login: string,
  links: {
    twitter: string;
    github: string;
  };
};

export type NavItem = {
  title: string;
  href: string;
  isNew?: boolean;
  badge?: number;
  disabled?: boolean;
  external?: boolean;
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type MainNavItem = NavItem;

export type MarketingConfig = {
  mainNav: MainNavItem[];
};

export type SidebarNavItem = {
  title: string;
  items: NavItem[];
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type DocsConfig = {
  mainNav: MainNavItem[];
  sidebarNav: SidebarNavItem[];
};

// subcriptions
export type SubscriptionPlan = {
  planId: string;
  title: string;
  description: string;
  benefits: string[];
  limitations: string[];
  prices: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  ddPayIds: {
    monthly: string | null;
    yearly: string | null;
  }
};

// compare plans
export type ColumnType = string | boolean | null;
export type PlansRow = { feature: string; tooltip?: string } & {
  [key in (typeof plansColumns)[number]]: ColumnType;
};

// landing sections
export type InfoList = {
  icon: keyof typeof Icons;
  title: string;
  description: string;
};

export type InfoLdg = {
  title: string;
  image: string;
  description: string;
  list: InfoList[];
};

export type FeatureLdg = {
  title: string;
  description: string;
  link: string;
  icon: string;
};

export type TestimonialType = {
  name: string;
  job: string;
  image: string;
  review: string;
  link: string;
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
};


export type Dashboard = {
  repos: number;
  generated: number;
  published: number;
  triggers: number;
};

export type GitHubBranch = {
  name: string;
  protected: boolean;
};

export type DodoWebhookPayload = {
  cancelled_at: string
  created_at: string
  currency: string
  customer: Customer
  discount_id: string
  metadata: Metadata
  next_billing_date: string
  payment_frequency_count: number
  payment_frequency_interval: string
  product_id: string
  quantity: number
  recurring_pre_tax_amount: number
  status: string
  subscription_id: string
  subscription_period_count: number
  subscription_period_interval: string
  tax_inclusive: boolean
  trial_period_days: number
}

export type Customer = {
  customer_id: string
  email: string
  name: string
}

export type Metadata = {} 