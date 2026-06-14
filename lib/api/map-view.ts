import { wardConfig } from "@/config/ward.config";
import { getLayerCatalog } from "@/lib/api/layers";
import { apiFetch } from "@/lib/api/client";
import { normalizeMapViewBounds } from "@/lib/map/bounds";
import { normalizeMapCenter } from "@/lib/map/vietnam";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type { MapViewConfig, MapViewConfigInput } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

export function normalizeMapViewConfig(raw: MapViewConfigInput): MapViewConfig {
  const bounds = raw.bounds
    ? (normalizeMapViewBounds(raw.bounds) ?? undefined)
    : undefined;
  const panBounds = raw.panBounds
    ? (normalizeMapViewBounds(raw.panBounds) ?? undefined)
    : undefined;

  return {
    center: normalizeMapCenter(raw.center ?? wardConfig.center),
    zoom: raw.zoom ?? raw.defaultZoom ?? wardConfig.defaultZoom,
    bounds,
    panBounds,
    minZoom: raw.minZoom,
    maxZoom: raw.maxZoom,
  };
}

function projectToMapView(project: {
  center?: { lat: number; lng: number };
  defaultZoom?: number;
  mapView?: MapViewConfigInput;
}): MapViewConfig {
  if (project.mapView) {
    return normalizeMapViewConfig(project.mapView);
  }

  return {
    center: normalizeMapCenter(project.center ?? wardConfig.center),
    zoom: project.defaultZoom ?? wardConfig.defaultZoom,
  };
}

export async function getMapViewMetadata(): Promise<MapViewConfig | null> {
  try {
    const res = await apiFetch<ApiResponse<MapViewConfigInput>>(
      "/metadata/map-view",
      { token: null },
    );
    return normalizeMapViewConfig(unwrapData(res));
  } catch {
    return null;
  }
}

export async function resolveMapView(): Promise<MapViewConfig> {
  const metadata = await getMapViewMetadata();
  if (metadata) return metadata;

  const catalog = await getLayerCatalog();
  return projectToMapView(catalog.project);
}

export async function getAdministrativeBoundary(): Promise<GeoJsonFeatureCollection> {
  const res = await apiFetch<
    GeoJsonFeatureCollection | ApiResponse<GeoJsonFeatureCollection>
  >("/layers/administrative-boundary", { token: null });

  return unwrapData(res);
}
