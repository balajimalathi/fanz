"use client";

// Components
import { HeroSection } from "@/components/landing-page/hero-section";
import { ProblemSection } from "@/components/landing-page/problem-section";
import { SolutionSection } from "@/components/landing-page/solution-section";
import { VideoSection } from "@/components/landing-page/video-section";
import { FeaturesSection } from "@/components/landing-page/features-section";
import { UseCasesSection } from "@/components/landing-page/use-cases-section";
import { PricingSection } from "@/components/landing-page/pricing-section";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import { FAQSection } from "@/components/landing-page/faq-section";
import { CTASection } from "@/components/landing-page/cta-section";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <VideoSection />
      <FeaturesSection />
      <UseCasesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}
