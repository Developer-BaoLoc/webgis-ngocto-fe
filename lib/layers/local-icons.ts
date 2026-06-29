import type { LayerStyle } from "@/types/api/admin";

const STORAGE_KEY = "onegis.polygon_layer_icons.v1";
export const LOCAL_LAYER_ICONS_EVENT = "onegis:local-layer-icons-change";

interface LocalLayerIcon {
  iconAttachmentId?: string;
  iconUrl: string;
  showPolygonCenterIcon?: boolean;
}

type LocalLayerIconMap = Record<string, LocalLayerIcon>;

function readIcons(): LocalLayerIconMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as LocalLayerIconMap)
      : {};
  } catch {
    return {};
  }
}

export function mergeLocalLayerIcon<
  T extends { id: string; style?: LayerStyle | Record<string, unknown> },
>(layer: T): T {
  const icon = readIcons()[layer.id];
  if (!icon?.iconUrl) return layer;
  return {
    ...layer,
    style: {
      ...(layer.style ?? {}),
      iconAttachmentId: icon.iconAttachmentId,
      iconUrl: icon.iconUrl,
      showPolygonCenterIcon: icon.showPolygonCenterIcon,
    },
  };
}

export function saveLocalLayerIcon(layerId: string, style: LayerStyle): boolean {
  if (typeof window === "undefined") return false;
  try {
    const icons = readIcons();
    if (style.iconUrl) {
      icons[layerId] = {
        iconAttachmentId: style.iconAttachmentId,
        iconUrl: style.iconUrl,
        showPolygonCenterIcon: style.showPolygonCenterIcon,
      };
    } else {
      delete icons[layerId];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
    window.dispatchEvent(new Event(LOCAL_LAYER_ICONS_EVENT));
    return true;
  } catch {
    return false;
  }
}
