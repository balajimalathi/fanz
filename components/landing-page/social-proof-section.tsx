import { Section, Container } from "@/components/craft";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Setting up my page took less than 5 minutes. I had my first subscriber the same day I launched!",
    name: "Sarah K.",
    role: "Artist & Illustrator",
    avatar: "S",
  },
  {
    quote:
      "I switched from another platform and immediately noticed the difference. Keeping 90% means I can actually make a living doing what I love.",
    name: "Marcus T.",
    role: "Fitness Coach",
    avatar: "M",
  },
  {
    quote:
      "The direct messaging and video call features let me connect with my fans in ways I never could before. It's like having a VIP backstage pass for my supporters.",
    name: "Priya M.",
    role: "Musician",
    avatar: "P",
  },
];

export function SocialProofSection() {
  return (
    <Section className="py-16 md:py-24">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Loved by Creators Everywhere
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don&apos;t just take our word for it. Here&apos;s what creators are
            saying about Exclusivz.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/20 mb-4" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
