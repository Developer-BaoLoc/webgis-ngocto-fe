"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface FloatingPanelProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}

export function FloatingPanel({
  open,
  anchorRef,
  onClose,
  children,
  ariaLabel,
  className = "w-[min(22rem,calc(100vw-2rem))]",
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    function measure() {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = panel?.width ?? 320;
      const height = panel?.height ?? 300;
      const left = Math.min(
        window.innerWidth - width - 12,
        Math.max(12, anchor.right - width),
      );
      const below = anchor.bottom + 8;
      const top =
        below + height <= window.innerHeight - 12
          ? below
          : Math.max(12, anchor.top - height - 8);
      setPosition({ top, left });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorRef, mounted, open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || !mounted) return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={ariaLabel}
      className={`fixed z-[130] max-h-[min(70vh,36rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-[0_22px_60px_rgba(15,23,42,0.2)] ${className}`}
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}
