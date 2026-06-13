import type { LayerCatalogResponse } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import { apiFetch } from "./client";
import { toLayer } from "@/lib/layers/adapter";

export async function getLayerCatalog(): Promise<LayerCatalogResponse> {
  return apiFetch<LayerCatalogResponse>("/layers");
}

export async function getLayers(): Promise<Layer[]> {
  const catalog = await getLayerCatalog();
  return catalog.layers.map(toLayer);
}

export async function getLayerByCode(code: string): Promise<Layer | null> {
  const layers = await getLayers();
  return (
    layers.find((l) => l.id === code) ??
    layers.find((l) => l.code === code) ??
    null
  );
}

/** Adapter tạm cho prototype GeoJSON endpoint */
export async function getLayerGeoJson(
  endpoint: string,
): Promise<GeoJsonFeatureCollection> {
  const path = endpoint.replace(/^\/api/, "");
  return apiFetch<GeoJsonFeatureCollection>(path);
}
