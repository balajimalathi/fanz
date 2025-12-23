"use client";

import { Container } from "@/components/craft";

export const VideoSection = () => {
  return (
    <section id="demo" className="py-20 md:py-32 bg-muted/30">
      <Container>
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">Demo</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
            See it in Action
          </h2>
          <p className="text-muted-foreground text-lg font-body max-w-2xl mx-auto">
            Watch how easily you can extract data from AI chats directly into your database.
          </p>
        </div>

        <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border bg-background aspect-video relative">
          <iframe 
            className="size-full" 
            src={process.env.NEXT_PUBLIC_DEMO_URL || "https://www.youtube.com/embed/QVlEv4mElzw?si=DhS6yBBaduGYUKdu"} 
            title="YouTube video player" 
            allow="autoplay; encrypted-media; picture-in-picture; web-share" 
            allowFullScreen
          />
        </div>
      </Container>
    </section>
  );
};
