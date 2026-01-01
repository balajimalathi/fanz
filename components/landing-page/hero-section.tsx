"use client";

import { Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnimatedSection, fadeIn } from "./animations";
import { motion } from "framer-motion";

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 min-h-[90vh] flex items-center">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <AnimatedSection variant={fadeIn} className="mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-6 leading-tight">
              The platform for{" "}
              <span className="text-primary">Creators</span>
              <br />
              and global audiences
            </h1>
          </AnimatedSection>

          {/* Subheading */}
          <AnimatedSection className="mb-12">
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Monetize your content, connect with fans, and build your creator
              business on a platform designed for you.
            </p>
          </AnimatedSection>

          {/* CTA Buttons */}
          <AnimatedSection className="mb-16">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-lg px-8 py-6 text-base h-auto font-medium"
                asChild
              >
                <Link href="/signup">
                  Start Creating
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-lg px-8 py-6 text-base h-auto font-medium"
                asChild
              >
                <Link href="/home">
                  Explore Creators
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </AnimatedSection>

          {/* Hero Video/Image Placeholder */}
          <AnimatedSection variant={fadeIn} className="mt-20">
            <div className="relative w-full rounded-2xl overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
              <p className="text-muted-foreground text-lg z-10">
                Hero Video Placeholder
              </p>
            </div>
          </AnimatedSection>
        </div>
      </Container>
    </section>
  );
};
