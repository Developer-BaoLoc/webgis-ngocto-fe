import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { extractStyleFromLayer } from "@/lib/layers/style";
import type { Layer } from "@/types/layer.types";
import { cn } from "@/lib/utils";

export function getLayerIconUrl(layer: Layer): string | null {
  if (layer.geometryType !== "point" && layer.geometryKind !== "point") {
    return null;
  }

  const style = extractStyleFromLayer(layer);
  if (style.iconUrl) {
    return resolvePublicAssetUrl(style.iconUrl);
  }
  const icon = style.icon;
  if (icon && typeof icon === "object" && icon.url) {
    return resolvePublicAssetUrl(icon.url);
  }
  return null;
}

export function LayerSymbol({
  layer,
  size = "md",
}: {
  layer: Layer;
  size?: "sm" | "md" | "lg";
}) {
  const iconUrl = getLayerIconUrl(layer);
  const style = extractStyleFromLayer(layer);
  const boxClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";

  if (iconUrl) {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-slate-50 shadow-sm",
          boxClass,
        )}
      >
        <img src={iconUrl} alt="" className="h-[85%] w-[85%] object-contain" />
      </span>
    );
  }

  switch (layer.geometryKind) {
    case "polygon":
      return (
        <span
          className={cn(
            "shrink-0 rounded-lg border-2 border-white shadow-sm",
            size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10",
          )}
          style={{
            backgroundColor: style.fillColor ?? layer.color,
            borderColor: style.strokeColor ?? "rgba(255,255,255,0.9)",
          }}
          aria-hidden
        />
      );
    case "line":
    case "linestring":
      return (
        <span
          className={cn(
            "flex shrink-0 items-center rounded-lg bg-slate-50 px-2",
            size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10",
          )}
          aria-hidden
        >
          <span
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: style.lineColor ?? layer.color }}
          />
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "shrink-0 rounded-full ring-4 ring-white shadow-sm",
            size === "sm" ? "h-5 w-5" : size === "lg" ? "h-7 w-7" : "h-6 w-6",
          )}
          style={{ backgroundColor: layer.color }}
          aria-hidden
        />
      );
  }
}
