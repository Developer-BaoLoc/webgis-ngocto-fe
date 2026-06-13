export type GeometryKind = "point" | "polygon" | "line" | "none" | string;

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
  code: string;
  name: string;
  description: string | null;
  geometryKind: GeometryKind;
  geometryRequired: boolean;
  sortOrder: number;
  endpoint: string;
}

export interface LayerCatalogResponse {
  project: LayerCatalogProject;
  layers: LayerCatalogItem[];
}

export interface LayerDetail extends LayerCatalogItem {
  renderMode?: string;
  currentSchemaVersionId?: string;
}
