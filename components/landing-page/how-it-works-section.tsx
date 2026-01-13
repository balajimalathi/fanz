import { Section, Container } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Settings, Share2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Page",
    time: "2 minutes",
    description:
      "Sign up with your email, add your bio and profile photo. Your creator page is ready to go.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Set Your Prices",
    time: "1 minute",
    description:
      "Choose your subscription tiers and set prices for exclusive content. You're in control.",
  },
  {
    number: "03",
    icon: Share2,
    title: "Share With Fans",
    time: "Ongoing",
    description:
      "Post content, go live, engage with your community, and watch your subscriber base grow.",
  },
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
      <Container>
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Get Started
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Start Earning in 3 Simple Steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No complicated setup. No approval process. Just sign up and start
            earning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line (desktop only) */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Step number with icon */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 relative z-10 bg-background">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <Badge variant="outline" className="mb-3">
                  {step.time}
                </Badge>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
