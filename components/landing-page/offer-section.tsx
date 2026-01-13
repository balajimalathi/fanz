import Link from "next/link";
import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Crown,
  Lock,
  MessageSquare,
  Video,
  Radio,
  Check,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: ImageIcon,
    title: "Unlimited Posts",
    description: "Photos, videos, and text - share as much as you want.",
  },
  {
    icon: Crown,
    title: "Subscription Tiers",
    description: "Create multiple membership levels with different perks.",
  },
  {
    icon: Lock,
    title: "Pay-Per-View Content",
    description: "Offer exclusive content that fans can unlock individually.",
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description: "Connect 1-on-1 with your biggest supporters.",
  },
  {
    icon: Video,
    title: "Audio & Video Calls",
    description: "Offer personal calls as a premium service.",
  },
  {
    icon: Radio,
    title: "Live Streaming",
    description: "Go live for free, followers-only, or paid streams.",
  },
];

export function OfferSection() {
  return (
    <Section id="pricing" className="py-16 md:py-24">
      <Container>
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            What&apos;s Included
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything You Need to Monetize Your Craft
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All the tools you need to build, grow, and earn from your creator
            business.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CardTitle className="text-2xl">Creator Account</CardTitle>
              <Badge className="bg-primary">Free to Start</Badge>
            </div>
            <p className="text-muted-foreground">
              Everything included. No hidden fees. You only pay when you earn.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing highlight */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-lg mb-1">
                    Simple, Creator-Friendly Pricing
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We only take 10% when you earn. You keep the rest.
                  </p>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-3xl font-bold text-primary">90%</div>
                  <div className="text-sm text-muted-foreground">
                    goes to you
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits list */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {[
                "No monthly fees",
                "Unlimited subscribers",
                "Weekly payouts",
                "24/7 support",
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button asChild size="lg" className="text-base px-8 gap-2">
                <Link href="/signup">
                  Start Creating - It&apos;s Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Free to join. You only pay when you earn.
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
