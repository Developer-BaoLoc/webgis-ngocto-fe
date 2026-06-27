import type { DashboardTemplate } from "@/lib/dashboard/templates";
import type {
  DashboardAiDataPreparationPlan,
  DashboardAiPreparationFilter,
} from "./data-preparation";
import type { DatasetFieldType } from "@/types/api/dataset";
import type { SavedViewFilterOperator } from "@/types/api/saved-view";
import { validateDashboardAiTemplate } from "./validator";

export interface DashboardAiParseResult {
  template?: DashboardTemplate;
  dataPreparationPlan?: DashboardAiDataPreparationPlan;
  errors: string[];
  rawJson?: unknown;
}

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

const savedViewFilterOperators = new Set<SavedViewFilterOperator>([
  "eq",
  "neq",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not_empty",
]);

const datasetFieldTypes = new Set<DatasetFieldType>([
  "text",
  "number",
  "integer",
  "decimal",
  "currency",
  "date",
  "boolean",
  "select",
]);

function normalizeFilter(value: unknown): DashboardAiPreparationFilter | null {
  if (!isRecord(value)) return null;
  const field = typeof value.field === "string" ? value.field.trim() : "";
  if (!field) return null;
  const operator =
    typeof value.operator === "string" &&
    savedViewFilterOperators.has(value.operator as SavedViewFilterOperator)
      ? (value.operator as SavedViewFilterOperator)
      : "eq";
  return {
    field,
    operator,
    ...(value.value !== undefined ? { value: value.value } : {}),
  };
}

function normalizeDatasetFieldType(value: unknown): DatasetFieldType {
  return typeof value === "string" && datasetFieldTypes.has(value as DatasetFieldType)
    ? (value as DatasetFieldType)
    : "text";
}

function normalizeVirtualAggregation(value: unknown): "sum" | "avg" | "count" {
  return value === "avg" || value === "count" ? value : "sum";
}

function normalizeVirtualSourceType(
  value: unknown,
): "layer" | "saved_view" | "dataset" | undefined {
  return value === "layer" || value === "saved_view" || value === "dataset"
    ? value
    : undefined;
}

