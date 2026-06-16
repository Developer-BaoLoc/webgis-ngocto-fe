import type { LayerCatalogItem, LayerDetail } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import { geometryKindToType } from "@/types/layer.types";
import { getLayerColor } from "./colors";

export function resolveGeometryKind(
  item: LayerCatalogItem | LayerDetail,
): string {
  return item.geometryType ?? item.geometryKind ?? "none";
}

export function hasMapGeometry(kind: string): boolean {
  return kind !== "none";
}

export function toLayer(item: LayerCatalogItem | LayerDetail): Layer {
  const geometryKind = resolveGeometryKind(item);
  const layer = {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    geometryType: item.geometryType ?? geometryKind,
    geometryKind,
    geometryTypeDisplay: geometryKindToType(geometryKind),
    geometryRequired: item.geometryRequired ?? false,
    endpoint: item.endpoint,
    hasGeometry: hasMapGeometry(geometryKind),
    color: getLayerColor(item.code),
    sortOrder: item.sortOrder,
    style: item.style,
  };

  if (item.code === "duong") {
    console.log("[duong-render-trace][frontend:toLayer]", {
      rawGeometryType: item.geometryType,
      rawGeometryKind: item.geometryKind,
      resolvedGeometryKind: geometryKind,
      layer,
    });
  }

  return layer;
}
