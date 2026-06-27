import type { WidgetType } from "@/types/api/dashboard";

const NO_DATA_WIDGET_TYPES = new Set<WidgetType>([
  "minimap",
  "text",
  "map",
  "global_filter",
]);

export function isNoDataWidget(widgetType: WidgetType) {
  return NO_DATA_WIDGET_TYPES.has(widgetType);
}
