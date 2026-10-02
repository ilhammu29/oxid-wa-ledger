"use client";

import { useState, useEffect, useRef } from "react";

export interface HeroScrollState {
  progress: number;
  isMobile: boolean;
  reducedMotion: boolean;
}

/**
 * High-performance, zero-dependency scroll progress hook.
 * Calculates normalized progress (0.00 to 1.00) through a scroll stage.
 * Uses requestAnimationFrame to prevent layout thrashing and maintain 60/120fps.
 */
export function useHeroScroll(stageRef: React.RefObject<HTMLDivElement | null>): HeroScrollState {
  const [state, setState] = useState<HeroScrollState>({
    progress: 0,
    isMobile: false,
    reducedMotion: false,
  });

  const rafId = useRef<number | null>(null);
  const lastState = useRef<HeroScrollState>({
    progress: -1,
    isMobile: false,
    reducedMotion: false,
  });

  useEffect(() => {
    // Check reduced motion media query
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      lastState.current = { ...lastState.current, reducedMotion };
      setState((prev) => ({ ...prev, reducedMotion: e.matches }));
    };
    motionQuery.addEventListener("change", handleMotionChange);

    const updateScroll = () => {
      const stage = stageRef.current;
      const isMobile = window.innerWidth < 768;

      if (!stage || isMobile || reducedMotion) {
        if (
          lastState.current.progress !== 1 ||
          lastState.current.isMobile !== isMobile ||
          lastState.current.reducedMotion !== reducedMotion
        ) {
          lastState.current = { progress: 1, isMobile, reducedMotion };
          setState({
            progress: 1,
            isMobile,
            reducedMotion,
          });
        }
        return;
      }

      const rect = stage.getBoundingClientRect();
      const stageTop = rect.top;
      const stageHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // When stageTop is 0, progress starts at 0.
      // When stageTop is -(stageHeight - viewportHeight), progress reaches 1.0.
      const scrollableDistance = stageHeight - viewportHeight;
      if (scrollableDistance <= 0) {
        lastState.current = { progress: 1, isMobile, reducedMotion };
        setState({ progress: 1, isMobile, reducedMotion });
        return;
      }

      const currentScroll = -stageTop;
      const rawProgress = currentScroll / scrollableDistance;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));

      // Only trigger state update if changed significantly (0.004 threshold)
      if (Math.abs(clampedProgress - lastState.current.progress) > 0.004) {
        lastState.current = { progress: clampedProgress, isMobile, reducedMotion };
        setState({
          progress: clampedProgress,
          isMobile,
          reducedMotion,
        });
      }
    };

    const onScroll = () => {
      if (rafId.current !== null) return;
      rafId.current = window.requestAnimationFrame(() => {
        updateScroll();
        rafId.current = null;
      });
    };

    const onResize = () => {
      updateScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    updateScroll();

    return () => {
      if (rafId.current !== null) {
        window.cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [stageRef]);

  return state;
}
