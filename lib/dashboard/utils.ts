import type { DashboardWidget } from "@/types/api/dashboard";

export function sortWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return [...widgets].sort((a, b) => {
    const yDiff = a.layoutConfig.y - b.layoutConfig.y;
    if (yDiff !== 0) return yDiff;
    return a.layoutConfig.x - b.layoutConfig.x;
  });
}

export function getWidgetColSpan(width: number): string {
  if (width >= 10) return "col-span-12";
  if (width >= 7) return "col-span-12 lg:col-span-8";
  if (width >= 5) return "col-span-12 sm:col-span-6 lg:col-span-6";
  if (width >= 3) return "col-span-12 sm:col-span-6 lg:col-span-4";
  return "col-span-12 sm:col-span-6 lg:col-span-3";
}

export function formatAnalyticsNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return value.toLocaleString("vi-VN");
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function formatWidgetValue(
  value: unknown,
  options?: {
    unit?: string;
    metricLabel?: string;
    valueFormat?: "number" | "currency" | "percent" | "integer";
    compact?: boolean;
  },
): string {
  const parts = formatWidgetValueParts(value, options);
  if (parts.value === "—") return parts.value;
  if (parts.unit === "%") return `${parts.value}%`;
  return parts.unit ? `${parts.value} ${parts.unit}` : parts.value;
}

export function formatWidgetValueParts(
  value: unknown,
  options?: {
    unit?: string;
    metricLabel?: string;
    valueFormat?: "number" | "currency" | "percent" | "integer";
    compact?: boolean;
  },
): { value: string; unit: string } {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { value: "—", unit: "" };
  const valueFormat = options?.valueFormat ?? "number";
  const formatted =
    valueFormat === "integer"
      ? Math.round(parsed).toLocaleString("vi-VN")
      : parsed.toLocaleString("vi-VN", {
          maximumFractionDigits: valueFormat === "percent" ? 1 : 2,
          notation: options?.compact ? "compact" : "standard",
        });
  if (valueFormat === "percent") return { value: formatted, unit: "%" };
  const unit = options?.unit?.trim();
  return { value: formatted, unit: unit ?? "" };
}

export function getWidgetValueUnit(
  widget: Pick<DashboardWidget, "displayConfig" | "dataSourceConfig">,
  metricField?: string,
): string {
  const displayUnit = stringValue(widget.displayConfig?.unit);
  if (displayUnit) return displayUnit;
  const formulaUnit =
    metricField === "__formula" ||
    widget.dataSourceConfig?.metricField === "__formula" ||
    widget.dataSourceConfig?.fieldCode === "__formula"
      ? stringValue(widget.dataSourceConfig?.advancedQuery?.formula?.unit)
      : "";
  if (formulaUnit) return formulaUnit;
  return stringValue(widget.displayConfig?.suffix);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const WIDGET_TYPE_LABELS: Record<string, string> = {
  stat: "Thống kê",
  bar: "Biểu đồ cột",
  pie: "Biểu đồ tròn",
  donut: "Biểu đồ vòng",
  line: "Biểu đồ đường",
  table: "Bảng",
  ranking: "Bảng xếp hạng",
  map: "Bản đồ",
  text: "Văn bản",
  global_filter: "Bộ lọc chung",
  timeline: "Dòng thời gian",
  calendar: "Lịch công việc",
  progress: "Tiến độ",
  milestone: "Kết quả triển khai",
  activity_history: "Lịch sử hoạt động",
  minimap: "Bản đồ nhỏ",
  progress_ring: "Vòng tiến độ",
  activity_feed: "Dòng hoạt động",
  treemap: "Treemap",
  alert_center: "Trung tâm cảnh báo",
  spatial_summary: "Thống kê theo khu vực",
  spatial_ranking: "Top khu vực",
  thematic_map: "Bản đồ tô màu",
  spatial_alert: "Cảnh báo không gian",
  seasonal_calendar: "Lịch mùa vụ",
};

export const AGGREGATION_LABELS: Record<string, string> = {
  count: "Đếm",
  sum: "Tổng",
  avg: "Trung bình",
  min: "Nhỏ nhất",
  max: "Lớn nhất",
  top: "Top N",
  records: "Danh sách bản ghi",
};

export const DATE_FIELD_TYPES = new Set(["date", "datetime", "timestamp"]);

export { NUMERIC_FIELD_TYPES } from "@/lib/fields/field-types";

export const GROUPABLE_FIELD_TYPES = new Set([
  "text",
  "category",
  "multi_category",
  "boolean",
  "date",
  "select",
]);
