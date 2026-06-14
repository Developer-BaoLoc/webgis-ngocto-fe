"use client";

import { BASEMAPS, type BasemapId } from "@/lib/map/basemaps";

interface BasemapSwitcherProps {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
}

export function BasemapSwitcher({ value, onChange }: BasemapSwitcherProps) {
  return (
    <div className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-border bg-surface shadow-md">
      {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={
            value === id
              ? "bg-primary px-3 py-2 text-sm font-medium text-white"
              : "px-3 py-2 text-sm text-muted hover:bg-slate-50 hover:text-foreground"
          }
        >
          {BASEMAPS[id].label}
        </button>
      ))}
    </div>
  );
}
