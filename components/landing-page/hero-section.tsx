import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, Container } from "@/components/craft";
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const valueProps = [
  "Launch your page in under 5 minutes",
  "Keep 90% of every payment",
  "Subscriptions, tips, exclusive content - your way",
  "Direct messaging and live calls with fans",
  "Get paid weekly to your bank",
];

export function HeroSection() {
  return (
    <Section className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] -z-10 bg-primary/10 rounded-full blur-3xl opacity-30" />

      <Container className="flex flex-col items-center text-center">
        {/* Eyebrow */}
        <Badge
          variant="secondary"
          className="mb-6 px-4 py-2 text-sm font-medium gap-2"
        >
          <Sparkles className="h-4 w-4" />
          For creators who want more than likes
        </Badge>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mb-6">
          Turn Your Passion Into Income.{" "}
          <span className="text-primary">Connect Deeper With Your Fans.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
          The creator platform that puts you first. Build your community, share
          exclusive content, and earn on your terms.
        </p>

        {/* Value bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left max-w-2xl">
          {valueProps.map((prop, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm md:text-base text-muted-foreground">
                {prop}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button asChild size="lg" className="text-base px-8 gap-2">
            <Link href="/signup">
              Start Creating - It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8">
            <Link href="#how-it-works">See How It Works</Link>
          </Button>
        </div>

        {/* Friction remover */}
        <p className="text-sm text-muted-foreground">
          No fees until you earn. Cancel anytime.
        </p>

        {/* Social proof placeholder */}
        <div className="mt-12 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary border-2 border-background"
              />
            ))}
          </div>
          <span>
            Join <strong className="text-foreground">1,000+</strong> creators
            already earning on Exclusivz
          </span>
        </div>
      </Container>
    </Section>
  );
}
