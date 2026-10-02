"use client";

import React, { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Delay in milliseconds
  duration?: number; // Duration in milliseconds (default: 550ms)
  y?: number; // Vertical translation offset in px (default: 20px)
  scale?: number; // Initial scale (default: 1.0)
  threshold?: number; // Intersection threshold (default: 0.15)
  as?: React.ElementType;
  style?: React.CSSProperties;
}

/**
 * High-performance, zero-dependency Reveal primitive.
 * Triggered once by IntersectionObserver when the element enters ~15% of viewport.
 * Directly toggles `.revealed` on the DOM node to eliminate React re-renders and cascading updates.
 * Completely bypassed when `prefers-reduced-motion: reduce` is active.
 * Zero state updates on scroll.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  duration = 550,
  y = 20,
  scale = 1,
  threshold = 0.15,
  as: Component = "div",
  style = {},
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Check user's accessibility preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      node.classList.add("revealed");
      return;
    }

    // Observe element once with IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("revealed");
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const customStyle: React.CSSProperties = {
    ...style,
    ["--reveal-delay" as string]: `${delay}ms`,
    ["--reveal-duration" as string]: `${duration}ms`,
    ["--reveal-y" as string]: `${y}px`,
    ["--reveal-scale" as string]: scale,
  };

  return (
    <Component
      ref={ref}
      className={`reveal-item ${className}`}
      style={customStyle}
    >
      {children}
    </Component>
  );
}
