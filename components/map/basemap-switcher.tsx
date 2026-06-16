"use client";

import { useEffect, useRef, useState } from "react";
import { BASEMAPS, type BasemapId } from "@/lib/map/basemaps";
import { cn } from "@/lib/utils";

interface BasemapSwitcherProps {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
  compact?: boolean;
}

const BASEMAP_ORDER: BasemapId[] = ["terrain", "satellite"];

export function BasemapSwitcher({ value, onChange, compact = false }: BasemapSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("absolute z-10", compact ? "right-2 top-2" : "right-3 top-3")}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={`Lớp nền: ${BASEMAPS[value].label}`}
        aria-label={`Lớp nền: ${BASEMAPS[value].label}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center justify-center rounded-lg border shadow-md backdrop-blur-sm transition-colors",
          compact
            ? "h-8 w-8 border-emerald-500/30 bg-slate-900/85 text-emerald-100 hover:bg-slate-800"
            : "h-9 w-9 border-border bg-surface/95 text-foreground hover:bg-slate-50",
          open && "ring-2 ring-primary/30",
        )}
      >
        <BasemapIcon id={value} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-lg backdrop-blur-sm"
        >
          {BASEMAP_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={value === id}
              title={BASEMAPS[id].label}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                value === id
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-slate-100 hover:text-foreground",
              )}
            >
              <BasemapIcon id={id} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BasemapIcon({ id }: { id: BasemapId }) {
  if (id === "satellite") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden
      >
        <circle cx="12" cy="12" r="3.25" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.369 1.684a1.125 1.125 0 0 1-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689A1.125 1.125 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.369-1.684c.381-.19.622-.58.622-1.006Z"
      />
    </svg>
  );
}
