import { Section, Container } from "@/components/craft";
import { Heart } from "lucide-react";

export function AboutSection() {
  return (
    <Section className="py-16 md:py-24 bg-muted/30">
      <Container className="max-w-4xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Heart className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Built By Creators, For Creators
          </h2>

          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>
              We started Exclusivz because we believe creators deserve better.
              Better payouts. Better tools. Better respect.
            </p>
            <p>
              We&apos;ve seen too many platforms take advantage of creators -
              changing algorithms overnight, taking massive cuts, and treating
              you like a product instead of a partner.
            </p>
            <p className="text-foreground font-medium">
              We&apos;re building the platform we wish existed - one that treats
              every creator like the business they are.
            </p>
          </div>

          <div className="mt-10 pt-10 border-t">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary">90%</div>
                <div className="text-sm text-muted-foreground">
                  Revenue to creators
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">
                  Creator support
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">Weekly</div>
                <div className="text-sm text-muted-foreground">
                  Payout schedule
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
