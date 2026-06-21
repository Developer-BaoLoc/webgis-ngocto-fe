import type {
  DashboardWidget,
  WidgetLayoutConfig,
} from "@/types/api/dashboard";

const DESKTOP_COLUMNS = 12;

export function getDefaultWidgetLayout(
  widget: Pick<
    DashboardWidget,
    "widgetType" | "dataSourceConfig" | "displayConfig"
  >,
): Pick<WidgetLayoutConfig, "w" | "h"> {
  if (widget.widgetType === "stat") return { w: 3, h: 2 };
  if (
    widget.widgetType === "table" ||
    widget.dataSourceConfig?.aggregation === "top" ||
    widget.displayConfig?.variant === "ranking"
  ) {
    return { w: 6, h: 4 };
  }
  if (["bar", "pie", "donut", "line"].includes(widget.widgetType)) {
    return { w: 6, h: 4 };
  }
  if (
    [
      "timeline",
      "calendar",
      "progress",
      "milestone",
      "activity_history",
    ].includes(widget.widgetType)
  ) {
    return { w: 8, h: 5 };
  }
  if (widget.widgetType === "map") return { w: 12, h: 5 };
  return { w: 6, h: 4 };
}

export function placeWidgetInNextSlot(
  widget: DashboardWidget,
  existingWidgets: DashboardWidget[],
): DashboardWidget {
  const size = getDefaultWidgetLayout(widget);
  const occupied = existingWidgets.map((item) =>
    normalizeLayout(item.layoutConfig),
  );
  const maxBottom = occupied.reduce(
    (maximum, item) => Math.max(maximum, item.y + item.h),
    0,
  );

  for (let y = 0; y <= maxBottom + size.h + 20; y += 1) {
    for (let x = 0; x <= DESKTOP_COLUMNS - size.w; x += 1) {
      const candidate = { x, y, ...size };
      if (!occupied.some((item) => overlaps(candidate, item))) {
        return { ...widget, layoutConfig: candidate };
      }
    }
  }

  return {
    ...widget,
    layoutConfig: { x: 0, y: maxBottom, ...size },
  };
}

export function ensureDashboardWidgetLayouts(
  widgets: DashboardWidget[],
): DashboardWidget[] {
  return widgets.reduce<DashboardWidget[]>((result, widget) => {
    if (hasValidLayout(widget.layoutConfig)) {
      result.push({
        ...widget,
        layoutConfig: normalizeLayout(widget.layoutConfig),
      });
      return result;
    }
    const size = getDefaultWidgetLayout(widget);
    result.push(
      placeWidgetInNextSlot(
        { ...widget, layoutConfig: { x: 0, y: 0, ...size } },
        result,
      ),
    );
    return result;
  }, []);
}

export function widgetLayoutsChanged(
  original: DashboardWidget[],
  normalized: DashboardWidget[],
) {
  return normalized.some((widget, index) => {
    const before = original[index]?.layoutConfig;
    const after = widget.layoutConfig;
    return (
      !before ||
      before.x !== after.x ||
      before.y !== after.y ||
      before.w !== after.w ||
      before.h !== after.h
    );
  });
}

function normalizeLayout(layout?: WidgetLayoutConfig) {
  const width = Math.max(1, Math.min(DESKTOP_COLUMNS, layout?.w ?? 1));
  return {
    x: Math.max(0, Math.min(DESKTOP_COLUMNS - width, layout?.x ?? 0)),
    y: Math.max(0, layout?.y ?? 0),
    w: width,
    h: Math.max(1, layout?.h ?? 1),
  };
}

function hasValidLayout(layout?: WidgetLayoutConfig) {
  return Boolean(
    layout &&
    Number.isFinite(layout.x) &&
    Number.isFinite(layout.y) &&
    Number.isFinite(layout.w) &&
    Number.isFinite(layout.h) &&
    layout.w > 0 &&
    layout.h > 0,
  );
}

function overlaps(
  left: Pick<WidgetLayoutConfig, "x" | "y" | "w" | "h">,
  right: Pick<WidgetLayoutConfig, "x" | "y" | "w" | "h">,
) {
  return !(
    left.x + left.w <= right.x ||
    right.x + right.w <= left.x ||
    left.y + left.h <= right.y ||
    right.y + right.h <= left.y
  );
}
