import { Section, Container } from "@/components/craft";
import { SectionHeader } from "./section-header";
import { FeaturePreviewWidget, type FeatureWidgetType } from "./feature-preview-widgets";

const gridItems: {
  title: string;
  description: string;
  cols: string;
  row: number;
  widgetType: FeatureWidgetType;
}[] = [
  // Row 1: 3 + 4 = 7 columns
  { title: "Audio & Video Calls", description: "Connect in real time through high-quality audio and video calls. Whether for fan requests or private shows, give your audience direct, intimate access on your terms.", cols: "md:col-span-3", row: 1, widgetType: "av-calls" },
  { title: "Interactive Live Streaming", description: "Broadcast yourself to the world with real-time tipping, reactions, and engagement tools. Go live, build loyal audiences, and earn as you entertain.", cols: "md:col-span-4", row: 1, widgetType: "livestream" },

  // Row 2: 4 + 3 = 7 columns
  { title: "Custom Fan Requests", description: "Offer personalized content—videos, images, shoutouts—based on fan-submitted ideas. Set your pricing, accept or reject requests, and make it personal.", cols: "md:col-span-4", row: 2, widgetType: "custom-requests" },
  { title: "Exclusive Memberships", description: "Launch flexible subscription tiers and give loyal fans VIP access. Deliver premium content, early drops, and insider perks effortlessly.", cols: "md:col-span-3", row: 2, widgetType: "memberships" },

  // Row 3: 3 + 4 = 7 columns
  { title: "Private Chat Messaging", description: "Build relationships with fans through one-on-one chat. Share teasers, send paywalled content, or simply keep your most loyal buyers engaged.", cols: "md:col-span-3", row: 3, widgetType: "chat" },
  { title: "Pay-Per-View Content", description: "Monetize individual pieces of content with locked paywalls. Whether it's a hot video or behind-the-scenes moment, earn with every unlock.", cols: "md:col-span-4", row: 3, widgetType: "ppv" },
];

export function BentoGrid() {
  // Group items by row for proper layout
  const rows = [
    // Row 1: 3 + 2 + 2 = 7 columns
    gridItems.filter(item => item.row === 1),
    // Row 2: 4 + 2 + 1 = 7 columns (but we'll do 4 + 3)
    gridItems.filter(item => item.row === 2),
    // Row 3: 3 + 2 + 2 = 7 columns
    gridItems.filter(item => item.row === 3),
  ];

  return (
    <Section className="py-16 md:py-24 bg-muted/30">
      <Container>
        <SectionHeader title="Everything you need to build a brand that is owned by you." badge="Platform Features" badgeColor="cyan" description="We understand the struggle of building a brand that is owned by you. That's why we've created a platform that gives you the tools you need to build a brand that is owned by you." />

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4">
          {rows.flatMap((row, rowIndex) =>
            row.slice(0, 2).map((item, index) => (
              <div
                key={`row${rowIndex + 1}-${index}`}
                className={`col-span-1 ${item.cols} group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg min-h-[240px] md:min-h-[280px]`}
              >
                <div className="relative h-full flex flex-col p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">{item.title}</h2>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground/60 leading-relaxed pb-2">{item.description}</p>
                  <div className="relative w-full h-32 md:h-40 mt-auto rounded-lg overflow-hidden bg-muted group-hover:scale-[1.02] transition-transform duration-300">
                    <FeaturePreviewWidget widgetType={item.widgetType} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </Container>
    </Section>
  );
}
