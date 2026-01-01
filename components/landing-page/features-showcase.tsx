"use client";

import { Container } from "@/components/craft";
import { AnimatedSection, StaggerContainer, fadeInUp } from "./animations";
import { motion } from "framer-motion";
import {
  DollarSign,
  Upload,
  MessageSquare,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Creator Payouts",
    description:
      "Get paid regularly with flexible payout schedules. Keep more of what you earn with transparent, creator-friendly rates.",
  },
  {
    icon: Upload,
    title: "Content Sharing",
    description:
      "Share photos, videos, and exclusive content with your subscribers. Set content as public, subscriber-only, or pay-per-view.",
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description:
      "Connect one-on-one with your fans through private messaging. Build deeper relationships and offer personalized content.",
  },
  {
    icon: Shield,
    title: "Content Protection",
    description:
      "Advanced tools to protect your content including watermarks, download restrictions, and anti-piracy monitoring.",
  },
];

export const FeaturesShowcase = () => {
  return (
    <section className="py-24 md:py-32 bg-muted/20">
      <Container>
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete platform built for creators who want to focus on what
              they do best—creating.
            </p>
          </AnimatedSection>

          {/* Features Grid */}
          <StaggerContainer>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group"
                >
                  <div className="h-full p-8 rounded-xl border bg-background hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-6 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </Container>
    </section>
  );
};

