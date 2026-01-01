"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Animation variants for Notion-like smooth animations
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const transition = {
  duration: 0.6,
  ease: [0.6, -0.05, 0.01, 0.99],
};

// Hook for scroll-triggered animations
export function useScrollAnimation() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return { ref, isInView };
}

// Animated section wrapper
export function AnimatedSection({
  children,
  className,
  variant = fadeInUp,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: typeof fadeInUp | typeof fadeIn | typeof scaleIn;
}) {
  const { ref, isInView } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variant}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children wrapper
export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, isInView } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

