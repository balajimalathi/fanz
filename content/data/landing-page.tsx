import {
  Zap,
  Link2,
  Target,
  Shield,
  DollarSign,
  Palette,
  TableProperties,
  ListTodo,
  Users,
  BarChart3,
  FileText,
  Briefcase,
  Rocket,
} from "lucide-react";

export const whatPeopleCreate = [
  "Content calendars",
  "Task lists & timelines",
  "Lead & research tables",
  "Competitor pricing tables",
  "Meeting notes & actions",
];

export const painPoints = [
  "Manual copy-paste",
  "Broken formatting",
  "Lost or missed data",
  "Hours wasted on cleanup",
  "Automation tools too heavy",
];

export const whatChatbaseProvides = [
  "Auto-detects tables & lists",
  "Clean structured extraction",
  "Quick field mapping",
  "One-click push to tools",
  "Lightweight browser plugin",
];


export const steps = [
  {
    step: "1",
    title: "AI Chat generates data",
    description: '"Create content calendar table with dates and topics"',
    icon: TableProperties,
  },
  {
    step: "2",
    title: "Extension detects & maps",
    description: "Map AI columns to your database columns",
    icon: Link2,
  },
  {
    step: "3",
    title: "One click → Done",
    description: "20 live Airtable records created in 10 seconds",
    icon: Zap,
  },
];

export const features = [
  {
    icon: Zap,
    title: "Speed",
    description: "Copy-paste: 15-20 min. Falustic: 10 seconds. Save 2-3 hours per week.",
  },
  {
    icon: Link2,
    title: "Universal",
    description: "Airtable, Google Sheets, + more coming. (Notion, Monday.com, Asana, CSV, .etc)",
  },
  {
    icon: Target,
    title: "Zero Setup",
    description: "Install extension → Connect OAuth → Done. No API keys or webhooks.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "100% client-side processing. We never see or store your conversations.",
  },
  {
    icon: DollarSign,
    title: "Affordable",
    description: "Starter: $2.99/mo unlimited. 10x cheaper than Zapier.",
  },
  {
    icon: Palette,
    title: "Visual Mapping",
    description: "Interface to map columns. Save templates for reuse.",
  },
];
export const useCases = [
  {
    icon: FileText,
    title: "Content Teams",
    prompt: '"Generate 3-month content calendar"',
    result: "50-row table → Airtable in seconds",
    timeSaved: "30 min/quarter",
  },
  {
    icon: Briefcase,
    title: "Sales Ops",
    prompt: '"Extract 100 B2B companies in my target market"',
    result: "Lead list → CRM instantly",
    timeSaved: "2 hours/day",
  },
  {
    icon: BarChart3,
    title: "Researchers",
    prompt: '"Compile competitor feature comparison"',
    result: "Analysis table → Google Sheets",
    timeSaved: "3 hours/analysis",
  },
  {
    icon: ListTodo,
    title: "Project Managers",
    prompt: '"Break project into milestones"',
    result: "Tasks → Monday.com with dates",
    timeSaved: "1 hour/project",
  },
  {
    icon: Users,
    title: "Freelancers",
    prompt: '"Generate client deliverables"',
    result: "SOW data → Notion database",
    timeSaved: "2-3 hours/client",
  },
  {
    icon: Rocket,
    title: "Founders & Indie Hackers",
    prompt: '"List SaaS ideas with target users, problems, and pricing"',
    result: "Idea table → Notion or Sheets backlog",
    timeSaved: "1-2 hours/brainstorm",
  },
];

export const plans = [
  {
    name: "Starter",
    price: "$2.99",
    period: "/month",
    description: "For individuals using one browser",
    features: [
      "License for 1 browser (Chrome, Firefox or Brave)",
      "Unlimited exports",
      "All integrations (Airtable, Google Sheets, Notion, etc.)",
      "Privacy-first, client-side processing",
      "Basic email support",
    ],
    cta: "Get Starter",
    popular: false,
  },
  {
    name: "Professional",
    price: "$4.99",
    period: "/month",
    description: "For power users across multiple browsers",
    features: [
      "License for up to 4 browsers (Chrome, Firefox, Brave, Edge)",
      "Unlimited exports",
      "All current and future integrations",
      "Priority support",
    ],
    cta: "Upgrade to Professional",
    popular: false,
    // badge: "Most Popular",
  },
  {
    name: "Lifetime",
    price: "$25",
    period: "one-time",
    description: "Best value for early supporters",
    features: [
      "License for up to 4 browsers",
      "All Professional features forever",
      "Lifetime updates and new integrations",
      "No recurring fees, ever",
      "Priority support",
    ],
    cta: "Get Lifetime Access",
    popular: true,
    badge: "Early Supporter",
  },
];

export const testimonials = [
  {
    quote: "Saved me 10 hours this week alone. I generate 3 content calendars per week. This extension cut my manual work from 45min to 5min per calendar.",
    author: "@ContentMaven",
    role: "Content Manager",
    rating: 5,
  },
  {
    quote: "Finally, Grok and Airtable talk. No more copy-paste errors. Tables flow directly from Grok to my Airtable. This is exactly what I needed.",
    author: "@DataJunkie",
    role: "Freelance Data Analyst",
    rating: 5,
  },
  {
    quote: "Game-changer for our sales team. We extract 200+ leads per month from Perplexity research. Used to take 4 hours manually. Now it's instant.",
    author: "@OpsMaven",
    role: "Sales Operations Lead",
    rating: 5,
  },
];

export const faqs = [
  {
    question: "Do you store my AI Assistant conversations?",
    answer: "No. We process data client-side only. Your conversations never touch our servers. They're deleted from memory after extraction.",
  },
  {
    question: "How is this different from Zapier/Make?",
    answer: "Zapier takes 15+ minutes to set up per workflow. We work in seconds with visual mapping. Plus Zapier charges $20+/mo. We're $2.99 with a starter or $25 for one time purchase.",
  },
  {
    question: "Does this work with other AI tools?",
    answer: "Yes! Works with any AI chat that displays tables/lists in the browser, now supports Grok, Perplexity, Claude, Chatgpt, Gemini and Deepseek. Roadmap includes Microsoft Co-pilot, Mistral, and more.",
  },
  {
    question: "Can I map custom fields?",
    answer: "Absolutely. Intuitive interface lets you map any AI column to any database field.",
  },
  {
    question: "Is my Airtable/Notion API key safe?",
    answer: "Yes. Tokens are encrypted locally in your browser. We never see or store them.",
  },
  {
    question: "Do you have refunds?",
    answer: "30-day money-back guarantee on Pro subscriptions. No questions asked.",
  },
];
