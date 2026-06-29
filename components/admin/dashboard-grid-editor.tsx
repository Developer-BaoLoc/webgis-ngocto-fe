"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
} from "react-grid-layout";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { DashboardWidgetCard } from "@/components/dashboard/dashboard-widget-card";
import { getWidgetDisplayTitle } from "@/lib/dashboard/widget-labels";
import type { DashboardWidget } from "@/types/api/dashboard";
import {
  buildDashboardResponsiveLayouts,
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLUMNS,
  dashboardWidgetGridId,
  getDashboardBreakpointForWidth,
  scaleGridValue,
  type DashboardBreakpoint,
} from "@/lib/dashboard/responsive-grid";

export interface DashboardGridItemLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardGridEditorProps {
  widgets: DashboardWidget[];
  disabled?: boolean;
  onLayoutChange: (layout: DashboardGridItemLayout[]) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function DashboardGridEditor({
  widgets,
  disabled = false,
  onLayoutChange,
  onEdit,
  onDelete,
}: DashboardGridEditorProps) {
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 1200,
  });
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpoint>("lg");
  const { collapsed, mobileOpen, isMobile } = useSidebar();
  const currentBreakpoint = getDashboardBreakpointForWidth(width);
  const currentColumns = DASHBOARD_COLUMNS[currentBreakpoint];

  useEffect(() => {
    const frames = [0, 80, 180, 260];
    const timers = frames.map((delay) =>
      window.setTimeout(() => {
        window.requestAnimationFrame(measureWidth);
      }, delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [collapsed, mobileOpen, isMobile, measureWidth]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      window.localStorage.getItem("debug-dashboard-grid") !== "1"
    ) {
      return;
    }

    console.debug("[dashboard-grid:builder]", {
      containerWidth: containerRef.current?.clientWidth ?? null,
      gridWidth: width,
      breakpoint: currentBreakpoint,
      columns: currentColumns,
      sidebar: { collapsed, mobileOpen, isMobile },
    });
  }, [
    collapsed,
    containerRef,
    currentBreakpoint,
    currentColumns,
    isMobile,
    mobileOpen,
    width,
  ]);

  const layouts = useMemo(() => {
    return buildDashboardResponsiveLayouts(widgets);
  }, [widgets]);

  function commitLayout(layout: Layout) {
    const sourceColumns = DASHBOARD_COLUMNS[breakpoint];
    onLayoutChange(
      layout.map((item) => {
        const width = Math.min(
          DASHBOARD_COLUMNS.lg,
          scaleGridValue(item.w, sourceColumns, DASHBOARD_COLUMNS.lg),
        );
        return {
          id: item.i,
          x: Math.min(
            DASHBOARD_COLUMNS.lg - width,
            scaleGridValue(item.x, sourceColumns, DASHBOARD_COLUMNS.lg, true),
          ),
          y: Math.max(0, item.y),
          w: width,
          h: Math.max(1, item.h),
        };
      }),
    );
  }

  return (
    <div ref={containerRef} className="dashboard-grid-editor-container">
      {mounted && (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={width}
          breakpoints={DASHBOARD_BREAKPOINTS}
          cols={DASHBOARD_COLUMNS}
          layouts={layouts}
          rowHeight={58}
          margin={{
            lg: [16, 16],
            md: [14, 14],
            sm: [12, 12],
            xs: [10, 10],
            xxs: [8, 8],
          }}
          containerPadding={{
            lg: [0, 0],
            md: [0, 0],
            sm: [0, 0],
            xs: [0, 0],
            xxs: [0, 0],
          }}
          dragConfig={{
            enabled: !disabled,
            bounded: false,
            handle: ".dashboard-grid-drag-handle",
            cancel: ".dashboard-grid-action",
            threshold: 3,
          }}
          resizeConfig={{ enabled: !disabled, handles: ["se"] }}
          onBreakpointChange={(next) =>
            setBreakpoint(next as DashboardBreakpoint)
          }
          onDragStop={(layout) => commitLayout(layout)}
          onResizeStop={(layout) => commitLayout(layout)}
        >
          {widgets.map((widget, index) => (
            <div
              key={dashboardWidgetGridId(widget, index)}
              className="dashboard-grid-item group"
            >
              <div className="dashboard-grid-toolbar">
                <button
                  type="button"
                  className="dashboard-grid-drag-handle"
                  title="Giữ và kéo để đổi vị trí"
                  aria-label={`Kéo tiện ích ${getWidgetDisplayTitle(widget)}`}
                >
                  <span aria-hidden>⠿</span>
                  <span className="truncate">
                    {getWidgetDisplayTitle(widget)}
                  </span>
                </button>
                <div className="dashboard-grid-actions">
                  <button
                    type="button"
                    className="dashboard-grid-action"
                    onClick={() => onEdit(index)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="dashboard-grid-action dashboard-grid-action--danger"
                    onClick={() => onDelete(index)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
              <div className="dashboard-grid-widget-content">
                <DashboardWidgetCard widget={widget} />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
