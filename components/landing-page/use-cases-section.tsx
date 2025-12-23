import { Container } from "@/components/craft";
import { Check } from "lucide-react";
import { useCases } from "@/content/data/landing-page";

export const UseCasesSection = () => {
  return (
    <section id="use-cases" className="py-20 md:py-32">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">Use Cases</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            Real Use Cases, Real Time Saved
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase, i) => (
            <div
              key={i}
              className="bg-background border rounded-2xl p-8 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <useCase.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{useCase.title}</h3>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-3 rounded-lg">
                  {useCase.prompt}
                </p>
                <p className="text-sm font-body">→ {useCase.result}</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                Time saved: {useCase.timeSaved}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
