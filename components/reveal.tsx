"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

const FROM_VARS: Record<RevealVariant, gsap.TweenVars> = {
  up: { opacity: 0, y: 48 },
  left: { opacity: 0, x: -48 },
  right: { opacity: 0, x: 48 },
  scale: { opacity: 0, scale: 0.92 },
  fade: { opacity: 0 },
};

export function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(stagger ? el.children : el, FROM_VARS[variant], {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration: 0.8,
        delay,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [variant, delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
