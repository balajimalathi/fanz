import Link from "next/link";
import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const benefits = [
  "Keep 90% of everything you earn",
  "Launch your page in minutes",
  "Multiple ways to monetize",
  "Weekly payouts to your bank",
  "Zero upfront costs",
];

export function FinalCTASection() {
  return (
    <Section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] -z-10 bg-primary/20 rounded-full blur-3xl opacity-30" />

      <Container className="max-w-4xl">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Ready to Turn Fans Into Income?
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of creators who are building sustainable businesses
            on their own terms.
          </p>

          {/* Benefits list */}
          {/* <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm md:text-base">{benefit}</span>
              </div>
            ))}
          </div> */}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button asChild className="text-lg px-10 py-6 gap-2 rounded-full">
              <Link href="/signup">
                Start Creating Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Friction remover */}
          <p className="text-sm text-muted-foreground">
            Join thousands of creators. Free forever to start.
          </p>

          {/* Trust indicators */}
          <div className="mt-10 pt-10 border-t flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Setup in under 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
