import type { MapViewConfig, MapViewConfigInput } from "@/types/api/map-view";

export type GeometryKind = "point" | "polygon" | "line" | "linestring" | "none" | string;

export interface LayerCatalogProject {
  name: string;
  description: string;
  ward: string;
  district: string;
  province: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
  mapView?: MapViewConfigInput;
}

export interface LayerCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  geometryType?: string;
  geometryKind: GeometryKind;
  geometryRequired?: boolean;
  sortOrder: number;
  endpoint: string;
  style?: Record<string, unknown>;
}

export interface LayerCatalogResponse {
  project: LayerCatalogProject;
  layers: LayerCatalogItem[];
}

export interface LayerDetail extends LayerCatalogItem {
  renderMode?: string;
  currentSchemaVersionId?: string;
}
