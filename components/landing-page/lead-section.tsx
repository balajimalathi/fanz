import { Section, Container } from "@/components/craft";
import { TrendingUp, Shield, Heart } from "lucide-react";

export function LeadSection() {
  return (
    <Section className="py-16 md:py-24 bg-muted/30">
      <Container>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* USP */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Creator-First Platform</h3>
            <p className="text-muted-foreground">
              The creator platform that actually puts creators first. 90%
              earnings, zero gatekeeping, complete creative freedom.
            </p>
          </div>

          {/* Pain Point */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 mb-4">
              <Shield className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Break Free From Algorithms</h3>
            <p className="text-muted-foreground">
              Tired of algorithms deciding your reach? Frustrated with platforms
              taking 50% of your hard work? There&apos;s a better way.
            </p>
          </div>

          {/* Solution */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
              <Heart className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Direct Fan Connection</h3>
            <p className="text-muted-foreground">
              Exclusivz gives you a direct line to your biggest fans - and lets
              you keep what you earn. No middlemen, no surprises.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
