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

export const WIDGET_TYPE_LABELS: Record<string, string> = {
  stat: "Thống kê",
  bar: "Biểu đồ cột",
  pie: "Biểu đồ tròn",
  donut: "Biểu đồ vòng",
  line: "Biểu đồ đường",
  table: "Bảng",
  map: "Bản đồ",
  text: "Văn bản",
  global_filter: "Bộ lọc chung",
};

export const AGGREGATION_LABELS: Record<string, string> = {
  count: "Đếm",
  sum: "Tổng",
  avg: "Trung bình",
  min: "Nhỏ nhất",
  max: "Lớn nhất",
  top: "Top N",
};

export const NUMERIC_FIELD_TYPES = new Set([
  "integer",
  "decimal",
  "number",
  "currency",
  "money",
  "measurement",
  "quantity",
]);

export const GROUPABLE_FIELD_TYPES = new Set([
  "text",
  "category",
  "multi_category",
  "boolean",
  "date",
  "select",
]);
