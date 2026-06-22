import type { LayerGeometryTypeMeta } from "@/types/api/metadata";
import type { LayerIconStyle, LayerStyle } from "@/types/api/admin";

export const DEFAULT_LAYER_STYLES: Record<string, LayerStyle> = {
  point: {},
  line: { lineColor: "#2563eb", lineWidth: 3 },
  polygon: { fillColor: "#22c55e80", strokeColor: "#15803d" },
  sub_layer: {
    layerRole: "sub_layer",
    isSpatial: false,
    showOnMap: false,
    showInMapSidebar: false,
  },
};

export function getDefaultStyle(geometryType: string): LayerStyle {
  return { ...(DEFAULT_LAYER_STYLES[geometryType] ?? {}) };
}

function normalizeLayerIcon(style: LayerStyle): LayerStyle {
  const icon = style.icon;
  if (icon && typeof icon === "object") {
    const uploaded = icon as LayerIconStyle;
    return {
      ...style,
      iconAttachmentId: uploaded.attachmentId ?? style.iconAttachmentId,
      iconUrl: uploaded.url ?? style.iconUrl,
    };
  }
  return style;
}

export function hasLayerIcon(style: LayerStyle): boolean {
  const normalized = normalizeLayerIcon(style);
  return Boolean(normalized.iconAttachmentId);
}

/** @deprecated use hasLayerIcon */
export function hasPointIcon(style: LayerStyle): boolean {
  return hasLayerIcon(style);
}

export function buildStylePayload(
  geometryType: string,
  style: LayerStyle,
): LayerStyle {
  const meta = { geometryType };
  const normalized = normalizeLayerIcon(style);
  const dynamic = {
    styleMode: style.styleMode ?? "single",
    ...(style.styleMode === "by_value"
      ? {
          styleField: style.styleField,
          styleRules: style.styleRules ?? [],
          fallbackStyle: style.fallbackStyle ?? {},
        }
      : {}),
    ...(style.styleMode === "icon_by_value"
      ? {
          styleField: style.styleField,
          iconRules: style.iconRules ?? [],
          ...(style.fallbackIcon ? { fallbackIcon: style.fallbackIcon } : {}),
        }
      : {}),
  };
  const iconPayload: LayerStyle = {};
  if (normalized.iconAttachmentId) {
    iconPayload.iconAttachmentId = normalized.iconAttachmentId;
    if (normalized.iconUrl) {
      iconPayload.iconUrl = normalized.iconUrl;
    }
  }

  switch (geometryType) {
    case "point":
      return { ...meta, ...dynamic, ...iconPayload };
    case "line":
      return {
        ...meta,
        ...dynamic,
        lineColor: style.lineColor ?? "#2563eb",
        lineWidth: Number(style.lineWidth ?? 3),
      };
    case "polygon":
      return {
        ...meta,
        ...dynamic,
        fillColor: style.fillColor ?? "#22c55e80",
        strokeColor: style.strokeColor ?? "#15803d",
      };
    case "sub_layer":
      return {
        ...meta,
        layerRole: "sub_layer",
        isSpatial: false,
        showOnMap: false,
        showInMapSidebar: false,
      };
    default:
      return { ...meta, ...iconPayload, ...style };
  }
}

export function extractStyleFromLayer(layer: {
  geometryType?: string;
  style?: LayerStyle;
}): LayerStyle {
  if (!layer.style) {
    return getDefaultStyle(layer.geometryType ?? "point");
  }
  return normalizeLayerIcon({ ...layer.style });
}

export function findGeometryMeta(
  types: LayerGeometryTypeMeta[],
  geometryType: string,
): LayerGeometryTypeMeta | undefined {
  return types.find((t) => t.type === geometryType);
}
