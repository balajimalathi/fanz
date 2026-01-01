"use client";

import { Container } from "@/components/craft";
import { AnimatedSection, StaggerContainer, fadeInUp } from "./animations";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const benefits = [
  "Regular, flexible payout schedules",
  "Advanced content protection tools",
  "Direct fan connections through messaging",
  "Multiple monetization options",
  "Geo-blocking for privacy and compliance",
  "Profile customization and verification",
  "Analytics to track your growth",
  "Dedicated creator support",
];

export const CreatorBenefits = () => {
  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
              Built for creators, by creators
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to build and grow your creator business
            </p>
          </AnimatedSection>

          {/* Benefits List */}
          <StaggerContainer>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="flex items-start gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-foreground">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </Container>
    </section>
  );
};

