"use client";

import { Container } from "@/components/craft";
import { AnimatedSection, fadeInUp } from "./animations";
import { motion } from "framer-motion";

export const ContentPreview = () => {
  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <AnimatedSection>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">
                Share your content your way
              </h2>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Upload photos and videos with ease. Organize your content into
                collections, set pricing, and control who sees what. Your
                content, your rules.
              </p>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Public teasers to attract new subscribers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Exclusive content for subscribers only</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Pay-per-view content for premium offerings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Organize content into custom collections</span>
                </li>
              </ul>
            </AnimatedSection>

            {/* Image/Video Placeholder */}
            <AnimatedSection variant={fadeInUp}>
              <div className="relative w-full rounded-2xl overflow-hidden border bg-muted/30 aspect-[4/3] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                <p className="text-muted-foreground text-lg z-10">
                  Content Preview Image
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </Container>
    </section>
  );
};

