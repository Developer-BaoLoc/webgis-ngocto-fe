export type DashboardScope = "private" | "organization" | "public";

export type WidgetType =
  | "stat"
  | "bar"
  | "pie"
  | "donut"
  | "line"
  | "table"
  | "map"
  | "text"
  | "global_filter";

export type AggregationType = "count" | "sum" | "avg";

export interface WidgetLayoutConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnalyticsFilter {
  fieldCode: string;
  operator?: "eq" | "neq" | "in";
  value: unknown;
}

export interface DataSourceConfig {
  layerId: string;
  aggregation: AggregationType;
  fieldCode?: string;
  groupByFieldCode?: string;
  filters?: AnalyticsFilter[];
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
}

export interface DataSourceLayer {
  layerId: string;
  layerName: string;
  layerCode?: string;
  fields: DataSourceField[];
}

export interface AnalyticsScalarResult {
  layerId: string;
  aggregation: string;
  value: number;
  fieldCode?: string;
}

export interface AnalyticsGroupRow {
  rawLabel: string;
  label: string;
  value: number;
}

export interface AnalyticsGroupedResult {
  layerId: string;
  aggregation: string;
  groupByFieldCode?: string;
  fieldCode?: string;
  rows: AnalyticsGroupRow[];
}

export type AnalyticsResult = AnalyticsScalarResult | AnalyticsGroupedResult;

export interface AnalyticsPreviewPayload {
  dataSourceConfig: DataSourceConfig;
  globalFilters?: AnalyticsFilter[];
}

export function isGroupedAnalyticsResult(
  result: AnalyticsResult,
): result is AnalyticsGroupedResult {
  return "rows" in result && Array.isArray(result.rows);
}
