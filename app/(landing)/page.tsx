import { HeroSection } from "@/components/landing-page/hero-section";
import { LeadSection } from "@/components/landing-page/lead-section";
import { SocialProofSection } from "@/components/landing-page/social-proof-section";
import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { DifferentiatorsSection } from "@/components/landing-page/differentiators-section";
import { HowItWorksSection } from "@/components/landing-page/how-it-works-section";
import { OfferSection } from "@/components/landing-page/offer-section";
import { AboutSection } from "@/components/landing-page/about-section";
import { CreatorArchetypesSection } from "@/components/landing-page/creator-archetypes-section";
import { FAQSection } from "@/components/landing-page/faq-section";
import { FinalCTASection } from "@/components/landing-page/final-cta-section";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <HeroSection />
      <LeadSection />
      <SocialProofSection />
      <BenefitsSection />
      <DifferentiatorsSection />
      <HowItWorksSection />
      <OfferSection />
      <AboutSection />
      <CreatorArchetypesSection />
      <FAQSection />
      <FinalCTASection />
    </main>
  );
}
