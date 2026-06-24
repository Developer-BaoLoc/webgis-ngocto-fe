import { AGGREGATION_LABELS } from "@/lib/dashboard/utils";
import { getFieldLabel } from "@/lib/fields/field-label";
import type { DataSourceConfig, DashboardWidget } from "@/types/api/dashboard";

export type WidgetFieldLabels = Record<string, string>;

export function readWidgetFieldLabels(
  displayConfig?: Record<string, unknown>,
): WidgetFieldLabels {
  const value = displayConfig?.fieldLabels;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && Boolean(entry[1].trim()),
    ),
  );
}

export function getWidgetFieldLabel(
  widget: Pick<DashboardWidget, "displayConfig">,
  fieldKey?: string,
): string {
  if (!fieldKey) return "";
  const label = readWidgetFieldLabels(widget.displayConfig)[fieldKey];
  return getFieldLabel(fieldKey, label ? { label } : undefined);
}

export function buildWidgetAutoTitle(
  config?: DataSourceConfig,
  fieldLabels: WidgetFieldLabels = {},
): string {
  const aggregation = config?.aggregation ?? "count";
  const metricKey = config?.metricField ?? config?.fieldCode;
  const dimensionKey = config?.dimensionField ?? config?.groupByFieldCode;
  const metric = metricKey
    ? getFieldLabel(
        metricKey,
        fieldLabels[metricKey] ? { label: fieldLabels[metricKey] } : undefined,
      )
    : "";
  const dimension = dimensionKey
    ? getFieldLabel(
        dimensionKey,
        fieldLabels[dimensionKey]
          ? { label: fieldLabels[dimensionKey] }
          : undefined,
      )
    : "";

  if (aggregation === "top") {
    if (config?.sort?.direction === "asc") {
      return `${config.limit ?? ""} giá trị thấp nhất theo ${
        metric || dimension || "dữ liệu"
      }`.trim();
    }
    return `Xếp hạng ${metric || dimension || "dữ liệu"}`;
  }
  if (aggregation === "count") {
    return dimension ? `Số lượng theo ${dimension}` : "Tổng số lượng";
  }
  const prefix = AGGREGATION_LABELS[aggregation] ?? "Thống kê";
  return `${prefix}${metric ? ` ${metric}` : ""}${dimension ? ` theo ${dimension}` : ""}`.trim();
}

export function getWidgetDisplayTitle(widget: DashboardWidget): string {
  const labels = readWidgetFieldLabels(widget.displayConfig);
  const generated = buildWidgetAutoTitle(widget.dataSourceConfig, labels);
  let title = widget.title.trim();
  if (!title) return generated;

  const keys = [
    widget.dataSourceConfig?.metricField,
    widget.dataSourceConfig?.fieldCode,
    widget.dataSourceConfig?.dimensionField,
    widget.dataSourceConfig?.groupByFieldCode,
  ].filter((value): value is string => Boolean(value));
  for (const key of new Set(keys)) {
    const label = getFieldLabel(
      key,
      labels[key] ? { label: labels[key] } : undefined,
    );
    for (const rawVariant of [key, legacyHumanize(key)]) {
      title = title.replace(new RegExp(escapeRegExp(rawVariant), "gi"), label);
    }
  }
  return title || generated;
}

function legacyHumanize(fieldKey: string) {
  return fieldKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
