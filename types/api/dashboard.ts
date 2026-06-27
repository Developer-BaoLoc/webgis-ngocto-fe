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
  | "alert_center"
  | "spatial_summary"
  | "spatial_ranking"
  | "thematic_map"
  | "spatial_alert"
  | "seasonal_calendar";

export type AggregationType =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "top"
  | "records";

export type QueryMode = "simple" | "advanced";

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
    | "not_contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "empty"
    | "not_empty";
  value: unknown;
}

export interface AdvancedQueryRule {
  fieldCode: string;
  operator:
    | "eq"
    | "neq"
    | "in"
    | "contains"
    | "not_contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "empty"
    | "not_empty";
  value?: unknown;
}

export interface AdvancedHavingRule {
  field: string;
  aggregation: AggregationType;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  value: number;
}

export interface AdvancedFormulaConfig {
  enabled: boolean;
  label: string;
  unit?: string;
  expression: string;
  fields: string[];
}

export type TimePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "custom";

export type TimeCompareMode =
  | "none"
  | "previous_period"
  | "same_period_last_year";

export interface AdvancedQueryTimeConfig {
  enabled: boolean;
  dateField: string;
  preset: TimePreset;
  customFrom?: string;
  customTo?: string;
  compare?: TimeCompareMode;
}

export interface AdvancedQueryConfig {
  version: 1;
  source: {
    type: "dataset" | "view" | "layer";
    id: string;
  };
  select: {
    aggregation: AggregationType;
    metricField?: string;
    dimensionField?: string;
    displayFields?: string[];
  };
  filter?: {
    combinator: "and";
    rules: AdvancedQueryRule[];
  };
  having?: {
    combinator: "and";
    rules: AdvancedHavingRule[];
  };
  formula?: AdvancedFormulaConfig;
  time?: AdvancedQueryTimeConfig;
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  limit?: number;
}

export interface DataSourceConfig {
  name?: string;
  datasetId?: string;
  viewId?: string;
  layerId?: string;
  virtualDataset?: {
    id: string;
    name: string;
    type: "virtualDataset";
    fields: DataSourceField[];
    records: Array<{
      name: string;
      category: string;
      value: number;
      sourceType: string;
      sourceLabel: string;
    }>;
  };
  queryMode?: QueryMode;
  advancedQuery?: AdvancedQueryConfig;
  aggregation: AggregationType;
  metricField?: string;
  dimensionField?: string;
  fieldCode?: string;
  groupByFieldCode?: string;
  filters?: AnalyticsFilter[];
  time?: AdvancedQueryTimeConfig;
  having?: {
    combinator: "and";
    rules: AdvancedHavingRule[];
  };
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
  areaField?: string;
  progressField?: string;
  ownerField?: string;
  deadlineField?: string;
  resultField?: string;
  metricFields?: string[];
  sort?: { field: string; direction: "asc" | "desc" };
  spatial?: SpatialDataSourceConfig;
}

export interface SpatialDataSourceConfig {
  mode: "summary" | "ranking" | "thematic_map" | "alert";
  sourceLayerId: string;
  zoneLayerId: string;
  zoneLabelField?: string;
  metricAggregation: "count" | "sum" | "avg" | "min" | "max";
  metricField?: string;
  limit?: number;
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
  geometryType?: string | null;
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
  comparison?: AnalyticsComparison;
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
  comparison?: AnalyticsComparison;
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

export interface AnalyticsComparison {
  currentValue?: number;
  previousValue?: number;
  delta?: number;
  deltaPercent?: number | null;
  label: string;
  currentRange?: { from: string; to: string };
  previousRange?: { from: string; to: string };
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
