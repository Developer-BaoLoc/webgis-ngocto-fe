import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import type { DashboardWidget } from "@/types/api/dashboard";
import { getDefaultWidgetLayout } from "@/lib/dashboard/grid-layout";

export type DashboardBreakpoint = "lg" | "md" | "sm" | "xs" | "xxs";

export const DASHBOARD_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  lg: 1024,
  md: 768,
  sm: 560,
  xs: 420,
  xxs: 0,
};

export const DASHBOARD_COLUMNS: Record<DashboardBreakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 6,
  xs: 4,
  xxs: 2,
};

export function dashboardWidgetGridId(widget: DashboardWidget, index: number) {
  return widget.id ?? `draft-widget-${index}`;
}

export function buildDashboardResponsiveLayouts(
  widgets: DashboardWidget[],
): ResponsiveLayouts<DashboardBreakpoint> {
  return {
    lg: widgets.map((widget, index) =>
      toGridItem(widget, index, DASHBOARD_COLUMNS.lg),
    ),
    md: widgets.map((widget, index) =>
      toGridItem(widget, index, DASHBOARD_COLUMNS.md),
    ),
    sm: widgets.map((widget, index) =>
      toGridItem(widget, index, DASHBOARD_COLUMNS.sm),
    ),
    xs: widgets.map((widget, index) =>
      toGridItem(widget, index, DASHBOARD_COLUMNS.xs),
    ),
    xxs: widgets.map((widget, index) =>
      toGridItem(widget, index, DASHBOARD_COLUMNS.xxs),
    ),
  };
}

export function getDashboardBreakpointForWidth(width: number) {
  if (width >= DASHBOARD_BREAKPOINTS.lg) return "lg";
  if (width >= DASHBOARD_BREAKPOINTS.md) return "md";
  if (width >= DASHBOARD_BREAKPOINTS.sm) return "sm";
  if (width >= DASHBOARD_BREAKPOINTS.xs) return "xs";
  return "xxs";
}

export function scaleGridValue(
  value: number,
  fromColumns: number,
  toColumns: number,
  allowZero = false,
) {
  const scaled = Math.round((Math.max(0, value) * toColumns) / fromColumns);
  return allowZero ? Math.max(0, scaled) : Math.max(1, scaled);
}

function toGridItem(
  widget: DashboardWidget,
  index: number,
  columns: number,
): LayoutItem {
  const fallback = getDefaultWidgetLayout(widget);
  const desktop = widget.layoutConfig ?? {
    x: 0,
    y: index * fallback.h,
    ...fallback,
  };
  const constraints = getWidgetMinimumSize(widget);
  const width = Math.min(
    columns,
    Math.max(
      Math.min(columns, constraints.minW),
      scaleGridValue(desktop.w, DASHBOARD_COLUMNS.lg, columns),
    ),
  );
  const x = Math.min(
    columns - width,
    scaleGridValue(desktop.x, DASHBOARD_COLUMNS.lg, columns, true),
  );
  return {
    i: dashboardWidgetGridId(widget, index),
    x,
    y: Math.max(0, desktop.y),
    w: width,
    h: Math.max(constraints.minH, desktop.h),
    minW: Math.min(columns, constraints.minW),
    minH: constraints.minH,
  };
}

function getWidgetMinimumSize(widget: DashboardWidget) {
  if (widget.widgetType === "stat") return { minW: 2, minH: 1 };
  if (widget.widgetType === "minimap" || widget.widgetType === "thematic_map") {
    return { minW: 3, minH: 3 };
  }
  if (
    [
      "alert_center",
      "activity_feed",
      "ranking",
      "spatial_alert",
      "spatial_ranking",
      "table",
    ].includes(widget.widgetType) ||
    widget.dataSourceConfig?.aggregation === "top"
  ) {
    return { minW: 3, minH: 2 };
  }
  if (["bar", "pie", "donut", "line", "treemap"].includes(widget.widgetType)) {
    return { minW: 3, minH: 2 };
  }
  if (widget.widgetType === "progress_ring") return { minW: 2, minH: 2 };
  if (
    [
      "timeline",
      "calendar",
      "progress",
      "milestone",
      "activity_history",
      "spatial_summary",
      "seasonal_calendar",
    ].includes(widget.widgetType)
  ) {
    return { minW: 3, minH: 3 };
  }
  return { minW: 3, minH: 2 };
}
