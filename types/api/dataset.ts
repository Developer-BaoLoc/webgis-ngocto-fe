export type DatasetFieldType =
  | "text"
  | "number"
  | "integer"
  | "decimal"
  | "currency"
  | "date"
  | "boolean"
  | "select";

export interface DatasetField {
  key: string;
  label: string;
  type: DatasetFieldType;
}

export interface DatasetSource {
  viewId: string;
  sourceLabel: string;
  mapping: Record<string, string>;
}

export interface DatasetConfig {
  fields: DatasetField[];
  sources: DatasetSource[];
  previewLimit: number;
}

export interface Dataset {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  config: DatasetConfig;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatasetPayload {
  name: string;
  description?: string | null;
  config: DatasetConfig;
  isPublic?: boolean;
}

export interface DatasetPreviewResult {
  total: number;
  rows: Array<Record<string, unknown>>;
  fields: DatasetField[];
  previewLimit: number;
}

export interface DatasetUsage {
  widgetCount: number;
  dashboards: Array<{ id: string; name: string }>;
}
