import type { WidgetType } from "@/types/api/dashboard";
import type { DashboardTemplate } from "@/lib/dashboard/templates";

export const DASHBOARD_AI_WIDGET_TYPES = [
  "stat",
  "bar",
  "pie",
  "donut",
  "line",
  "table",
  "ranking",
  "map",
  "text",
  "global_filter",
  "timeline",
  "calendar",
  "progress",
  "milestone",
  "activity_history",
  "minimap",
  "progress_ring",
  "activity_feed",
  "treemap",
  "alert_center",
  "spatial_summary",
  "spatial_ranking",
  "thematic_map",
  "spatial_alert",
  "seasonal_calendar",
] as const satisfies readonly WidgetType[];

export const DASHBOARD_AI_TEMPLATE_CATEGORIES = [
  "ioc",
  "aquaculture",
  "rice",
  "crop",
  "irrigation",
  "ocop",
  "alert",
  "custom",
] as const satisfies readonly DashboardTemplate["category"][];

export const DASHBOARD_AI_PLACEHOLDER_KINDS = [
  "layer",
  "saved_view",
  "dataset",
  "field",
  "metric_field",
  "dimension_field",
  "date_field",
  "zone_layer",
  "zone_label_field",
] as const;

export const DASHBOARD_AI_GEOMETRY_TYPES = [
  "point",
  "line",
  "polygon",
  "any",
] as const;

export const DASHBOARD_AI_SOURCE_PLACEHOLDER_KINDS = [
  "layer",
  "saved_view",
  "dataset",
  "zone_layer",
] as const;

export const DASHBOARD_AI_PLACEHOLDER_PATTERN =
  /^__(layer|field|dataset|view):([A-Za-z0-9_-]+)__$/;

export const DASHBOARD_AI_ANY_PLACEHOLDER_PATTERN =
  /__([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)__/;

export const dashboardAiWidgetTypeSet = new Set<string>(
  DASHBOARD_AI_WIDGET_TYPES,
);
export const dashboardAiCategorySet = new Set<string>(
  DASHBOARD_AI_TEMPLATE_CATEGORIES,
);
export const dashboardAiPlaceholderKindSet = new Set<string>(
  DASHBOARD_AI_PLACEHOLDER_KINDS,
);
export const dashboardAiGeometryTypeSet = new Set<string>(
  DASHBOARD_AI_GEOMETRY_TYPES,
);
