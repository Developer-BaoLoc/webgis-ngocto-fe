export type SavedViewFilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "empty"
  | "not_empty";

export interface SavedViewFilter {
  field: string;
  operator: SavedViewFilterOperator;
  value?: unknown;
}

export interface SavedViewSort {
  field: string;
  direction: "asc" | "desc";
}

export interface SavedViewConfig {
  filterMode: "and";
  filters: SavedViewFilter[];
  sorts: SavedViewSort[];
  visibleFields: string[];
  limit: number;
  previewLimit: number;
}

export interface SavedView {
  id: string;
  name: string;
  description?: string | null;
  layerId: string;
  layerName: string;
  viewType: "table";
  config: SavedViewConfig;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedViewPayload {
  name: string;
  description?: string | null;
  layerId: string;
  viewType?: "table";
  config: SavedViewConfig;
  isPublic?: boolean;
}

export interface SavedViewPreviewField {
  code: string;
  label: string;
  fieldType: string;
}

export interface SavedViewPreviewResult {
  total: number;
  previewLimit: number;
  fields: SavedViewPreviewField[];
  rows: Array<Record<string, unknown>>;
}

export interface SavedViewUsage {
  widgetCount: number;
  dashboards: Array<{ id: string; name: string }>;
}
