import type { LayerCatalogItem, LayerDetail } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import { geometryKindToType } from "@/types/layer.types";
import { getLayerColor } from "./colors";

export function hasMapGeometry(geometryKind: string): boolean {
  return geometryKind !== "none";
}

export function toLayer(item: LayerCatalogItem | LayerDetail): Layer {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    geometryKind: item.geometryKind,
    geometryType: geometryKindToType(item.geometryKind),
    geometryRequired: item.geometryRequired,
    endpoint: item.endpoint,
    hasGeometry: hasMapGeometry(item.geometryKind),
    color: getLayerColor(item.code),
    sortOrder: item.sortOrder,
  };
}
