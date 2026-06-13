export type LayerCatalogStatus = "planned" | "in_progress" | "ready";

export interface LayerCatalogProject {
  name: string;
  description: string;
  ward: string;
  district: string;
  province: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
}

export interface LayerCatalogItem {
  id: string;
  name: string;
  description: string;
  geometryType: string;
  status: LayerCatalogStatus;
  endpoint: string;
}

export interface PlannedLayerItem {
  id: string;
  name: string;
}

export interface LayerCatalogResponse {
  project: LayerCatalogProject;
  layers: LayerCatalogItem[];
  plannedLayers: PlannedLayerItem[];
}
