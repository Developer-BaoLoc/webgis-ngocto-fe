import type { Layer } from "@/types/layer.types";

const iconClass = "h-4 w-4 text-muted";

export function GeometryTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Point":
    case "MultiPoint":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "LineString":
    case "MultiLineString":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" d="M4 18 L10 10 L16 14 L20 6" />
        </svg>
      );
    case "Polygon":
    case "MultiPolygon":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinejoin="round" d="M6 8 L14 6 L18 14 L10 18 Z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
      );
  }
}

export function LayerRow({ layer }: { layer: Layer }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
        style={{ backgroundColor: layer.color }}
      />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{layer.name}</p>
        {layer.description && (
          <p className="truncate text-sm text-muted">{layer.description}</p>
        )}
      </div>
    </div>
  );
}
