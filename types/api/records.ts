import type { GeoJsonGeometry } from "@/types/gis.types";

export type LocationStatus =
  | "unlocated"
  | "point_placed"
  | "polygon_drawn"
  | "imported"
  | string;

export interface RecordItem {
  id: string;
  layerId: string;
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry | null;
  locationStatus?: LocationStatus;
  rowVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecordsQuery {
  page?: number;
  pageSize?: number;
}
