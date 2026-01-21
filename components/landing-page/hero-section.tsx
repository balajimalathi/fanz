"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, Container } from "@/components/craft";
import { Input } from "../ui/input";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { animate } from "animejs";

export function HeroSection() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const float1Ref = useRef<HTMLDivElement | null>(null);
  const float2Ref = useRef<HTMLDivElement | null>(null);
  const float3Ref = useRef<HTMLDivElement | null>(null);
  const float4Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!carouselRef.current || !trackRef.current) return;

    const animation = animate(trackRef.current, {
      translateX: ["0%", "-200%"],
      easing: "linear",
      duration: 1000,
      autoplay: false,
    });

    const handleScroll = () => {
      const carousel = carouselRef.current;
      if (!carousel || !trackRef.current) return;

      const rect = carousel.getBoundingClientRect();
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;

      // Progress from 0 (not visible) to 1 (fully scrolled past)
      const totalScroll = rect.height + windowHeight;
      const visible = Math.min(
        totalScroll,
        Math.max(0, windowHeight - rect.top)
      );
      let progress = visible / totalScroll;

      // Handle infinite loop: reset seamlessly when reaching the end
      if (progress >= 1) {
        progress = progress % 1;
        if (progress === 0) progress = 0.0001; // Avoid exact 0 to prevent reset flicker
      }

      animation.seek(animation.duration * progress);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Floating elements animation
  useEffect(() => {
    const floatElements = [
      { ref: float1Ref, delay: 0, fromX: -300 }, // Left side - comes from left
      { ref: float2Ref, delay: 200, fromX: -300 }, // Left side - comes from left
      { ref: float3Ref, delay: 400, fromX: 300 }, // Right side - comes from right
      { ref: float4Ref, delay: 600, fromX: 300 }, // Right side - comes from right
    ];

    floatElements.forEach(({ ref, delay, fromX }) => {
      if (!ref.current) return;

      // Set initial position off-screen
      ref.current.style.transform = `translateX(${fromX}px) scale(0)`;
      ref.current.style.opacity = "0";

      // Animate from outside screen to position with zap effect
      animate(ref.current, {
        translateX: [fromX, 0],
        scale: [0, 1.2, 1], // Overshoot for zap effect
        opacity: [0, 1],
        duration: 1200,
        delay: delay,
        easing: "easeOutElastic(1, 0.5)",
      });

      // Continuous floating animation with rotation
      setTimeout(() => {
        if (!ref.current) return;
        animate(ref.current, {
          translateY: [0, -20, 0],
          rotate: [0, 5, -5, 0],
          duration: 3000,
          easing: "easeInOutSine",
          loop: true,
        });
      }, delay + 1200);
    });
  }, []);

  return (
    <Section className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] -z-10 bg-primary/10 rounded-full blur-3xl opacity-30" />

      {/* Floating Elements */}
      {/* Left side floating elements */}
      <div
        ref={float1Ref}
        className="absolute hidden md:block left-10 top-32 md:left-20 md:top-40 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-purple-400/30 to-purple-600/30 backdrop-blur-md border border-purple-300/40 shadow-xl opacity-0 pointer-events-none z-0"
        style={{ transform: "translateX(-300px) scale(0)" }}
      />
      <div
        ref={float2Ref}
        className="absolute hidden md:block left-16 top-64 md:left-32 md:top-80 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-pink-400/30 to-pink-600/30 backdrop-blur-md border border-pink-300/40 shadow-xl opacity-0 pointer-events-none z-0"
        style={{ transform: "translateX(-300px) scale(0)" }}
      />

      {/* Right side floating elements */}
      <div
        ref={float3Ref}
        className="absolute hidden md:block right-10 top-40 md:right-20 md:top-52 w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-blue-400/30 to-blue-600/30 backdrop-blur-md border border-blue-300/40 shadow-xl opacity-0 pointer-events-none z-0"
        style={{ transform: "translateX(300px) scale(0)" }}
      />
      <div
        ref={float4Ref}
        className="absolute hidden md:block right-32 top-72 md:right-32 md:top-96 w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-cyan-400/30 to-cyan-600/30 backdrop-blur-md border border-cyan-300/40 shadow-xl opacity-0 pointer-events-none z-0"
        style={{ transform: "translateX(300px) scale(0)" }}
      />

      <Container className="flex flex-col items-center text-center">
        {/* Eyebrow */}
        <Badge
          variant="secondary"
          className="mt-4 px-4 py-2 text-sm font-medium gap-2"
        >
          <Badge variant="secondary" className="bg-accent text-accent-foreground">New</Badge>

          For creators who want more than likes
        </Badge>

        {/* Headline */}
        <h1 className="text-5xl md:text-5xl lg:text-6xl font-semibold tracking-tight max-w-4xl mt-4">
          Build a brand that is <br /> Owned by you.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl mt-4">
          The creator platform that puts you first. Build your community, share
          exclusive content, and earn on your terms.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Input type="text" placeholder="Pick a @yourname" className="rounded-full" />
          <Button asChild variant="default" size="default" className="text-base px-8 rounded-full">
            <Link href="#how-it-works">Claim your app</Link>
          </Button>
        </div>

        {/* Social proof placeholder */}
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary border-2 border-background"
              >
                <Image
                  src={`/assets/carousel/avatar-${i}.png`}
                  alt={`Carousel image ${i}`} height={32} width={32}
                  className="object-cover rounded-full"
                  sizes="32px"
                />
              </div>
            ))}
          </div>
          <span>
            Join <strong className="text-foreground">1,000+</strong> creators
            already earning on Exclusivz
          </span>
        </div>
      </Container>

      {/* Carousel */}
      <div
        ref={carouselRef}
        className="mt-16 w-screen relative left-1/2 right-1/2 -mx-[50vw] overflow-hidden"
      >
        <div
          ref={trackRef}
          className="flex"
        >
          {/* Duplicate images for seamless looping */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i, idx) => (
            <div
              key={`${i}-${idx}`}
              className="relative shrink-0 w-[50vw] md:w-[20vw] h-[200px] md:h-[340px] lg:h-[420px]"
            >
              <Image
                src={`/assets/carousel/avatar-${i}.png`}
                alt={`Carousel image ${i}`}
                fill
                className="object-cover rounded-3xl px-3 py-2"
                sizes="(max-width: 768px) 50vw, 20vw"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
