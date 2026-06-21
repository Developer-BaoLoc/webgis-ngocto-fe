"use client";

import { useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { sortWidgets } from "@/lib/dashboard/utils";
import {
  buildDashboardResponsiveLayouts,
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLUMNS,
  dashboardWidgetGridId,
  type DashboardBreakpoint,
} from "@/lib/dashboard/responsive-grid";
import type { DashboardDetail } from "@/types/api/dashboard";
import { DashboardWidgetCard } from "./dashboard-widget-card";

interface DynamicDashboardViewProps {
  dashboard: DashboardDetail;
  editable?: boolean;
}

export function DynamicDashboardView({
  dashboard,
  editable = false,
}: DynamicDashboardViewProps) {
  const widgets = useMemo(
    () =>
      sortWidgets(
        dashboard.widgets.filter(
          (widget) => widget.widgetType !== "global_filter",
        ),
      ),
    [dashboard.widgets],
  );
  const layouts = useMemo(
    () => buildDashboardResponsiveLayouts(widgets),
    [widgets],
  );
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 1200,
  });

  if (widgets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        Dashboard chưa có widget nào. Thêm widget trong Quản trị → Dashboard.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="dashboard-view-grid-container">
      {mounted && (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={width}
          breakpoints={DASHBOARD_BREAKPOINTS}
          cols={DASHBOARD_COLUMNS}
          layouts={layouts}
          rowHeight={58}
          margin={{ lg: [16, 16], md: [14, 14], sm: [10, 10] }}
          containerPadding={{ lg: [0, 0], md: [0, 0], sm: [0, 0] }}
          dragConfig={{ enabled: editable, bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: editable, handles: editable ? ["se"] : [] }}
        >
          {widgets.map((widget, index) => (
            <div
              key={dashboardWidgetGridId(widget, index)}
              className="dashboard-view-grid-item"
            >
              <DashboardWidgetCard widget={widget} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
