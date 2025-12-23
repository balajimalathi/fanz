import { Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 md:py-32">
      <Container>
        <div className="relative bg-primary rounded-3xl p-12 md:p-20 text-center overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-primary-foreground font-heading">
              Ready to Stop Copy-Pasting?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto font-body">
              Start the trial. You will love it.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" variant="secondary" className="cursor-pointer rounded-full px-8 text-base gap-2 group" onClick={() => window.open("https://insigh.to/b/chat2base", "_blank")}>
                🚀 Start exporting today
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="default" className="cursor-pointer border border-muted-foreground rounded-full px-8 text-base gap-2 group" onClick={() => window.open("https://insigh.to/b/chat2base", "_blank")}>
                💬 You have suggestions?
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/70">
              <span>3 day free trail</span>
              <span>•</span>
              <span>Works instantly</span>
              <span>•</span>
              <span>Privacy guaranteed</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
