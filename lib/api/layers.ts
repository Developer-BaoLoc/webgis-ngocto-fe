import type { LayerCatalogResponse, LayerDetail } from "@/types/api/layer-catalog";
import type { LayerSchema } from "@/types/api/schema";
import type { Layer } from "@/types/layer.types";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import { apiFetch } from "./client";
import { toLayer } from "@/lib/layers/adapter";
import { unwrapData, type ApiResponse } from "@/types/api/common";

export async function getLayerCatalog(): Promise<LayerCatalogResponse> {
  const res = await apiFetch<ApiResponse<LayerCatalogResponse>>("/layers", {
    token: null,
  });
  const catalog = unwrapData(res);
  const duongLayer = catalog.layers.find((layer) => layer.code === "duong");
  console.log("[duong-render-trace][frontend:getLayerCatalog]", {
    found: Boolean(duongLayer),
    layer: duongLayer,
    layerCount: catalog.layers.length,
  });
  return catalog;
}

export async function getLayers(): Promise<Layer[]> {
  const catalog = await getLayerCatalog();
  return catalog.layers.map(toLayer).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getLayerByCode(code: string): Promise<Layer | null> {
  try {
    const detail = await getLayerDetailByCode(code);
    return toLayer(detail);
  } catch {
    const layers = await getLayers();
    return layers.find((l) => l.code === code) ?? null;
  }
}

export async function getLayerDetailByCode(code: string): Promise<LayerDetail> {
  const res = await apiFetch<ApiResponse<LayerDetail>>(
    `/layers/by-code/${code}`,
  );
  return unwrapData(res);
}

export async function getLayerSchema(layerId: string): Promise<LayerSchema> {
  const res = await apiFetch<ApiResponse<LayerSchema>>(
    `/layers/${layerId}/schema`,
  );
  return unwrapData(res);
}

export interface GeoJsonQuery {
  bbox?: [number, number, number, number];
  includeUnlocated?: boolean;
}

export async function getLayerGeoJson(
  layerId: string,
  query?: GeoJsonQuery,
  options?: { token?: string | null },
): Promise<GeoJsonFeatureCollection> {
  const params = new URLSearchParams();
  if (query?.bbox) {
    params.set("bbox", query.bbox.join(","));
  }
  if (query?.includeUnlocated) {
    params.set("includeUnlocated", "true");
  }
  const qs = params.toString();
  const path = `/layers/${layerId}/geojson${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<
    GeoJsonFeatureCollection | ApiResponse<GeoJsonFeatureCollection>
  >(path, { token: options?.token });

  const geojson = unwrapData(res);
  console.log("[duong-render-trace][frontend:getLayerGeoJson]", {
    layerId,
    path,
    featureCount: geojson.features.length,
    firstGeometryType: geojson.features[0]?.geometry?.type ?? null,
  });
  return geojson;
}
