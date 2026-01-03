"use client";

import { Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnimatedSection, fadeInUp } from "./animations";

export const FinalCTA = () => {
  return (
    <section className="py-24 md:py-32 bg-muted/20">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection variant={fadeInUp}>
            <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">
              Ready to start your creator journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Join thousands of creators building their businesses on creatorx.
              Start today and keep more of what you earn.
            </p>
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
          </AnimatedSection>
        </div>
      </Container>
    </section>
  );
};

