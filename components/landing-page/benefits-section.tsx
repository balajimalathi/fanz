import { Section, Container } from "@/components/craft";
import {
  Bell,
  Users,
  Lock,
  MessageCircle,
  Wallet,
} from "lucide-react";

const benefits = [
  {
    icon: Bell,
    title: "Wake up to new subscribers",
    description:
      "Start your day with notifications of fans who've joined your community overnight.",
  },
  {
    icon: Users,
    title: "Build a paying community",
    description:
      "Create a community of supporters who pay to access your exclusive content and connect with you.",
  },
  {
    icon: Lock,
    title: "Exclusive content, only for fans",
    description:
      "Offer content your fans can't get anywhere else - behind-the-scenes, early access, premium work.",
  },
  {
    icon: MessageCircle,
    title: "Get closer to your audience",
    description:
      "Direct messages, audio calls, video calls, and live streams bring you closer to your biggest supporters.",
  },
  {
    icon: Wallet,
    title: "Predictable monthly income",
    description:
      "Subscriptions mean recurring revenue. Know what's coming in and plan your creative work accordingly.",
  },
];

export function BenefitsSection() {
  return (
    <Section id="features" className="py-16 md:py-24 bg-muted/30">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What You&apos;ll Actually Get
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real benefits that help you build a sustainable creative business.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex flex-col p-6 rounded-2xl bg-background border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <benefit.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
