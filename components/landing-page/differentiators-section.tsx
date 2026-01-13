import { Section, Container } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import {
  Percent,
  Zap,
  Layers,
  Radio,
  Globe,
  Clock,
  Palette,
  Check,
  X,
} from "lucide-react";

const differentiators = [
  {
    icon: Percent,
    title: "90% Revenue Share",
    description: "Industry-leading payout. Keep more of what you earn.",
  },
  {
    icon: Zap,
    title: "No Approval Process",
    description: "Start earning immediately. No gatekeeping, no waiting.",
  },
  {
    icon: Layers,
    title: "Multiple Revenue Streams",
    description: "Subscriptions, exclusive posts, tips, paid DMs, video calls.",
  },
  {
    icon: Radio,
    title: "Live Streaming Built-In",
    description: "Go live for free, followers-only, or paid streams.",
  },
  {
    icon: Globe,
    title: "Global Payments",
    description: "Accept payments worldwide in multiple currencies.",
  },
  {
    icon: Clock,
    title: "Weekly Payouts",
    description: "Get paid fast, direct to your bank account.",
  },
  {
    icon: Palette,
    title: "Your Brand, Your Rules",
    description: "Custom profile, your content, zero ads.",
  },
];

const comparisonData = [
  { feature: "Revenue Share", exclusivz: "90%", others: "50-80%" },
  { feature: "Approval Required", exclusivz: false, others: true },
  { feature: "Live Streaming", exclusivz: true, others: "Limited" },
  { feature: "Video Calls", exclusivz: true, others: false },
  { feature: "Weekly Payouts", exclusivz: true, others: false },
  { feature: "Multiple Currencies", exclusivz: true, others: "Limited" },
];

export function DifferentiatorsSection() {
  return (
    <Section className="py-16 md:py-24">
      <Container>
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Why Us
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Why Creators Choose Exclusivz
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built the platform we wish existed. Here&apos;s what makes us
            different.
          </p>
        </div>

        {/* Differentiators grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {differentiators.map((item, index) => (
            <div key={index} className="text-center p-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-center mb-6">
            See How We Compare
          </h3>
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-sm">
              <div>Feature</div>
              <div className="text-center text-primary">Exclusivz</div>
              <div className="text-center text-muted-foreground">Others</div>
            </div>
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-3 p-4 border-t text-sm items-center"
              >
                <div className="font-medium">{row.feature}</div>
                <div className="flex justify-center">
                  {typeof row.exclusivz === "boolean" ? (
                    row.exclusivz ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )
                  ) : (
                    <span className="font-semibold text-primary">
                      {row.exclusivz}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  {typeof row.others === "boolean" ? (
                    row.others ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )
                  ) : (
                    <span className="text-muted-foreground">{row.others}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
