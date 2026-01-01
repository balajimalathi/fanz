"use client";

import { Container } from "@/components/craft";
import { AnimatedSection, fadeInUp } from "./animations";
import { motion } from "framer-motion";

export const MessagingPreview = () => {
  return (
    <section className="py-24 md:py-32 bg-muted/20">
      <Container>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Chat Interface Placeholder */}
            <AnimatedSection variant={fadeInUp}>
              <div className="relative w-full rounded-2xl overflow-hidden border bg-background aspect-[4/5] flex flex-col">
                {/* Chat Header */}
                <div className="border-b p-4 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20" />
                    <div>
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-3 w-16 bg-muted/50 rounded" />
                    </div>
                  </div>
                </div>
                {/* Chat Messages */}
                <div className="flex-1 p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 space-y-2 text-right">
                      <div className="h-4 w-2/3 bg-primary/20 rounded ml-auto" />
                      <div className="h-4 w-1/3 bg-primary/20 rounded ml-auto" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-muted rounded" />
                    </div>
                  </div>
                </div>
                {/* Chat Input */}
                <div className="border-t p-4 bg-muted/30">
                  <div className="h-10 bg-background border rounded-lg" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
                    Chat Interface Placeholder
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* Text Content */}
            <AnimatedSection>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">
                Connect directly with your fans
              </h2>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Build meaningful relationships through private messaging. Share
                exclusive content, answer questions, and create a personal
                connection with your most engaged fans.
              </p>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>One-on-one private conversations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Send media and exclusive content in messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Set custom pricing for premium messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>Manage conversations with ease</span>
                </li>
              </ul>
            </AnimatedSection>
          </div>
        </div>
      </Container>
    </section>
  );
};

