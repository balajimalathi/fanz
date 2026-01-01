"use client";

// Components
import { HeroSection } from "@/components/landing-page/hero-section";
import { FeaturesShowcase } from "@/components/landing-page/features-showcase";
import { ContentPreview } from "@/components/landing-page/content-preview";
import { MessagingPreview } from "@/components/landing-page/messaging-preview";
import { CreatorBenefits } from "@/components/landing-page/creator-benefits";
import { FinalCTA } from "@/components/landing-page/final-cta";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <HeroSection />
      <FeaturesShowcase />
      <ContentPreview />
      <MessagingPreview />
      <CreatorBenefits />
      <FinalCTA />
    </main>
  );
}
