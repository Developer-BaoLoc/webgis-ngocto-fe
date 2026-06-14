"use client";

import { getWidgetColSpan, sortWidgets } from "@/lib/dashboard/utils";
import type { DashboardDetail } from "@/types/api/dashboard";
import { DashboardWidgetCard } from "./dashboard-widget-card";

interface DynamicDashboardViewProps {
  dashboard: DashboardDetail;
}

export function DynamicDashboardView({ dashboard }: DynamicDashboardViewProps) {
  const widgets = sortWidgets(
    dashboard.widgets.filter((widget) => widget.widgetType !== "global_filter"),
  );

  if (widgets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        Dashboard chưa có widget nào. Thêm widget trong Quản trị → Dashboard.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {widgets.map((widget, index) => (
        <div
          key={widget.id ?? `${widget.title}-${index}`}
          className={getWidgetColSpan(widget.layoutConfig.w)}
        >
          <DashboardWidgetCard widget={widget} />
        </div>
      ))}
    </div>
  );
}
