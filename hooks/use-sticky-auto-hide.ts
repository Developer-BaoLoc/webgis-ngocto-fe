"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface StickyAutoHideOptions {
  threshold?: number;
}

export function useStickyAutoHide(
  scrollContainerRef?: RefObject<HTMLElement | null>,
  options: StickyAutoHideOptions = {},
) {
  const { threshold = 50 } = options;
  const [visible, setVisible] = useState(true);
  const previousScrollY = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollElement = scrollContainerRef?.current ?? null;
    const target: HTMLElement | Window = scrollElement ?? window;

    const getScrollY = () =>
      scrollElement ? scrollElement.scrollTop : window.scrollY;

    const syncVisibility = () => {
      const currentScrollY = getScrollY();

      if (currentScrollY <= threshold) {
        setVisible(true);
      } else if (currentScrollY > previousScrollY.current) {
        setVisible(false);
      } else if (currentScrollY < previousScrollY.current) {
        setVisible(true);
      }

      previousScrollY.current = Math.max(0, currentScrollY);
      frameRef.current = null;
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(syncVisibility);
    };

    previousScrollY.current = Math.max(0, getScrollY());
    syncVisibility();
    target.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scrollContainerRef, threshold]);

  return visible;
}
