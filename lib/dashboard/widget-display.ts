import {
  getOptionLabel,
  type FieldLabelMetadata,
} from "@/lib/fields/field-label";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  isTopAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";

export function formatDisplayValue(
  value: unknown,
  fieldKey = "",
  metadata?: FieldLabelMetadata | null,
): string {
  if (value === null || value === undefined || value === "") {
    return "Chưa có dữ liệu";
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => getOptionLabel(fieldKey, item, metadata))
      .join(", ");
  }
  return getOptionLabel(fieldKey, value, metadata);
}

export function getStatusBadgeStyle(value: unknown): string {
  const normalized = normalizeValue(value);
  if (/hoan thanh|da xong|completed|complete|done|resolved/.test(normalized)) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (/dang thuc hien|dang lam|processing|in progress/.test(normalized)) {
    return "border-sky-300 bg-sky-50 text-sky-800";
  }
  if (/chua bat dau|not started|pending/.test(normalized)) {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (/tam dung|paused|on hold/.test(normalized)) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  if (/loi|that bai|error|failed/.test(normalized)) {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }
  return "border-slate-200 bg-white text-slate-700";
}

export function getWidgetSubtitle(
  widget: DashboardWidget,
  data?: AnalyticsResult | null,
): string {
  const count = dataCount(data);
  const limit =
    positiveInteger(widget.displayConfig?.limit) ??
    positiveInteger(widget.dataSourceConfig?.limit);
  const type = widget.widgetType;
  const base =
    type === "table"
      ? `Danh sách ${count ?? limit ?? 0} bản ghi`
      : type === "ranking" ||
          widget.dataSourceConfig?.aggregation === "top" ||
          widget.displayConfig?.variant === "ranking"
        ? `Top ${count ?? limit ?? 0} bản ghi`
        : type === "stat"
          ? "Thống kê dữ liệu"
          : type === "pie" || type === "donut"
            ? "Biểu đồ phân bố dữ liệu"
            : type === "bar"
              ? "Biểu đồ cột"
              : type === "line"
                ? "Biểu đồ đường"
                : type === "timeline"
                  ? "Dòng thời gian"
                  : type === "calendar"
                    ? "Lịch dữ liệu"
                    : type === "progress"
                      ? "Tiến độ thực hiện"
                      : type === "milestone"
                        ? "Kết quả triển khai"
                        : type === "activity_history"
                          ? "Lịch sử hoạt động"
                          : type === "minimap"
                            ? "Bản đồ dữ liệu thu nhỏ"
                            : type === "progress_ring"
                              ? "Tỷ lệ hoàn thành"
                              : type === "activity_feed"
                                ? "Hoạt động gần đây"
                                : type === "treemap"
                                  ? "Cơ cấu tỷ trọng dữ liệu"
                                  : type === "seasonal_calendar"
                                    ? "Lịch mùa vụ"
                                    : "Dữ liệu từ nguồn đã chọn";
  const sourceName = String(widget.dataSourceConfig?.name ?? "").trim();
  return sourceName ? `${base} • Nguồn: ${sourceName}` : base;
}

function dataCount(data?: AnalyticsResult | null): number | null {
  if (!data) return null;
  if (isTopAnalyticsResult(data) || isRecordsAnalyticsResult(data)) {
    return data.records.length;
  }
  if (isGroupedAnalyticsResult(data)) return data.rows.length;
  return null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeValue(value: unknown): string {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}
