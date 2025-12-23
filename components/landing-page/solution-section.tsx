import { Container } from "@/components/craft";
import { ArrowRight } from "lucide-react";
import { steps } from "@/content/data/landing-page";

export const SolutionSection = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">The Solution</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            3 Steps. 10 Seconds. Zero Setup.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, i) => (
            <div key={i} className="relative">
              <div className="bg-background border rounded-2xl p-8 h-full hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3 ">{item.title}</h3>
                <p className="text-muted-foreground font-body">{item.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-xl text-muted-foreground font-body">
            Result: Your data is live. <span className="font-semibold text-foreground">No copy-paste.</span>
          </p>
        </div>
      </Container>
    </section>
  );
};