function normalizePreparationPlan(
  value: unknown,
): DashboardAiDataPreparationPlan | undefined {
  if (!isRecord(value)) return undefined;

  const suggestedSavedViews = Array.isArray(value.suggestedSavedViews)
    ? value.suggestedSavedViews
        .filter(isRecord)
        .map((view) => ({
          tempId:
            typeof view.tempId === "string" && view.tempId.trim()
              ? view.tempId.trim()
              : `saved_view_${Math.random().toString(36).slice(2, 8)}`,
          name:
            typeof view.name === "string" && view.name.trim()
              ? view.name.trim()
              : "Chế độ xem đã lưu được đề xuất",
          ...(typeof view.description === "string"
            ? { description: view.description }
            : {}),
          layerId: typeof view.layerId === "string" ? view.layerId : "",
          filters: Array.isArray(view.filters)
            ? view.filters
                .map(normalizeFilter)
                .filter((filter): filter is DashboardAiPreparationFilter =>
                  Boolean(filter),
                )
            : undefined,
          visibleFields: stringArray(view.visibleFields),
          groupBy: stringArray(view.groupBy),
          metrics: stringArray(view.metrics),
          reason:
            typeof view.reason === "string" && view.reason.trim()
              ? view.reason.trim()
              : "AI đề xuất tạo Saved View để chuẩn bị nguồn dữ liệu.",
        }))
    : undefined;

  const suggestedDatasets = Array.isArray(value.suggestedDatasets)
    ? value.suggestedDatasets
        .filter(isRecord)
        .map((dataset) => {
          const base = {
            tempId:
              typeof dataset.tempId === "string" && dataset.tempId.trim()
                ? dataset.tempId.trim()
                : `dataset_${Math.random().toString(36).slice(2, 8)}`,
            name:
              typeof dataset.name === "string" && dataset.name.trim()
                ? dataset.name.trim()
                : "Dataset đề xuất",
            ...(typeof dataset.description === "string"
              ? { description: dataset.description }
              : {}),
            reason:
              typeof dataset.reason === "string" && dataset.reason.trim()
                ? dataset.reason.trim()
                : "AI đề xuất tạo Dataset để hợp nhất dữ liệu trước khi dựng dashboard.",
          };

          if (dataset.type === "multiSourceMetricDataset") {
            return {
              ...base,
              type: "multiSourceMetricDataset" as const,
              sources: Array.isArray(dataset.sources)
                ? dataset.sources.filter(isRecord).map((source) => ({
                    sourceKey:
                      typeof source.sourceKey === "string" && source.sourceKey.trim()
                        ? source.sourceKey.trim()
                        : `source_${Math.random().toString(36).slice(2, 6)}`,
                    label:
                      typeof source.label === "string" && source.label.trim()
                        ? source.label.trim()
                        : typeof source.sourceLabel === "string"
                          ? source.sourceLabel
                          : "Nguồn",
                    ...(typeof source.sourceId === "string"
                      ? { sourceId: source.sourceId }
                      : {}),
                    ...(normalizeVirtualSourceType(source.sourceType)
                      ? { sourceType: normalizeVirtualSourceType(source.sourceType) }
                      : {}),
                    ...(typeof source.metricField === "string"
                      ? { metricField: source.metricField }
                      : {}),
                    aggregation: normalizeVirtualAggregation(source.aggregation),
                  }))
                : [],
            };
          }

          return {
            ...base,
            type: "dataset" as const,
            fields: Array.isArray(dataset.fields)
              ? dataset.fields.filter(isRecord).map((field) => ({
                  key: typeof field.key === "string" ? field.key : "",
                  label: typeof field.label === "string" ? field.label : "",
                  type: normalizeDatasetFieldType(field.type),
                }))
              : [],
            sources: Array.isArray(dataset.sources)
              ? dataset.sources.filter(isRecord).map((source) => ({
                  ...(typeof source.savedViewTempId === "string"
                    ? { savedViewTempId: source.savedViewTempId }
                    : {}),
                  ...(typeof source.viewId === "string"
                    ? { viewId: source.viewId }
                    : {}),
                  sourceLabel:
                    typeof source.sourceLabel === "string"
                      ? source.sourceLabel
                      : "Nguồn dữ liệu",
                  mapping: isRecord(source.mapping)
                    ? Object.fromEntries(
                        Object.entries(source.mapping).filter(
                          (entry): entry is [string, string] =>
                            typeof entry[1] === "string",
                        ),
                      )
                    : {},
                }))
              : [],
            groupBy: stringArray(dataset.groupBy),
            metrics: stringArray(dataset.metrics),
          };
        })
    : undefined;

  const plan: DashboardAiDataPreparationPlan = {
    suggestedSavedViews,
    suggestedDatasets,
    filters: Array.isArray(value.filters)
      ? value.filters
          .map(normalizeFilter)
          .filter((filter): filter is DashboardAiPreparationFilter =>
            Boolean(filter),
          )
      : undefined,
    groupBy: stringArray(value.groupBy),
    metrics: stringArray(value.metrics),
    reason: typeof value.reason === "string" ? value.reason : undefined,
  };

  const hasPlan =
    (plan.suggestedSavedViews?.length ?? 0) > 0 ||
    (plan.suggestedDatasets?.length ?? 0) > 0 ||
    (plan.filters?.length ?? 0) > 0 ||
    (plan.groupBy?.length ?? 0) > 0 ||
    (plan.metrics?.length ?? 0) > 0 ||
    Boolean(plan.reason);

  return hasPlan ? plan : undefined;
}

export function parseDashboardTemplateResponse(
  responseText: string,
): DashboardAiParseResult {
  try {
    const rawJson = JSON.parse(stripCodeFence(responseText));
    const envelope = isRecord(rawJson) && isRecord(rawJson.template);
    const validation = validateDashboardAiTemplate(
      envelope ? rawJson.template : rawJson,
    );
    return {
      rawJson,
      template: validation.template,
      dataPreparationPlan: envelope
        ? normalizePreparationPlan(rawJson.dataPreparationPlan)
        : undefined,
      errors: validation.errors,
    };
  } catch (err) {
    return {
      errors: [
        err instanceof Error
          ? `JSON không hợp lệ: ${err.message}`
          : "JSON không hợp lệ.",
      ],
    };
  }
}
