export type DashboardScope = "private" | "organization" | "public";

export type WidgetType =
  | "stat"
  | "bar"
  | "pie"
  | "donut"
  | "line"
  | "table"
  | "ranking"
  | "map"
  | "text"
  | "global_filter"
  | "timeline"
  | "calendar"
  | "progress"
  | "milestone"
  | "activity_history"
  | "minimap"
  | "progress_ring"
  | "activity_feed"
  | "treemap"
  | "seasonal_calendar";

export type AggregationType =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "top"
  | "records";

export interface WidgetLayoutConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnalyticsFilter {
  fieldCode: string;
  operator?:
    | "eq"
    | "neq"
    | "in"
    | "contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "empty"
    | "not_empty";
  value: unknown;
}

export interface DataSourceConfig {
  name?: string;
  datasetId?: string;
  viewId?: string;
  layerId?: string;
  aggregation: AggregationType;
  metricField?: string;
  dimensionField?: string;
  fieldCode?: string;
  groupByFieldCode?: string;
  filters?: AnalyticsFilter[];
  limit?: number;
  displayFields?: string[];
  titleField?: string;
  descriptionField?: string;
  startDateField?: string;
  dateField?: string;
  endDateField?: string;
  statusField?: string;
  groupField?: string;
  typeField?: string;
  severityField?: string;
  progressField?: string;
  ownerField?: string;
  deadlineField?: string;
  resultField?: string;
  metricFields?: string[];
  sort?: { field: string; direction: "asc" | "desc" };
}

export interface DashboardWidget {
  id?: string;
  widgetType: WidgetType;
  title: string;
  layoutConfig: WidgetLayoutConfig;
  dataSourceConfig?: DataSourceConfig;
  displayConfig?: Record<string, unknown>;
}

export interface DashboardListItem {
  id: string;
  name: string;
  description?: string | null;
  scope: DashboardScope;
  status?: string;
  hasDraft?: boolean;
  hasPublished?: boolean;
  updatedAt?: string;
}

export interface DashboardDetail {
  id: string;
  name: string;
  description?: string | null;
  scope: DashboardScope;
  layoutConfig?: { columns?: number };
  filterConfig?: unknown[];
  widgets: DashboardWidget[];
  revisionStatus?: "draft" | "published";
  version?: number;
}

export interface CreateDashboardPayload {
  name: string;
  description?: string | null;
  scope?: DashboardScope;
}

export interface UpdateDashboardDraftPayload {
  name?: string;
  description?: string | null;
  layoutConfig?: { columns?: number };
  filterConfig?: unknown[];
  widgets?: DashboardWidget[];
}

export interface DataSourceField {
  code: string;
  label: string;
  fieldType: string;
  dataSchema?: Record<string, unknown>;
}

export interface DataSourceLayer {
  layerId: string;
  layerName: string;
  layerCode?: string;
  fields: DataSourceField[];
}

export interface AnalyticsScalarResult {
  datasetId?: string;
  viewId?: string;
  layerId?: string;
  aggregation: string;
  value: number;
  fieldCode?: string;
  fieldLabels?: Record<string, string>;
}

export interface AnalyticsGroupRow {
  rawLabel: string;
  label: string;
  value: number;
}

export interface AnalyticsGroupedResult {
  datasetId?: string;
  viewId?: string;
  layerId?: string;
  aggregation: string;
  groupByFieldCode?: string;
  fieldCode?: string;
  rows: AnalyticsGroupRow[];
  fieldLabels?: Record<string, string>;
}

export interface AnalyticsTopResult {
  datasetId?: string;
  aggregation: "top";
  fieldCode?: string;
  records: Array<Record<string, unknown>>;
  fieldLabels?: Record<string, string>;
}

export interface AnalyticsRecordsResult {
  datasetId?: string;
  viewId?: string;
  layerId?: string;
  aggregation: "records";
  records: Array<Record<string, unknown>>;
  fieldLabels?: Record<string, string>;
}

export type AnalyticsResult =
  | AnalyticsScalarResult
  | AnalyticsGroupedResult
  | AnalyticsTopResult
  | AnalyticsRecordsResult;

export interface AnalyticsPreviewPayload {
  dataSourceConfig: DataSourceConfig;
  globalFilters?: AnalyticsFilter[];
}

export function isGroupedAnalyticsResult(
  result: AnalyticsResult,
): result is AnalyticsGroupedResult {
  return "rows" in result && Array.isArray(result.rows);
}

export function isTopAnalyticsResult(
  result: AnalyticsResult,
): result is AnalyticsTopResult {
  return (
    result.aggregation === "top" &&
    "records" in result &&
    Array.isArray(result.records)
  );
}

export function isRecordsAnalyticsResult(
  result: AnalyticsResult,
): result is AnalyticsRecordsResult {
  return (
    result.aggregation === "records" &&
    "records" in result &&
    Array.isArray(result.records)
  );
}
