import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./section-header";
import Image from "next/image";
import { MoreVertical, Share2, Lock, Eye } from "lucide-react";


{/* <Section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
<Container>
  <SectionHeader title="Start Earning in 3 Simple Steps" badge="Get Started" badgeColor="cyan" />

   <></>
</Container>
</Section> */}
export function HowItWorksSection() {
  return (
    <Section id="how-it-works" className="py-16 md:py-24 bg-muted">
      <SectionHeader title="Start Earning in 3 Simple Steps" badge="Get Started" description="No complicated setup. No approval process. Just sign up and start earning." badgeColor="cyan" />

      <Container>
        <div className="space-y-4">
          {/* Row 1: Step 1 and Step 2 side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 - Purple */}
            <div className="relative overflow-hidden rounded-2xl bg-purple-500/80 p-6 md:p-8 min-h-[400px] flex flex-col">
              <div className="mb-6">
                <span className="inline-block bg-white text-purple-600 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  Step 1
                </span>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  Sign up & manage your profile information
                </h3>
                <p className="text-white/90 text-base leading-relaxed">
                  Update your profile picture, public name, social accounts, bio description that will be helpful for your audience to recognise you.
                </p>
              </div>
 
              {/* Image Container */}
              <div className="relative w-full h-[300px] md:h-[350px] rounded-xl overflow-hidden">
                <Image
                  src="/assets/carousel/1.jpg"
                  alt="Share, monitor & plan"
                  fill
                  className="object-cover rounded-xl"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* Step 2 - Yellow */}
            <div className="relative overflow-hidden rounded-2xl bg-yellow-400/80 p-6 md:p-8 min-h-[400px] flex flex-col">
              <div className="mb-6">
                <span className="inline-block bg-white text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  Step 2
                </span>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                  Manage links & customise your profile
                </h3>
                <p className="text-gray-700 text-base leading-relaxed">
                  Start adding all the links that you want your audience to view. Take control & customise the style as per your needs.
                </p>
              </div>
              {/* Image Container */}
              <div className="relative w-full h-[300px] md:h-[350px] rounded-xl overflow-hidden">
                <Image
                  src="/assets/carousel/1.jpg"
                  alt="Share, monitor & plan"
                  fill
                  className="object-cover rounded-xl"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Step 3 - Full width, Light Green */}
          <div className="relative overflow-hidden rounded-2xl bg-green-400/80 p-6 md:p-12 min-h-[400px] flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <span className="inline-block bg-white text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                Step 3
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                Share, monitor & plan
              </h3>
              <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-6 max-w-2xl">
                Update the link in your social media profiles & dive into comprehensive statistics data related to your profile. Monitor link clicks, track engagement trends, and gain valuable insights to plan.
              </p>
              <Button className="bg-black text-white hover:bg-black/90 px-8 py-6 text-base font-medium rounded-full">
                Get Start for free
              </Button>
            </div>

            {/* Image Container */}
            <div className="flex-1 relative w-full h-[300px] md:h-[350px] rounded-xl overflow-hidden">
              <Image
                src="/assets/carousel/1.jpg"
                alt="Share, monitor & plan"
                fill
                className="object-cover rounded-xl"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
