"use client";

import { useState } from "react";
import { Section, Container } from "@/components/craft";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { siteConfig } from "@/site.config";

const faqs = [
  {
    question: "How much does it cost to start?",
    answer:
      "Completely free! There are no upfront costs or monthly fees. We only take a 10% platform fee when you earn money. That means you keep 90% of everything you make.",
  },
  {
    question: "How do I get paid?",
    answer:
      "We process payouts weekly, directly to your bank account. Once you've earned money, you can request a payout and receive it within a few business days. We support multiple currencies for creators worldwide.",
  },
  {
    question: "What kind of content can I post?",
    answer:
      "You can post any creative content you own the rights to - photos, videos, text posts, audio, and more. We support general creative content including art, music, fitness, education, and other creative work.",
  },
  {
    question: "Can I set different subscription prices?",
    answer:
      "Yes! You can create multiple membership tiers with different prices and perks. For example, you might offer a basic tier for casual fans and a premium tier with exclusive perks like direct messaging or video calls.",
  },
  {
    question: "Do I need a large following to start?",
    answer:
      "Not at all! Many successful creators start with just a few hundred dedicated fans. The '1,000 true fans' principle applies - even a small but engaged audience can generate meaningful income when they're willing to pay for exclusive access.",
  },
  {
    question: "Is my content protected?",
    answer:
      "Yes. Only paying subscribers can access your exclusive content. We use secure technology to protect your work, and you maintain full ownership of everything you create. You can also set content as free, follower-only, or paid.",
  },
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  return (
    <Section id="faq" className="py-16 md:py-24 bg-muted/30">
      <Container className="max-w-3xl">
        <SectionHeader title="Got Questions? We've Got Answers" description={`Everything you need to know about getting started with ${siteConfig.site_name}.`} badgeColor="purple" badge="FAQ"/> 

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <Collapsible
              key={index}
              open={openItems.includes(index)}
              onOpenChange={() => toggleItem(index)}
            >
              <div className="rounded-lg border bg-background overflow-hidden">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors">
                  <span className="font-medium pr-4">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                      openItems.includes(index) && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </Container>
    </Section>
  );
}
