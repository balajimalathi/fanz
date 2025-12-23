import { Container } from "@/components/craft";
import { Star } from "lucide-react";
import { testimonials } from "@/content/data/landing-page";

export const TestimonialsSection = () => {
  return (
    <section className="py-20 md:py-32">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">Testimonials</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            What Users Are Saying
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="bg-background border rounded-2xl p-8"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground font-body leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
