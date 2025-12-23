import { Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { plans } from "@/content/data/landing-page";
import React from "react";

export const PricingSection = () => {

  const [loading, setLoading] = React.useState<string | null>(null);

  const handleCheckout = async (planName: string) => {
    try {
      setLoading(planName);
      const res = await fetch('/api/payment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">Pricing</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg font-body">
            Even at max savings, you make back the monthly cost in one day of freed-up time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={cn(
                "relative bg-background border rounded-2xl p-8",
                plan.popular && "border-primary shadow-lg scale-105"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-600 text-background text-sm font-medium rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2 font-heading">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="font-body">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "w-full rounded-lg",
                  plan.popular ? "" : "variant-outline"
                )}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleCheckout(plan.name)}
                disabled={loading === plan.name}
              >
                {loading === plan.name ? "Processing..." : plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
