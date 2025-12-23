import { Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Check, Zap } from "lucide-react";
import ImagesReveal from "../animata/images-reveal";
import Link from "next/link";

export const HeroSection = () => {
  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-32 md:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[128px] opacity-50" />

      <Container>
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span>Now available on Chrome</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 font-heading">
            From AI Assistants <ImagesReveal /> <br />
            <span className="text-primary bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              to Live Database Records<ImagesReveal type="integration" />
            </span>{" "}<br />
            in One Click
          </h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body leading-relaxed">
            Extract structured data from AI Assistant → Push to Airtable, Google Sheets,
            Notion, Monday.com & more. No copy-paste. No setup. Just results.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="rounded-full px-8 text-base gap-2 group" asChild>
              <Link href="/#pricing">
                Start your free trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base gap-2" asChild>
              <Link href="/#demo">
                <Play className="w-4 h-4" />
                Watch Demo (2 min)
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Value Props */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Unlimited exports/month
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Privacy-first (client-side only)
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Minimum Setup
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              {`2 Integrations & more on the way`}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
