import type { LayerCatalogItem } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import { getLayerColor } from "./colors";

const NO_GEOMETRY_TYPES = new Set(["none", ""]);

export function hasMapGeometry(geometryType: string): boolean {
  return !NO_GEOMETRY_TYPES.has(geometryType.toLowerCase());
}

/** Prototype slug → Phase 1 code (khi API Phase 1 chưa sẵn) */
const PROTOTYPE_CODE_MAP: Record<string, string> = {
  cooperatives: "economic_collective",
  "cooperative-groups": "economic_collective",
  irrigation: "pump_station",
  "administrative-boundary": "administrative_zone",
};

export function toLayer(item: LayerCatalogItem): Layer {
  const code = PROTOTYPE_CODE_MAP[item.id] ?? item.id;

  return {
    id: item.id,
    code,
    name: item.name,
    description: item.description,
    geometryType: item.geometryType,
    status: item.status,
    endpoint: item.endpoint,
    hasGeometry: hasMapGeometry(item.geometryType),
    color: getLayerColor(item.id),
  };
}
