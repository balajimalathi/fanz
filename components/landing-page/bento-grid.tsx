import { Section, Container } from "@/components/craft";
import { TrendingUp, Shield, Heart, Sparkles, Zap, Users, Lock, Star, ArrowRight } from "lucide-react";
import { SectionHeader } from "./section-header";
import Image from "next/image";

const gridItems = [
  // Row 1: 3 + 4 = 7 columns
  { title: "Advanced Analytics Dashboard", description: "Monitor your growth with comprehensive real-time insights, track subscriber engagement, revenue trends, and content performance all in one powerful dashboard.", image: "/assets/carousel/1.jpg", cols: "md:col-span-3", row: 1 },
  { title: "Enterprise-Grade Secure Payments", description: "Rest easy with bank-level encryption and PCI-DSS compliant payment processing. Accept subscriptions, one-time payments, and tips with seamless integrations to multiple payment gateways worldwide.", image: "/assets/carousel/2.jpg", cols: "md:col-span-4", row: 1 },
  // Row 2: 4 + 3 = 7 columns
  { title: "Dynamic Community Building Tools", description: "Foster deeper connections with interactive features like member forums, live chat rooms, exclusive events, and personalized messaging. Create a thriving community that champions your brand and keeps members engaged.", image: "/assets/carousel/3.jpg", cols: "md:col-span-4", row: 2 },
  { title: "Intelligent Content Management System", description: "Streamline your workflow with smart scheduling, automated content delivery, rich media organization, and easy-to-use templates. Focus on creating while we handle the technical details behind the scenes.", image: "/assets/carousel/4.jpg", cols: "md:col-span-3", row: 2 },
];

export function BentoGrid() {
  // Group items by row for proper layout
  const rows = [
    // Row 1: 3 + 2 + 2 = 7 columns
    gridItems.filter(item => item.row === 1),
    // Row 2: 4 + 2 + 1 = 7 columns (but we'll do 4 + 3)
    gridItems.filter(item => item.row === 2),
  ];

  return (
    <Section className="py-16 md:py-24 bg-muted/30">
      <Container>
        <SectionHeader title="Everything you need to build a brand that is owned by you." badge="Platform Features" badgeColor="cyan" description="We understand the struggle of building a brand that is owned by you. That's why we've created a platform that gives you the tools you need to build a brand that is owned by you." />

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4">
          {rows[0].slice(0, 2).map((item, index) => {
            return (
              <div
                key={`row1-${index}`}
                className={`col-span-1 ${item.cols} group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg min-h-[240px] md:min-h-[280px]`}
              >
                <div className="relative h-full flex flex-col p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground">{item.title}</h2>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground/60 leading-relaxed">{item.description}</p>
                  <div className="relative w-full h-32 md:h-40 mt-auto rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {rows[1].slice(0, 2).map((item, index) => {
            return (
              <div
                key={`row2-${index}`}
                className={`col-span-1 ${item.cols} group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg min-h-[240px] md:min-h-[280px]`}
              >
                <div className="relative h-full flex flex-col p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground">{item.title}</h2>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground/60 leading-relaxed">{item.description}</p>
                  <div className="relative w-full h-32 md:h-40 mt-auto rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
