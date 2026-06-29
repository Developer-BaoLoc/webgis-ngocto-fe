"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  padding?: boolean;
}

const sizeClasses = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

export function Modal({
  title,
  children,
  onClose,
  size = "md",
  padding = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Đóng"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Hộp thoại"}
        className={cn(
          "relative max-h-[90vh] w-full rounded-2xl border border-border bg-surface shadow-2xl",
          padding ? "overflow-y-auto p-6" : "overflow-hidden p-0",
          sizeClasses[size],
        )}
      >
        {title && (
          <div
            className={cn(
              "flex items-center justify-between",
              padding ? "mb-4" : "hidden",
            )}
          >
            <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted hover:bg-slate-100 hover:text-foreground"
              aria-label="Đóng hộp thoại"
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}
