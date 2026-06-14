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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  q?: string;
}

export interface CreateRecordPayload {
  properties: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
}

export interface UpdateRecordPayload {
  rowVersion: number;
  properties?: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
}

export interface PopupSummaryField {
  code: string;
  label: string;
  displayValue: string;
  fieldType?: string;
  value?: unknown;
  popupStyle?: {
    bold?: boolean;
    fontSize?: string;
    color?: string;
  };
}

export interface RecordDisplayField {
  code: string;
  label: string;
  fieldType?: string;
  required?: boolean;
  value?: unknown;
  displayValue: string;
}

export interface RecordDisplayData {
  recordId: string;
  layerId: string;
  layerCode: string;
  layerName: string;
  popup: RecordDisplayField[];
  detail: RecordDisplayField[];
}
