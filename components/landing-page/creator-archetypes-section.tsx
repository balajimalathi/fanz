import { Section, Container } from "@/components/craft";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Dumbbell, Music, GraduationCap, Book, Video } from "lucide-react";
import { siteConfig } from "@/site.config";
import { SectionHeader } from "./section-header";

const archetypes = [
  {
    icon: Palette,
    title: "Artists & Illustrators",
    description:
      "Share exclusive art, behind-the-scenes process videos, tutorials, and early access to new work.",
    features: ["Digital goods", "Time-lapse videos", "Commission slots"],
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Dumbbell,
    title: "Fitness Coaches",
    description:
      "Offer workout plans, 1-on-1 video coaching sessions, live workout classes, and nutrition guides.",
    features: ["Video calls", "Custom plans", "Live classes"],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Music,
    title: "Musicians & Producers",
    description:
      "Release unreleased tracks, stems, sample packs, songwriting sessions, and exclusive performances.",
    features: ["Exclusive releases", "Behind-the-scenes", "Live sessions"],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: GraduationCap,
    title: "Educators & Coaches",
    description:
      "Build courses, host Q&A sessions, offer mentorship programs, and create educational content series.",
    features: ["Course content", "1-on-1 mentoring", "Community Q&A"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Book,
    title: "Writers & Bloggers",
    description:
      "Publish exclusive articles, ebooks, newsletters, and create content series.",
    features: ["Exclusive articles", "Ebooks", "Content series"],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Video,
    title: "Vloggers & Content Creators",
    description:
      "Create exclusive video content, behind-the-scenes footage, and create content series.",
    features: ["Exclusive videos", "Behind-the-scenes", "Content series"],
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
];

export function CreatorArchetypesSection() {
  return (
    <Section className="py-16 md:py-24">
      <Container>
        <SectionHeader title="Creators Like You Are Thriving" description={`From artists to educators, creators of all kinds are building sustainable businesses on ${siteConfig.site_name}.`} badgeColor="cyan" badge="Who We Help" />


        <div className="grid md:grid-cols-2 gap-6">
          {archetypes.map((archetype, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl ${archetype.bgColor} flex items-center justify-center`}
                  >
                    <archetype.icon className={`h-7 w-7 ${archetype.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">
                      {archetype.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {archetype.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {archetype.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
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
