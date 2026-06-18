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
  const normalized = kind.toLowerCase();
  return normalized !== "none" && normalized !== "sub_layer";
}

function readLayerFlag(
  item: LayerCatalogItem | LayerDetail | Layer,
  key: "layerRole" | "isSpatial" | "showOnMap" | "showInMapSidebar",
) {
  const style = item.style as Record<string, unknown> | undefined;
  const metadata = style?.metadata as Record<string, unknown> | undefined;
  return (
    (item as unknown as Record<string, unknown>)[key] ??
    style?.[key] ??
    metadata?.[key]
  );
}

function isFalse(value: unknown): boolean {
  return value === false || value === "false";
}

export function isMapVisibleLayer(
  layer: LayerCatalogItem | LayerDetail | Layer,
): boolean {
  const style = layer.style as Record<string, unknown> | undefined;
  const metadata = style?.metadata as Record<string, unknown> | undefined;
  const geometryKind = String(
    layer.geometryKind ??
      layer.geometryType ??
      style?.geometryKind ??
      style?.geometryType ??
      metadata?.geometryKind ??
      metadata?.geometryType ??
      "none",
  ).toLowerCase();
  const geometryType = String(
    layer.geometryType ??
      style?.geometryType ??
      metadata?.geometryType ??
      geometryKind,
  ).toLowerCase();
  const layerRole = String(readLayerFlag(layer, "layerRole") ?? "").toLowerCase();

  return (
    layerRole !== "sub_layer" &&
    geometryKind !== "none" &&
    geometryKind !== "sub_layer" &&
    geometryType !== "none" &&
    geometryType !== "sub_layer" &&
    !isFalse(readLayerFlag(layer, "showOnMap")) &&
    !isFalse(readLayerFlag(layer, "showInMapSidebar")) &&
    !isFalse(readLayerFlag(layer, "isSpatial")) &&
    hasMapGeometry(geometryKind)
  );
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
    layerRole: readLayerFlag(item, "layerRole") as string | undefined,
    isSpatial: readLayerFlag(item, "isSpatial") as boolean | undefined,
    showOnMap: readLayerFlag(item, "showOnMap") as boolean | undefined,
    showInMapSidebar: readLayerFlag(item, "showInMapSidebar") as
      | boolean
      | undefined,
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
