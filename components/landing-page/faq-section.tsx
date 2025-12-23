"use client";

import { Container } from "@/components/craft";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { faqs } from "@/content/data/landing-page";

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-32 bg-muted/30">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-background border rounded-xl overflow-hidden"
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-semibold">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-muted-foreground font-body leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
