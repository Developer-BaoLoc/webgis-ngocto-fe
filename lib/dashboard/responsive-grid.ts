import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import type { DashboardWidget } from "@/types/api/dashboard";
import { getDefaultWidgetLayout } from "@/lib/dashboard/grid-layout";

export type DashboardBreakpoint = "lg" | "md" | "sm";

export const DASHBOARD_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  lg: 1200,
  md: 768,
  sm: 0,
};

export const DASHBOARD_COLUMNS: Record<DashboardBreakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 4,
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
  };
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
  if (widget.widgetType === "stat") return { minW: 2, minH: 2 };
  if (
    [
      "timeline",
      "calendar",
      "progress",
      "milestone",
      "activity_history",
      "minimap",
      "activity_feed",
      "seasonal_calendar",
    ].includes(widget.widgetType)
  ) {
    return { minW: 4, minH: 4 };
  }
  return { minW: 3, minH: 3 };
}
