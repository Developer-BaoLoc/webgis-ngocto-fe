import type { LayerGeometryTypeMeta } from "@/types/api/metadata";
import type { LayerIconStyle, LayerStyle } from "@/types/api/admin";

export const DEFAULT_LAYER_STYLES: Record<string, LayerStyle> = {
  point: {},
  line: { lineColor: "#2563eb", lineWidth: 3 },
  polygon: { fillColor: "#22c55e80", strokeColor: "#15803d" },
};

export function getDefaultStyle(geometryType: string): LayerStyle {
  return { ...(DEFAULT_LAYER_STYLES[geometryType] ?? {}) };
}

function normalizePointIcon(style: LayerStyle): LayerStyle {
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

export function hasPointIcon(style: LayerStyle): boolean {
  const normalized = normalizePointIcon(style);
  return Boolean(normalized.iconAttachmentId);
}

export function buildStylePayload(
  geometryType: string,
  style: LayerStyle,
): LayerStyle {
  const meta = { geometryType };
  switch (geometryType) {
    case "point": {
      const normalized = normalizePointIcon(style);
      const payload: LayerStyle = { ...meta };
      if (normalized.iconAttachmentId) {
        payload.iconAttachmentId = normalized.iconAttachmentId;
        if (normalized.iconUrl) {
          payload.iconUrl = normalized.iconUrl;
        }
      }
      return payload;
    }
    case "line":
      return {
        ...meta,
        lineColor: style.lineColor ?? "#2563eb",
        lineWidth: Number(style.lineWidth ?? 3),
      };
    case "polygon":
      return {
        ...meta,
        fillColor: style.fillColor ?? "#22c55e80",
        strokeColor: style.strokeColor ?? "#15803d",
      };
    default:
      return { ...meta, ...style };
  }
}

export function extractStyleFromLayer(layer: {
  geometryType?: string;
  style?: LayerStyle;
}): LayerStyle {
  if (!layer.style) {
    return getDefaultStyle(layer.geometryType ?? "point");
  }
  if (layer.geometryType === "point") {
    return normalizePointIcon({ ...layer.style });
  }
  return { ...layer.style };
}

export function findGeometryMeta(
  types: LayerGeometryTypeMeta[],
  geometryType: string,
): LayerGeometryTypeMeta | undefined {
  return types.find((t) => t.type === geometryType);
}
