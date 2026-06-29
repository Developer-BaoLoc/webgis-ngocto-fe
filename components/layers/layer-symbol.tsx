"use client";

import { useState } from "react";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { extractStyleFromLayer } from "@/lib/layers/style";
import type { LayerStyle } from "@/types/api/admin";
import { cn } from "@/lib/utils";

interface LayerSymbolData {
  geometryType?: string;
  geometryKind?: string;
  style?: LayerStyle | Record<string, unknown>;
  color?: string;
}

export function getLayerIconUrl(layer: LayerSymbolData): string | null {
  const geometry = String(layer.geometryType ?? layer.geometryKind ?? "").toLowerCase();
  if (geometry !== "point" && geometry !== "polygon") {
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
  layer: LayerSymbolData;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const iconUrl = getLayerIconUrl(layer);
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null);
  const style = extractStyleFromLayer(layer);
  const geometryKind = String(
    layer.geometryKind ?? layer.geometryType ?? "",
  ).toLowerCase();
  const boxClass =
    size === "xs"
      ? "h-6 w-6"
      : size === "sm"
        ? "h-8 w-8"
        : size === "lg"
          ? "h-12 w-12"
          : "h-10 w-10";

  if (iconUrl && failedIconUrl !== iconUrl) {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-slate-50 shadow-sm",
          boxClass,
        )}
      >
        <img
          src={iconUrl}
          alt=""
          className="h-[85%] w-[85%] object-contain"
          onError={() => setFailedIconUrl(iconUrl)}
        />
      </span>
    );
  }

  switch (geometryKind) {
    case "polygon":
      return (
        <span
          className={cn(
            "shrink-0 rounded-lg border-2 border-white shadow-sm",
            boxClass,
          )}
          style={{
            backgroundColor: style.fillColor ?? layer.color ?? "#22c55e80",
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
            boxClass,
          )}
          aria-hidden
        >
          <span
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: style.lineColor ?? layer.color ?? "#2563eb" }}
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
          style={{ backgroundColor: layer.color ?? "#64748b" }}
          aria-hidden
        />
      );
  }
}
