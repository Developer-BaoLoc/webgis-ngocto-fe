"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClass } from "@/components/form/field-wrapper";
import { OperationalWidgetMappingFields } from "@/components/admin/operational-widget-mapping-fields";
import { previewAnalytics } from "@/lib/api/analytics";
import {
  advancedQueryToDataSourceConfig,
  buildAdvancedQueryFromSimpleConfig,
  normalizeAdvancedQueryConfig,
  resolveTimeRangeForPreset,
} from "@/lib/dashboard/advanced-query";
import {
  buildWidgetAutoTitle,
  getWidgetDisplayTitle,
  readWidgetFieldLabels,
} from "@/lib/dashboard/widget-labels";
import {
  AGGREGATION_LABELS,
  formatWidgetValue,
  formatWidgetValueParts,
  GROUPABLE_FIELD_TYPES,
  getWidgetValueUnit,
  NUMERIC_FIELD_TYPES,
  WIDGET_TYPE_LABELS,
} from "@/lib/dashboard/utils";
import { getFieldLabel, getOptionLabel } from "@/lib/fields/field-label";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  isTopAnalyticsResult,
} from "@/types/api/dashboard";
import type {
  AdvancedHavingRule,
  AnalyticsResult,
  AdvancedQueryRule,
  AdvancedQueryConfig,
  AnalyticsFilter,
  AggregationType,
  DashboardWidget,
  DataSourceLayer,
  QueryMode,
  TimeCompareMode,
  TimePreset,
  WidgetType,
} from "@/types/api/dashboard";
import type { SavedView } from "@/types/api/saved-view";
import type { Dataset } from "@/types/api/dataset";

type AdvancedFilterOperator = NonNullable<AnalyticsFilter["operator"]>;

interface AdvancedFilterFormRow {
  id: string;
  fieldCode: string;
  operator: AdvancedFilterOperator;
  value?: unknown;
}

type AdvancedHavingOperator = AdvancedHavingRule["operator"];
const FORMULA_FIELD_CODE = "__formula";

interface AdvancedHavingFormRow {
  id: string;
  field: string;
  aggregation: AggregationType;
  operator: AdvancedHavingOperator;
  value: string;
}

export interface WidgetFormState {
  widgetType: WidgetType;
  title: string;
  description: string;
  viewId: string;
  datasetId: string;
  layerId: string;
  sourceName: string;
  queryMode: QueryMode;
  advancedSourceType: "dataset" | "view" | "layer";
  advancedSourceId: string;
  advancedSortField: string;
  advancedSortDirection: "asc" | "desc";
  advancedFilters: AdvancedFilterFormRow[];
  advancedHavingFilters: AdvancedHavingFormRow[];
  advancedFormulaEnabled: boolean;
  advancedFormulaLabel: string;
  advancedFormulaUnit: string;
  advancedFormulaExpression: string;
  advancedTimeEnabled: boolean;
  advancedTimeDateField: string;
  advancedTimePreset: TimePreset;
  advancedTimeCustomFrom: string;
  advancedTimeCustomTo: string;
  advancedTimeCompare: TimeCompareMode;
  aggregation: AggregationType;
  metricField: string;
  dimensionField: string;
  limit: number;
  displayFields: string[];
  fieldLabels: Record<string, string>;
  titleField: string;
  descriptionField: string;
  startDateField: string;
  dateField: string;
  endDateField: string;
  statusField: string;
  groupField: string;
  typeField: string;
  severityField: string;
  areaField: string;
  progressField: string;
  ownerField: string;
  deadlineField: string;
  resultField: string;
  metricFields: string[];
  suffix: string;
  icon: string;
  theme: string;
  renderVariant: string;
  rankingMode: "top" | "bottom";
  rankingNameField: string;
  rankingTypeField: string;
  rankingSort: "asc" | "desc";
  showMedal: boolean;
  showProgressBar: boolean;
  unit: string;
  target: number;
  showLegend: boolean;
  showBoundary: boolean;
  autoFitBounds: boolean;
  interactive: boolean;
  colorField: string;
  seasonalMode: "month" | "quarter";
  minimapLayerMode: "visible" | "all" | "default";
  spatialSourceLayerId: string;
  spatialZoneLayerId: string;
  spatialZoneLabelField: string;
  spatialMetricAggregation: "count" | "sum" | "avg" | "min" | "max";
  spatialMetricField: string;
  content: string;
  layoutW: number;
  layoutH: number;
}

export function emptyWidgetForm(): WidgetFormState {
  return {
    widgetType: "stat",
    title: "",
    description: "",
    viewId: "",
    datasetId: "",
    layerId: "",
    sourceName: "",
    queryMode: "simple",
    advancedSourceType: "dataset",
    advancedSourceId: "",
    advancedSortField: "",
    advancedSortDirection: "desc",
    advancedFilters: [],
    advancedHavingFilters: [],
    advancedFormulaEnabled: false,
    advancedFormulaLabel: "",
    advancedFormulaUnit: "",
    advancedFormulaExpression: "",
    advancedTimeEnabled: false,
    advancedTimeDateField: "",
    advancedTimePreset: "this_month",
    advancedTimeCustomFrom: "",
    advancedTimeCustomTo: "",
    advancedTimeCompare: "none",
    aggregation: "count",
    metricField: "",
    dimensionField: "",
    limit: 20,
    displayFields: [],
    fieldLabels: {},
    titleField: "",
    descriptionField: "",
    startDateField: "",
    dateField: "",
    endDateField: "",
    statusField: "",
    groupField: "",
    typeField: "",
    severityField: "",
    areaField: "",
    progressField: "",
    ownerField: "",
    deadlineField: "",
    resultField: "",
    metricFields: [],
    suffix: "",
    icon: "auto",
    theme: "sky",
    renderVariant: "default",
    rankingMode: "top",
    rankingNameField: "",
    rankingTypeField: "",
    rankingSort: "desc",
    showMedal: true,
    showProgressBar: true,
    unit: "",
    target: 100,
    showLegend: true,
    showBoundary: true,
    autoFitBounds: true,
    interactive: false,
    colorField: "",
    seasonalMode: "month",
    minimapLayerMode: "visible",
    spatialSourceLayerId: "",
    spatialZoneLayerId: "",
    spatialZoneLabelField: "",
    spatialMetricAggregation: "count",
    spatialMetricField: "",
    content: "",
    layoutW: 3,
    layoutH: 2,
  };
}

export function widgetToForm(widget: DashboardWidget): WidgetFormState {
  const advancedQuery =
    widget.dataSourceConfig?.queryMode === "advanced"
      ? normalizeAdvancedQueryConfig(widget.dataSourceConfig.advancedQuery)
      : null;
  const sort = advancedQuery?.sort?.[0] ?? widget.dataSourceConfig?.sort;
  return {
    widgetType: widget.widgetType,
    title: getWidgetDisplayTitle(widget),
    description: String(widget.displayConfig?.description ?? ""),
    viewId: widget.dataSourceConfig?.viewId ?? "",
    datasetId: widget.dataSourceConfig?.datasetId ?? "",
    layerId: widget.dataSourceConfig?.layerId ?? "",
    sourceName: widget.dataSourceConfig?.name ?? "",
    queryMode: advancedQuery ? "advanced" : "simple",
    advancedSourceType: advancedQuery?.source.type ?? "dataset",
    advancedSourceId: advancedQuery?.source.id ?? "",
    advancedSortField: sort?.field ?? "",
    advancedSortDirection: sort?.direction ?? "desc",
    advancedFilters:
      advancedQuery?.filter?.rules.map((rule, index) => ({
        id: `filter-${index}-${rule.fieldCode}`,
        fieldCode: rule.fieldCode,
        operator: rule.operator,
        value: rule.value,
      })) ?? [],
    advancedHavingFilters:
      advancedQuery?.having?.rules.map((rule, index) => ({
        id: `having-${index}-${rule.field}`,
        field: rule.field,
        aggregation: rule.aggregation,
        operator: rule.operator,
        value: String(rule.value),
      })) ?? [],
    advancedFormulaEnabled: advancedQuery?.formula?.enabled === true,
    advancedFormulaLabel: advancedQuery?.formula?.label ?? "",
    advancedFormulaUnit: advancedQuery?.formula?.unit ?? "",
    advancedFormulaExpression: advancedQuery?.formula?.expression ?? "",
    advancedTimeEnabled: advancedQuery?.time?.enabled === true,
    advancedTimeDateField: advancedQuery?.time?.dateField ?? "",
    advancedTimePreset: advancedQuery?.time?.preset ?? "this_month",
    advancedTimeCustomFrom: advancedQuery?.time?.customFrom ?? "",
    advancedTimeCustomTo: advancedQuery?.time?.customTo ?? "",
    advancedTimeCompare: advancedQuery?.time?.compare ?? "none",
    aggregation:
      advancedQuery?.select.aggregation ??
      widget.dataSourceConfig?.aggregation ??
      "count",
    metricField:
      (advancedQuery?.formula?.enabled ? FORMULA_FIELD_CODE : undefined) ??
      advancedQuery?.select.metricField ??
      widget.dataSourceConfig?.metricField ??
      widget.dataSourceConfig?.fieldCode ??
      "",
    dimensionField:
      advancedQuery?.select.dimensionField ??
      widget.dataSourceConfig?.dimensionField ??
      widget.dataSourceConfig?.groupByFieldCode ??
      "",
    limit: advancedQuery?.limit ?? widget.dataSourceConfig?.limit ?? 20,
    displayFields:
      advancedQuery?.select.displayFields ??
      widget.dataSourceConfig?.displayFields ??
      [],
    fieldLabels: readWidgetFieldLabels(widget.displayConfig),
    titleField: widget.dataSourceConfig?.titleField ?? "",
    descriptionField: widget.dataSourceConfig?.descriptionField ?? "",
    startDateField: widget.dataSourceConfig?.startDateField ?? "",
    dateField: widget.dataSourceConfig?.dateField ?? "",
    endDateField: widget.dataSourceConfig?.endDateField ?? "",
    statusField: widget.dataSourceConfig?.statusField ?? "",
    groupField: widget.dataSourceConfig?.groupField ?? "",
    typeField: widget.dataSourceConfig?.typeField ?? "",
    severityField: widget.dataSourceConfig?.severityField ?? "",
    areaField: widget.dataSourceConfig?.areaField ?? "",
    progressField: widget.dataSourceConfig?.progressField ?? "",
    ownerField: widget.dataSourceConfig?.ownerField ?? "",
    deadlineField: widget.dataSourceConfig?.deadlineField ?? "",
    resultField: widget.dataSourceConfig?.resultField ?? "",
    metricFields: widget.dataSourceConfig?.metricFields ?? [],
    suffix: String(widget.displayConfig?.suffix ?? ""),
    icon: String(widget.displayConfig?.icon ?? "auto"),
    theme: String(widget.displayConfig?.theme ?? "sky"),
    renderVariant: String(widget.displayConfig?.variant ?? "default"),
    rankingMode:
      widget.displayConfig?.rankingMode === "bottom" ||
      widget.displayConfig?.sort === "asc"
        ? "bottom"
        : "top",
    rankingNameField: String(
      widget.displayConfig?.nameField ??
        widget.displayConfig?.labelField ??
        widget.dataSourceConfig?.dimensionField ??
        "",
    ),
    rankingTypeField: String(widget.displayConfig?.typeField ?? ""),
    rankingSort: widget.displayConfig?.sort === "asc" ? "asc" : "desc",
    showMedal: widget.displayConfig?.showMedal !== false,
    showProgressBar: widget.displayConfig?.showProgressBar !== false,
    unit: String(widget.displayConfig?.unit ?? ""),
    target: Number(widget.displayConfig?.target ?? 100),
    showLegend: widget.displayConfig?.showLegend !== false,
    showBoundary: widget.displayConfig?.showBoundary !== false,
    autoFitBounds: widget.displayConfig?.autoFitBounds !== false,
    interactive: widget.displayConfig?.interactive === true,
    colorField: String(widget.displayConfig?.colorField ?? ""),
    seasonalMode:
      widget.displayConfig?.mode === "quarter" ? "quarter" : "month",
    minimapLayerMode:
      widget.displayConfig?.layerMode === "all" ||
      widget.displayConfig?.layerMode === "default"
        ? widget.displayConfig.layerMode
        : "visible",
    spatialSourceLayerId: String(
      widget.dataSourceConfig?.spatial?.sourceLayerId ?? "",
    ),
    spatialZoneLayerId: String(
      widget.dataSourceConfig?.spatial?.zoneLayerId ?? "",
    ),
    spatialZoneLabelField: String(
      widget.dataSourceConfig?.spatial?.zoneLabelField ?? "",
    ),
    spatialMetricAggregation:
      widget.dataSourceConfig?.spatial?.metricAggregation ?? "count",
    spatialMetricField: String(
      widget.dataSourceConfig?.spatial?.metricField ?? "",
    ),
    content: String(widget.displayConfig?.content ?? ""),
    layoutW: widget.layoutConfig.w,
    layoutH: widget.layoutConfig.h,
  };
}

const OPERATIONAL_WIDGET_TYPES = new Set<WidgetType>([
  "timeline",
  "calendar",
  "progress",
  "milestone",
  "activity_history",
  "activity_feed",
  "alert_center",
  "spatial_summary",
  "spatial_ranking",
  "thematic_map",
  "spatial_alert",
  "seasonal_calendar",
]);

function isOperationalWidgetType(widgetType: WidgetType) {
  return OPERATIONAL_WIDGET_TYPES.has(widgetType);
}

export function isSpatialWidgetType(widgetType: WidgetType) {
  return (
    widgetType === "spatial_summary" ||
    widgetType === "spatial_ranking" ||
    widgetType === "thematic_map" ||
    widgetType === "spatial_alert"
  );
}

function isPolygonGeometryType(geometryType?: string | null) {
  return ["polygon", "multipolygon", "area_polygon"].includes(
    String(geometryType ?? "").toLowerCase(),
  );
}

export function validateSpatialWidgetForm(
  form: WidgetFormState,
  dataSources: DataSourceLayer[],
) {
  if (!isSpatialWidgetType(form.widgetType)) return "";
  if (!form.spatialSourceLayerId) return "Chọn Layer nguồn trước khi xem trước.";
  if (!form.spatialZoneLayerId) return "Chọn Layer phân vùng trước khi xem trước.";
  const sourceLayer = dataSources.find(
    (source) => source.layerId === form.spatialSourceLayerId,
  );
  const zoneLayer = dataSources.find(
    (source) => source.layerId === form.spatialZoneLayerId,
  );
  if (String(sourceLayer?.geometryType ?? "").toLowerCase() === "none") {
    return "Layer nguồn chưa có hình học.";
  }
  if (!isPolygonGeometryType(zoneLayer?.geometryType)) {
    return "Layer phân vùng phải là kiểu vùng.";
  }
  if (
    form.spatialMetricAggregation !== "count" &&
    !form.spatialMetricField
  ) {
    return "Chọn trường metric cho tổng/tính trung bình.";
  }
  return "";
}

function spatialModeForWidget(widgetType: WidgetType) {
  if (widgetType === "spatial_ranking") return "ranking" as const;
  if (widgetType === "thematic_map") return "thematic_map" as const;
  if (widgetType === "spatial_alert") return "alert" as const;
  return "summary" as const;
}

const ADVANCED_DIMENSION_WIDGET_TYPES = new Set<WidgetType>([
  "bar",
  "pie",
  "donut",
  "line",
  "treemap",
  "ranking",
]);

const ADVANCED_AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: "Đếm",
  sum: "Tổng",
  avg: "Trung bình",
  min: "Nhỏ nhất",
  max: "Lớn nhất",
  top: "Xếp hạng / Top",
  records: "Danh sách bản ghi",
};

function requiresAdvancedDimension(widgetType: WidgetType) {
  return ADVANCED_DIMENSION_WIDGET_TYPES.has(widgetType);
}

const TEXT_FILTER_OPERATORS: AdvancedFilterOperator[] = [
  "eq",
  "neq",
  "in",
  "contains",
  "not_contains",
  "empty",
  "not_empty",
];

const NUMBER_FILTER_OPERATORS: AdvancedFilterOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not_empty",
];

const DATE_FILTER_OPERATORS: AdvancedFilterOperator[] = [
  "eq",
  "gte",
  "lte",
  "empty",
  "not_empty",
];

const FILTER_OPERATOR_LABELS: Record<AdvancedFilterOperator, string> = {
  eq: "Bằng",
  neq: "Khác",
  in: "Thuộc một trong",
  contains: "Chứa",
  not_contains: "Không chứa",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  empty: "Trống",
  not_empty: "Không trống",
};

const FILTER_SUMMARY_LABELS: Record<AdvancedFilterOperator, string> = {
  eq: "bằng",
  neq: "khác",
  in: "thuộc một trong",
  contains: "chứa",
  not_contains: "không chứa",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  empty: "trống",
  not_empty: "không trống",
};

const HAVING_OPERATOR_LABELS: Record<AdvancedHavingOperator, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  neq: "!=",
};

const TIME_PRESET_LABELS: Record<TimePreset, string> = {
  today: "Hôm nay",
  this_week: "Tuần này",
  this_month: "Tháng này",
  this_quarter: "Quý này",
  this_year: "Năm nay",
  last_7_days: "7 ngày gần nhất",
  last_30_days: "30 ngày gần nhất",
  last_90_days: "90 ngày gần nhất",
  custom: "Tùy chọn",
};

const TIME_COMPARE_LABELS: Record<TimeCompareMode, string> = {
  none: "Không so sánh",
  previous_period: "So với kỳ trước",
  same_period_last_year: "So với cùng kỳ năm trước",
};

function createAdvancedFilterRow(): AdvancedFilterFormRow {
  return {
    id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fieldCode: "",
    operator: "eq",
    value: "",
  };
}

function createAdvancedHavingRow(form: WidgetFormState): AdvancedHavingFormRow {
  return {
    id: `having-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field: form.metricField,
    aggregation: form.aggregation,
    operator: "gt",
    value: "",
  };
}

function isDateFieldType(fieldType?: string) {
  return fieldType === "date" || fieldType === "datetime";
}

function isTimeFieldType(fieldType?: string) {
  return (
    fieldType === "date" ||
    fieldType === "datetime" ||
    fieldType === "timestamp" ||
    fieldType === "text" ||
    fieldType === "string"
  );
}

function getFilterOperatorsForField(field?: FieldOption): AdvancedFilterOperator[] {
  if (!field) return TEXT_FILTER_OPERATORS;
  if (NUMERIC_FIELD_TYPES.has(field.fieldType)) return NUMBER_FILTER_OPERATORS;
  if (isDateFieldType(field.fieldType)) return DATE_FILTER_OPERATORS;
  return TEXT_FILTER_OPERATORS;
}

function filterOperatorNeedsValue(operator: AdvancedFilterOperator) {
  return operator !== "empty" && operator !== "not_empty";
}

function isFilterValuePresent(
  operator: AdvancedFilterOperator,
  value: unknown,
) {
  if (!filterOperatorNeedsValue(operator)) return true;
  if (operator === "in") return Array.isArray(value) && value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeFilterValue(
  operator: AdvancedFilterOperator,
  value: unknown,
) {
  if (!filterOperatorNeedsValue(operator)) return undefined;
  if (operator === "in") {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

function getValidAdvancedHavingRules(
  filters: AdvancedHavingFormRow[],
): AdvancedHavingRule[] {
  return filters
    .map((filter) => {
      const value = Number(filter.value);
      if (
        !filter.field ||
        !filter.operator ||
        !Number.isFinite(value)
      ) {
        return null;
      }
      return {
        field: filter.field,
        aggregation: filter.aggregation,
        operator: filter.operator,
        value,
      };
    })
    .filter((rule): rule is AdvancedHavingRule => Boolean(rule));
}

function tokenizeFormulaExpression(expression: string) {
  return expression.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[+\-*/()]/g) ?? [];
}

function getFormulaFieldCodes(expression: string) {
  return Array.from(
    new Set(
      tokenizeFormulaExpression(expression).filter((token) =>
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(token),
      ),
    ),
  );
}

function getFormulaValidationError(
  form: WidgetFormState,
  numericFields: FieldOption[],
) {
  if (!form.advancedFormulaEnabled) return "";
  if (!form.advancedFormulaLabel.trim()) return "Nhập tên chỉ số công thức.";
  if (!form.advancedFormulaExpression.trim()) return "Nhập công thức chỉ số.";
  const compactTokens = tokenizeFormulaExpression(
    form.advancedFormulaExpression,
  ).join("");
  const compactExpression = form.advancedFormulaExpression.replace(/\s+/g, "");
  if (compactTokens !== compactExpression) {
    return "Công thức chỉ được chứa field key, số, toán tử + - * / và ngoặc.";
  }
  const numericCodes = new Set(numericFields.map((field) => field.code));
  const unknownField = getFormulaFieldCodes(form.advancedFormulaExpression).find(
    (field) => !numericCodes.has(field),
  );
  if (unknownField) {
    return `Field ${unknownField} không thuộc danh sách trường số của nguồn dữ liệu.`;
  }
  return "";
}

function getFormulaWarning(form: WidgetFormState) {
  if (
    form.advancedFormulaEnabled &&
    /\/\s*[A-Za-z_][A-Za-z0-9_]*/.test(form.advancedFormulaExpression)
  ) {
    return "Nếu mẫu số bằng 0, dòng dữ liệu đó sẽ được bỏ qua khi tổng hợp.";
  }
  return "";
}

function getTimeValidationError(form: WidgetFormState) {
  if (!form.advancedTimeEnabled) return "";
  if (!form.advancedTimeDateField) return "Chọn trường ngày cho lọc thời gian.";
  if (form.advancedTimePreset !== "custom") return "";
  if (!form.advancedTimeCustomFrom || !form.advancedTimeCustomTo) {
    return "Nhập đủ Từ ngày và Đến ngày cho khoảng thời gian tùy chọn.";
  }
  if (form.advancedTimeCustomFrom > form.advancedTimeCustomTo) {
    return "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.";
  }
  return "";
}

function getTimeSummary(form: WidgetFormState, fieldLabel: string) {
  if (!form.advancedTimeEnabled) return "Không lọc thời gian.";
  const range = resolveTimeRangeForPreset(
    form.advancedTimePreset,
    form.advancedTimeCustomFrom,
    form.advancedTimeCustomTo,
  );
  const rangeText = range
    ? ` (Từ ${formatDateLabel(range.from)} đến ${formatDateLabel(range.to)})`
    : "";
  return `${TIME_PRESET_LABELS[form.advancedTimePreset]} theo ${
    fieldLabel || "trường ngày chưa chọn"
  }${rangeText}`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return value;
}

function getValidAdvancedFilterRules(
  filters: AdvancedFilterFormRow[],
): AdvancedQueryRule[] {
  return filters
    .map((filter) => {
      const value = normalizeFilterValue(filter.operator, filter.value);
      if (
        !filter.fieldCode ||
        !filter.operator ||
        !isFilterValuePresent(filter.operator, value)
      ) {
        return null;
      }
      return {
        fieldCode: filter.fieldCode,
        operator: filter.operator,
        ...(filterOperatorNeedsValue(filter.operator) ? { value } : {}),
      };
    })
    .filter((rule): rule is AdvancedQueryRule => Boolean(rule));
}

function readOptionValue(option: unknown) {
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return option;
  }
  const record = option as Record<string, unknown>;
  return record.value ?? record.code ?? record.key ?? record.id ?? record.label;
}

function readOptionCandidates(field?: FieldOption) {
  const dataSchema = field?.dataSchema;
  const uiSchema = field?.uiSchema;
  const candidates = [
    field?.options,
    field?.values,
    field?.dictionaryItems,
    field?.enum,
    dataSchema?.options,
    dataSchema?.values,
    dataSchema?.dictionaryItems,
    dataSchema?.enum,
    uiSchema?.options,
    uiSchema?.values,
  ];
  return candidates.find((candidate) => Array.isArray(candidate));
}

function getFieldValueOptions(field?: FieldOption) {
  if (field?.fieldType === "boolean") {
    return [
      { value: "true", label: "Có" },
      { value: "false", label: "Không" },
    ];
  }
  const candidate = readOptionCandidates(field);
  if (!Array.isArray(candidate) || !field) return [];
  return candidate
    .map((item) => {
      const value = readOptionValue(item);
      if (value === undefined || value === null || value === "") return null;
      const valueText = String(value);
      return {
        value: valueText,
        label: getOptionLabel(field.code, valueText, field),
      };
    })
    .filter((item): item is { value: string; label: string } => Boolean(item));
}

function formatFilterValue(
  field: FieldOption | undefined,
  operator: AdvancedFilterOperator,
  value: unknown,
) {
  if (!filterOperatorNeedsValue(operator)) return "";
  const values = operator === "in" && Array.isArray(value) ? value : [value];
  return values
    .map((item) => getOptionLabel(field?.code ?? "", item, field))
    .join(", ");
}

function getFilterWarning(
  filter: AdvancedFilterFormRow,
  field?: FieldOption,
) {
  if (!filter.fieldCode) return "Chọn trường cho điều kiện lọc.";
  if (!field) return "Trường lọc không còn tồn tại trong nguồn dữ liệu.";
  if (!filter.operator) return "Chọn toán tử cho điều kiện lọc.";
  if (
    !isFilterValuePresent(
      filter.operator,
      normalizeFilterValue(filter.operator, filter.value),
    )
  ) {
    return "Nhập hoặc chọn giá trị lọc.";
  }
  return "";
}

function formatFilterSummary(filter: AdvancedFilterFormRow, field?: FieldOption) {
  const fieldLabel = field?.label ?? "Trường chưa chọn";
  const operatorLabel = FILTER_SUMMARY_LABELS[filter.operator];
  const valueLabel = formatFilterValue(
    field,
    filter.operator,
    normalizeFilterValue(filter.operator, filter.value),
  );
  return valueLabel
    ? `${fieldLabel} ${operatorLabel} ${valueLabel}`
    : `${fieldLabel} ${operatorLabel}`;
}

function getHavingWarning(filter: AdvancedHavingFormRow) {
  if (!filter.field) return "Chọn trường chỉ số trước khi lọc kết quả.";
  if (!filter.operator) return "Chọn toán tử lọc kết quả.";
  if (filter.value === "" || !Number.isFinite(Number(filter.value))) {
    return "Nhập giá trị số để lọc kết quả.";
  }
  return "";
}

function formatHavingSummary(
  filter: AdvancedHavingFormRow,
  field?: FieldOption,
) {
  const fieldLabel = field?.label ?? "Chỉ số chưa chọn";
  return `${ADVANCED_AGGREGATION_LABELS[filter.aggregation]} ${fieldLabel} ${
    HAVING_OPERATOR_LABELS[filter.operator]
  } ${filter.value || "..."}`;
}

function buildOperationalDataSourceConfig(form: WidgetFormState) {
  const common = {
    ...(form.titleField ? { titleField: form.titleField } : {}),
    ...(form.statusField ? { statusField: form.statusField } : {}),
    limit: form.limit,
  };
  const byType =
    form.widgetType === "timeline"
      ? {
          startDateField: form.startDateField,
          ...(form.endDateField ? { endDateField: form.endDateField } : {}),
          ...(form.groupField ? { groupField: form.groupField } : {}),
          sort: { field: form.startDateField, direction: "asc" as const },
        }
      : form.widgetType === "calendar"
        ? {
            dateField: form.dateField,
            ...(form.endDateField ? { endDateField: form.endDateField } : {}),
            ...(form.typeField ? { typeField: form.typeField } : {}),
            sort: { field: form.dateField, direction: "asc" as const },
          }
        : form.widgetType === "progress"
          ? {
              progressField: form.progressField,
              ...(form.ownerField ? { ownerField: form.ownerField } : {}),
              ...(form.deadlineField
                ? {
                    deadlineField: form.deadlineField,
                    sort: {
                      field: form.deadlineField,
                      direction: "asc" as const,
                    },
                  }
                : {}),
            }
          : form.widgetType === "milestone"
            ? {
                resultField: form.resultField,
                progressField: form.progressField,
                metricFields: form.metricFields,
              }
            : form.widgetType === "seasonal_calendar"
              ? {
                  startDateField: form.startDateField,
                  ...(form.endDateField
                    ? { endDateField: form.endDateField }
                    : {}),
                  ...(form.typeField ? { typeField: form.typeField } : {}),
                  ...(form.groupField ? { groupField: form.groupField } : {}),
                  sort: {
                    field: form.startDateField,
                    direction: "asc" as const,
                  },
                }
              : form.widgetType === "alert_center"
                ? {
                    dateField: form.dateField,
                    ...(form.severityField
                      ? { severityField: form.severityField }
                      : {}),
                    ...(form.areaField ? { areaField: form.areaField } : {}),
                    sort: {
                      field: form.dateField,
                      direction: "desc" as const,
                    },
                  }
              : {
                  descriptionField: form.descriptionField,
                  dateField: form.dateField,
                  ...(form.severityField
                    ? { severityField: form.severityField }
                    : {}),
                  ...(form.typeField ? { typeField: form.typeField } : {}),
                  sort: { field: form.dateField, direction: "desc" as const },
                };
  const displayFields = Array.from(
    new Set(
      Object.entries({ ...common, ...byType })
        .flatMap(([key, value]) => {
          if (key === "metricFields" && Array.isArray(value)) return value;
          return typeof value === "string" ? [value] : [];
        })
        .filter(Boolean),
    ),
  );
  return { ...common, ...byType, displayFields };
}

function buildSimpleDataSourceConfig(form: WidgetFormState) {
  const isOperational = isOperationalWidgetType(form.widgetType);
  if (isSpatialWidgetType(form.widgetType)) {
    const mode = spatialModeForWidget(form.widgetType);
    return {
      ...(form.sourceName ? { name: form.sourceName } : {}),
      layerId: form.spatialSourceLayerId,
      aggregation: mode === "ranking" ? ("top" as const) : ("records" as const),
      metricField: form.spatialMetricField || "value",
      dimensionField: "area",
      displayFields:
        mode === "alert"
          ? ["title", "area", "severity", "value"]
          : ["area", "value"],
      limit: form.limit,
      sort: { field: "value", direction: "desc" as const },
      spatial: {
        mode,
        sourceLayerId: form.spatialSourceLayerId,
        zoneLayerId: form.spatialZoneLayerId,
        ...(form.spatialZoneLabelField
          ? { zoneLabelField: form.spatialZoneLabelField }
          : {}),
        metricAggregation: form.spatialMetricAggregation,
        ...(form.spatialMetricField
          ? { metricField: form.spatialMetricField }
          : {}),
        limit: form.limit,
      },
    };
  }
  const needsDimension =
    !isOperational &&
    (form.aggregation === "top" ||
      form.widgetType === "ranking" ||
      form.widgetType === "treemap" ||
      form.widgetType === "bar" ||
      form.widgetType === "pie" ||
      form.widgetType === "donut" ||
      form.widgetType === "line" ||
      form.widgetType === "table");

  const topDisplayFields = Array.from(
    new Set([
      ...form.displayFields,
      ...(form.rankingNameField ? [form.rankingNameField] : []),
      ...(form.rankingTypeField ? [form.rankingTypeField] : []),
      ...(form.dimensionField ? [form.dimensionField] : []),
      ...(form.metricField ? [form.metricField] : []),
    ]),
  );

  return {
    ...(form.viewId ? { viewId: form.viewId } : {}),
    ...(form.datasetId ? { datasetId: form.datasetId } : {}),
    ...(!form.datasetId && !form.viewId && form.layerId
      ? { layerId: form.layerId }
      : {}),
    ...(form.sourceName ? { name: form.sourceName } : {}),
    aggregation: isOperational ? ("records" as const) : form.aggregation,
    ...(!isOperational && form.metricField && form.aggregation !== "count"
      ? { metricField: form.metricField }
      : {}),
    ...(needsDimension && form.dimensionField
      ? { dimensionField: form.dimensionField }
      : {}),
    ...(needsDimension ? { limit: form.limit } : {}),
    ...(!isOperational && form.aggregation === "top" && form.metricField
      ? {
          sort: {
            field: form.metricField,
            direction: form.rankingMode === "bottom" ? "asc" : "desc",
          },
          limit: form.limit,
          ...(topDisplayFields.length > 0
            ? { displayFields: topDisplayFields }
            : {}),
        }
      : {}),
    ...(isOperational ? buildOperationalDataSourceConfig(form) : {}),
  };
}

function buildAdvancedQueryFromForm(
  form: WidgetFormState,
): AdvancedQueryConfig | null {
  if (!form.advancedSourceId) return null;
  const filterRules = getValidAdvancedFilterRules(form.advancedFilters);
  const havingRules = getValidAdvancedHavingRules(form.advancedHavingFilters);
  const formulaFields = form.advancedFormulaEnabled
    ? getFormulaFieldCodes(form.advancedFormulaExpression)
    : [];
  const metricField = form.advancedFormulaEnabled
    ? FORMULA_FIELD_CODE
    : form.metricField;
  const isRankingQuery = form.widgetType === "ranking" || form.aggregation === "top";
  const rankingSortField = isRankingQuery ? metricField : form.advancedSortField;
  const displayFields = Array.from(
    new Set([
      ...form.displayFields,
      ...(form.rankingNameField ? [form.rankingNameField] : []),
      ...(form.rankingTypeField ? [form.rankingTypeField] : []),
      ...(form.dimensionField ? [form.dimensionField] : []),
      ...(metricField ? [metricField] : []),
    ]),
  );
  return {
    version: 1,
    source: {
      type: form.advancedSourceType,
      id: form.advancedSourceId,
    },
    select: {
      aggregation: isRankingQuery ? "top" : form.aggregation,
      ...(metricField ? { metricField } : {}),
      ...(form.dimensionField ? { dimensionField: form.dimensionField } : {}),
      ...(displayFields.length > 0 ? { displayFields } : {}),
    },
    ...(form.advancedFormulaEnabled
      ? {
          formula: {
            enabled: true,
            label: form.advancedFormulaLabel.trim(),
            ...(form.advancedFormulaUnit.trim()
              ? { unit: form.advancedFormulaUnit.trim() }
              : {}),
            expression: form.advancedFormulaExpression.trim(),
            fields: formulaFields,
          },
        }
      : {}),
    ...(form.advancedTimeEnabled
      ? {
          time: {
            enabled: true,
            dateField: form.advancedTimeDateField,
            preset: form.advancedTimePreset,
            ...(form.advancedTimePreset === "custom"
              ? {
                  customFrom: form.advancedTimeCustomFrom,
                  customTo: form.advancedTimeCustomTo,
                }
              : {}),
            compare: form.advancedTimeCompare,
          },
        }
      : {}),
    ...(rankingSortField
      ? {
          sort: [
            {
              field: rankingSortField,
              direction: isRankingQuery
                ? form.rankingMode === "bottom"
                  ? "asc"
                  : "desc"
                : form.advancedSortDirection,
            },
          ],
        }
      : {}),
    ...(filterRules.length > 0
      ? {
          filter: {
            combinator: "and" as const,
            rules: filterRules,
          },
        }
      : {}),
    ...(havingRules.length > 0
      ? {
          having: {
            combinator: "and" as const,
            rules: havingRules,
          },
        }
      : {}),
    limit: form.limit,
  };
}

function buildAdvancedDataSourceConfig(form: WidgetFormState) {
  const advancedQuery = buildAdvancedQueryFromForm(form);
  if (!advancedQuery) return buildSimpleDataSourceConfig(form);
  return advancedQueryToDataSourceConfig({
    ...(form.sourceName ? { name: form.sourceName } : {}),
    aggregation: form.aggregation,
    queryMode: "advanced",
    advancedQuery,
  });
}

export function formToWidget(
  form: WidgetFormState,
  index: number,
  existingId?: string,
): DashboardWidget {
  const isOperational = isOperationalWidgetType(form.widgetType);

  const dataSourceConfig = (form.widgetType === "text" || form.widgetType === "minimap"
      ? undefined
      : form.queryMode === "advanced" && !isOperational
        ? buildAdvancedDataSourceConfig(form)
        : buildSimpleDataSourceConfig(form)) as DashboardWidget["dataSourceConfig"];
  const fieldLabels = {
    ...form.fieldLabels,
    ...(form.queryMode === "advanced" &&
    form.advancedFormulaEnabled &&
    form.advancedFormulaLabel.trim()
      ? { [FORMULA_FIELD_CODE]: form.advancedFormulaLabel.trim() }
      : {}),
  };
  const effectiveUnit =
    form.unit.trim() ||
    (form.advancedFormulaEnabled ? form.advancedFormulaUnit.trim() : "");

  const displayConfig = {
    ...(form.widgetType === "text" ? { content: form.content } : {}),
    ...(form.suffix ? { suffix: form.suffix } : {}),
    ...(effectiveUnit ? { unit: effectiveUnit } : {}),
    ...(form.description ? { description: form.description } : {}),
    ...(form.renderVariant !== "default"
      ? { variant: form.renderVariant }
      : {}),
    ...(form.widgetType === "ranking" || form.aggregation === "top"
      ? {
          variant: "ranking",
          rankingMode: form.rankingMode,
          nameField: form.rankingNameField || form.dimensionField,
          typeField: form.rankingTypeField,
          labelField: form.rankingNameField || form.dimensionField,
          valueField: form.advancedFormulaEnabled
            ? FORMULA_FIELD_CODE
            : form.metricField,
          limit: form.limit,
          sort: form.rankingMode === "bottom" ? "asc" : "desc",
          showMedal: form.showMedal,
          showProgressBar: form.showProgressBar,
          ...(effectiveUnit ? { unit: effectiveUnit } : {}),
        }
      : {}),
    ...(form.widgetType === "stat" ? { icon: form.icon, theme: form.theme } : {}),
    ...(["progress_ring", "treemap"].includes(form.widgetType) && effectiveUnit
      ? { unit: effectiveUnit }
      : {}),
    ...(form.widgetType === "progress_ring"
      ? { target: form.target, subtitle: form.description }
      : {}),
    ...(form.widgetType === "minimap"
      ? {
          showBoundary: form.showBoundary,
          showLegend: form.showLegend,
          autoFitBounds: form.autoFitBounds,
          interactive: form.interactive,
          highlightMode: "none",
          layerMode: form.minimapLayerMode,
          ...(form.colorField ? { colorField: form.colorField } : {}),
        }
      : {}),
    ...(form.widgetType === "treemap" ? { showLegend: form.showLegend } : {}),
    ...(form.widgetType === "spatial_ranking"
      ? {
          variant: "ranking",
          rankingMode: "top",
          nameField: "area",
          labelField: "area",
          valueField: "value",
          limit: form.limit,
          showMedal: form.showMedal,
          showProgressBar: form.showProgressBar,
          unit:
            effectiveUnit ||
            (form.spatialMetricAggregation === "count" ? "đối tượng" : ""),
        }
      : {}),
    ...(form.widgetType === "spatial_alert"
      ? {
          titleField: "title",
          areaField: "area",
          severityField: "severity",
          statusField: "",
        }
      : {}),
    ...(["activity_feed", "alert_center", "seasonal_calendar"].includes(
      form.widgetType,
    )
      ? {
          titleField: form.titleField,
          descriptionField: form.descriptionField,
          dateField: form.dateField,
          startDateField: form.startDateField,
          endDateField: form.endDateField,
          statusField: form.statusField,
          severityField: form.severityField,
          areaField: form.areaField,
          typeField: form.typeField,
          groupField: form.groupField,
          ...(form.widgetType === "seasonal_calendar"
            ? { mode: form.seasonalMode }
            : {}),
        }
      : {}),
    ...(Object.keys(fieldLabels).length ? { fieldLabels } : {}),
  };

  const title =
    form.title.trim() ||
    (form.widgetType === "minimap"
      ? `Bản đồ ${form.sourceName || "dữ liệu"}`
      : form.widgetType === "progress_ring"
        ? `Tiến độ ${
            form.metricField
              ? getFieldLabel(
                  form.metricField,
                  form.fieldLabels[form.metricField]
                    ? { label: form.fieldLabels[form.metricField] }
                    : undefined,
                )
              : "thực hiện"
          }`
        : form.widgetType === "activity_feed"
          ? "Hoạt động gần đây"
        : form.widgetType === "alert_center"
          ? "Trung tâm cảnh báo"
          : form.widgetType === "spatial_summary"
            ? "Thống kê theo khu vực"
            : form.widgetType === "spatial_ranking"
              ? "Top khu vực"
              : form.widgetType === "thematic_map"
                ? "Bản đồ tô màu"
                : form.widgetType === "spatial_alert"
                  ? "Cảnh báo không gian"
                  : form.widgetType === "treemap"
            ? `Cơ cấu ${
                form.metricField
                  ? getFieldLabel(
                      form.metricField,
                      form.fieldLabels[form.metricField]
                        ? { label: form.fieldLabels[form.metricField] }
                        : undefined,
                    )
                  : "số lượng"
              }${
                form.dimensionField
                  ? ` theo ${getFieldLabel(
                      form.dimensionField,
                      form.fieldLabels[form.dimensionField]
                        ? { label: form.fieldLabels[form.dimensionField] }
                        : undefined,
                    )}`
                  : ""
              }`
            : form.widgetType === "map" ||
                form.widgetType === "text" ||
                isOperational
              ? WIDGET_TYPE_LABELS[form.widgetType]
              : buildWidgetAutoTitle(dataSourceConfig, form.fieldLabels));

  return {
    ...(existingId ? { id: existingId } : {}),
    widgetType: form.widgetType,
    title,
    layoutConfig: {
      x: (index % 2) * (form.layoutW >= 6 ? 0 : 3),
      y: index * form.layoutH,
      w: form.layoutW,
      h: form.layoutH,
    },
    ...(dataSourceConfig ? { dataSourceConfig } : {}),
    ...(Object.keys(displayConfig).length > 0 ? { displayConfig } : {}),
  };
}

interface WidgetFormFieldsProps {
  form: WidgetFormState;
  dataSources: DataSourceLayer[];
  savedViews: SavedView[];
  datasets: Dataset[];
  onChange: (form: WidgetFormState) => void;
}

type FieldOption = {
  code: string;
  label: string;
  fieldType: string;
  dataSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  options?: unknown;
  values?: unknown;
  enum?: unknown;
  dictionaryItems?: unknown;
};

function sourceValueFromForm(form: WidgetFormState) {
  return form.datasetId
    ? `dataset:${form.datasetId}`
    : form.viewId
      ? `view:${form.viewId}`
      : form.layerId
        ? `legacy:${form.layerId}`
        : "";
}

function advancedSourceValueFromForm(form: WidgetFormState) {
  return form.advancedSourceId
    ? `${form.advancedSourceType}:${form.advancedSourceId}`
    : "";
}

function getAdvancedSourceName(
  sourceType: WidgetFormState["advancedSourceType"],
  sourceId: string,
  datasets: Dataset[],
  savedViews: SavedView[],
  dataSources: DataSourceLayer[],
) {
  if (sourceType === "dataset") {
    return datasets.find((dataset) => dataset.id === sourceId)?.name ?? "";
  }
  if (sourceType === "view") {
    const view = savedViews.find((item) => item.id === sourceId);
    return view ? `${view.layerName} / ${view.name}` : "";
  }
  return (
    dataSources.find((source) => source.layerId === sourceId)?.layerName ?? ""
  );
}

function getFieldsForSource(
  sourceType: WidgetFormState["advancedSourceType"],
  sourceId: string,
  datasets: Dataset[],
  savedViews: SavedView[],
  dataSources: DataSourceLayer[],
): FieldOption[] {
  if (sourceType === "dataset") {
    return (
      datasets.find((dataset) => dataset.id === sourceId)?.config.fields ?? []
    ).map((field) => ({
      code: field.key,
      label: getFieldLabel(field.key, { label: field.label }),
      fieldType: field.type,
    }));
  }
  const layerId =
    sourceType === "view"
      ? savedViews.find((view) => view.id === sourceId)?.layerId
      : sourceId;
  return (
    dataSources.find((source) => source.layerId === layerId)?.fields ?? []
  ).map((field) => ({
    ...field,
    label: getFieldLabel(field.code, field),
  }));
}

function buildSimpleConfigSnapshot(form: WidgetFormState) {
  return {
    ...(form.datasetId ? { datasetId: form.datasetId } : {}),
    ...(form.viewId ? { viewId: form.viewId } : {}),
    ...(form.layerId ? { layerId: form.layerId } : {}),
    aggregation: form.aggregation,
    ...(form.metricField ? { metricField: form.metricField } : {}),
    ...(form.dimensionField ? { dimensionField: form.dimensionField } : {}),
    ...(form.displayFields.length ? { displayFields: form.displayFields } : {}),
    ...(form.limit ? { limit: form.limit } : {}),
    ...(form.advancedSortField
      ? {
          sort: {
            field: form.advancedSortField,
            direction: form.advancedSortDirection,
          },
        }
      : {}),
  };
}

function formFromAdvancedQuery(
  form: WidgetFormState,
  query: AdvancedQueryConfig,
  sourceName: string,
  fields: FieldOption[],
): WidgetFormState {
  const sort = query.sort?.[0];
  return {
    ...form,
    queryMode: "advanced",
    advancedSourceType: query.source.type,
    advancedSourceId: query.source.id,
    sourceName,
    aggregation: query.select.aggregation,
    metricField: query.select.metricField ?? "",
    dimensionField: query.select.dimensionField ?? "",
    displayFields: query.select.displayFields ?? [],
    advancedSortField:
      sort?.field ??
      query.select.metricField ??
      query.select.dimensionField ??
      "",
    advancedSortDirection: sort?.direction ?? "desc",
    advancedFilters: query.filter?.rules.map((rule, index) => ({
      id: `filter-${index}-${rule.fieldCode}`,
      fieldCode: rule.fieldCode,
      operator: rule.operator,
      value: rule.value,
    })) ?? [],
    advancedHavingFilters: query.having?.rules.map((rule, index) => ({
      id: `having-${index}-${rule.field}`,
      field: rule.field,
      aggregation: rule.aggregation,
      operator: rule.operator,
      value: String(rule.value),
    })) ?? [],
    advancedFormulaEnabled: query.formula?.enabled === true,
    advancedFormulaLabel: query.formula?.label ?? "",
    advancedFormulaUnit: query.formula?.unit ?? "",
    advancedFormulaExpression: query.formula?.expression ?? "",
    limit: query.limit ?? form.limit,
    fieldLabels: Object.fromEntries(
      fields.map((field) => [field.code, field.label]),
    ),
  };
}

function formatPreviewValue(value: unknown, unit?: string) {
  if (typeof value === "number") return formatWidgetValue(value, { unit });
  if (value === null || value === undefined || value === "") return "(Trống)";
  return String(value);
}

function PreviewMetricValue({ value, unit }: { value: unknown; unit?: string }) {
  const parts = formatWidgetValueParts(value, { unit });
  return (
    <span
      className="ioc-widget-value"
      aria-label={formatWidgetValue(value, { unit })}
    >
      <span className="ioc-widget-value-number">{parts.value}</span>
      {parts.unit && (
        <span className="ioc-widget-value-unit">{parts.unit}</span>
      )}
    </span>
  );
}

function PreviewComparison({
  result,
  unit,
}: {
  result: AnalyticsResult;
  unit?: string;
}) {
  const comparison = "comparison" in result ? result.comparison : undefined;
  if (!comparison) return null;
  const delta = comparison.delta ?? 0;
  const tone =
    delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-600";
  const icon = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <p className={`font-semibold ${tone}`}>
        {icon}{" "}
        {typeof comparison.deltaPercent === "number" &&
        Number.isFinite(comparison.deltaPercent)
          ? formatWidgetValue(comparison.deltaPercent, { valueFormat: "percent" })
          : "Chưa có dữ liệu kỳ trước"}
      </p>
      <p className="text-xs text-muted">{comparison.label}</p>
      <p className="mt-1 text-xs text-muted">
        Hiện tại: {formatWidgetValue(comparison.currentValue ?? 0, { unit })} ·
        Kỳ so sánh: {formatWidgetValue(comparison.previousValue ?? 0, { unit })}
      </p>
      {comparison.currentRange && (
        <p className="mt-1 text-xs text-muted">
          Khoảng hiện tại: {formatDateLabel(comparison.currentRange.from)} đến{" "}
          {formatDateLabel(comparison.currentRange.to)}
        </p>
      )}
      {comparison.previousRange && (
        <p className="text-xs text-muted">
          Kỳ so sánh: {formatDateLabel(comparison.previousRange.from)} đến{" "}
          {formatDateLabel(comparison.previousRange.to)}
        </p>
      )}
    </div>
  );
}

function renderPreviewResult(
  result: AnalyticsResult,
  options?: { metricField?: string; unit?: string },
) {
  const metricField =
    options?.metricField ??
    ("fieldCode" in result ? result.fieldCode : undefined);
  const unit = options?.unit ?? "";
  if (isGroupedAnalyticsResult(result)) {
    return (
      <>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="border-b border-slate-200 py-1 pr-3">Nhóm</th>
            <th className="border-b border-slate-200 py-1">Giá trị</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 10).map((row) => (
            <tr key={`${row.rawLabel}-${row.label}`}>
              <td className="border-b border-slate-100 py-1 pr-3">
                {row.label}
              </td>
              <td className="border-b border-slate-100 py-1">
                <PreviewMetricValue value={row.value} unit={unit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PreviewComparison result={result} unit={unit} />
      </>
    );
  }
  if (isTopAnalyticsResult(result) || isRecordsAnalyticsResult(result)) {
    const records = result.records.slice(0, 10);
    const fields = Array.from(
      new Set(records.flatMap((record) => Object.keys(record)).slice(0, 8)),
    );
    if (records.length === 0) return <p className="mt-2 text-sm text-muted">Không có dữ liệu.</p>;
    return (
      <>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            {fields.map((field) => (
              <th key={field} className="border-b border-slate-200 py-1 pr-3">
                {getFieldLabel(field, {
                  label: result.fieldLabels?.[field],
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr key={index}>
              {fields.map((field) => (
                <td key={field} className="border-b border-slate-100 py-1 pr-3">
                  {field === metricField
                    ? <PreviewMetricValue value={record[field]} unit={unit} />
                    : formatPreviewValue(record[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <PreviewComparison result={result} unit={unit} />
      </>
    );
  }
  return (
    <>
      <p className="mt-3 text-2xl font-semibold text-slate-950">
        <PreviewMetricValue value={result.value} unit={unit} />
      </p>
      <PreviewComparison result={result} unit={unit} />
    </>
  );
}

function MetricUnitInput({
  value,
  onChange,
  placeholder = "triệu đồng/năm, ha, tấn, đối tượng",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-2">
      <label className="block text-xs font-medium text-slate-700">
        Đơn vị hiển thị <span className="font-normal text-muted">(không bắt buộc)</span>
      </label>
      <p className="mb-1 text-xs text-muted">
        Đơn vị hiển thị sau giá trị, ví dụ: triệu đồng/năm, ha, tấn, đối tượng.
      </p>
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function WidgetFormFields({
  form,
  dataSources,
  savedViews,
  datasets,
  onChange,
}: WidgetFormFieldsProps) {
  const [previewResult, setPreviewResult] = useState<AnalyticsResult | null>(
    null,
  );
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const selectedView = useMemo(
    () => savedViews.find((view) => view.id === form.viewId),
    [savedViews, form.viewId],
  );
  const selectedLayer = useMemo(
    () =>
      dataSources.find(
        (source) => source.layerId === (selectedView?.layerId ?? form.layerId),
      ),
    [dataSources, form.layerId, selectedView],
  );
  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === form.datasetId),
    [datasets, form.datasetId],
  );
  const advancedFields = useMemo(
    () =>
      getFieldsForSource(
        form.advancedSourceType,
        form.advancedSourceId,
        datasets,
        savedViews,
        dataSources,
      ),
    [
      dataSources,
      datasets,
      form.advancedSourceId,
      form.advancedSourceType,
      savedViews,
    ],
  );
  const selectedFields = selectedDataset
    ? selectedDataset.config.fields.map((field) => ({
        code: field.key,
        label: getFieldLabel(field.key, { label: field.label }),
        fieldType: field.type,
      }))
    : (selectedLayer?.fields ?? []).map((field) => ({
        ...field,
        label: getFieldLabel(field.code, field),
      }));

  const numericFields = selectedFields.filter((field) =>
    NUMERIC_FIELD_TYPES.has(field.fieldType),
  );
  const groupableFields = selectedFields.filter((field) =>
    GROUPABLE_FIELD_TYPES.has(field.fieldType),
  );
  const advancedNumericFields = advancedFields.filter((field) =>
    NUMERIC_FIELD_TYPES.has(field.fieldType),
  );
  const formulaFieldOption: FieldOption | null =
    form.advancedFormulaEnabled && form.advancedFormulaLabel.trim()
      ? {
          code: FORMULA_FIELD_CODE,
          label: form.advancedFormulaLabel.trim(),
          fieldType: "number",
        }
      : null;
  const advancedGroupableFields = advancedFields.filter((field) =>
    GROUPABLE_FIELD_TYPES.has(field.fieldType),
  );
  const advancedTimeFields = advancedFields.filter((field) =>
    isTimeFieldType(field.fieldType),
  );
  const advancedSortFields = [
    ...(formulaFieldOption ? [formulaFieldOption] : []),
    ...advancedGroupableFields.filter((field) => field.code === form.dimensionField),
    ...advancedNumericFields.filter((field) => field.code === form.metricField),
    ...advancedGroupableFields.filter((field) => field.code !== form.dimensionField),
    ...advancedNumericFields.filter((field) => field.code !== form.metricField),
  ].filter(
    (field, index, fields) =>
      fields.findIndex((item) => item.code === field.code) === index,
  );

  const isOperational = isOperationalWidgetType(form.widgetType);
  const isMiniMap = form.widgetType === "minimap";
  const canUseAdvanced =
    !isOperational && !isMiniMap && form.widgetType !== "text" && form.widgetType !== "map";
  const needsNumericField =
    !isOperational &&
    !isMiniMap &&
    form.widgetType !== "map" &&
    form.aggregation !== "count";
  const needsDimension =
    !isOperational &&
    (form.aggregation === "top" ||
      form.widgetType === "ranking" ||
      form.widgetType === "treemap" ||
      form.widgetType === "bar" ||
      form.widgetType === "pie" ||
      form.widgetType === "donut" ||
      form.widgetType === "line" ||
      form.widgetType === "table");
  const isText = form.widgetType === "text";
  const sourceValue = sourceValueFromForm(form);
  const advancedSourceValue = advancedSourceValueFromForm(form);
  const isAdvanced = canUseAdvanced && form.queryMode === "advanced";
  const autoTitle = formToWidget({ ...form, title: "" }, 0).title;
  const advancedSourceName = getAdvancedSourceName(
    form.advancedSourceType,
    form.advancedSourceId,
    datasets,
    savedViews,
    dataSources,
  );
  const dimensionLabel = form.dimensionField
    ? (advancedFields.find((field) => field.code === form.dimensionField)
        ?.label ?? "")
    : "";
  const metricLabel = form.metricField
    ? (advancedFields.find((field) => field.code === form.metricField)?.label ??
      "")
    : "";
  const formulaMetricLabel =
    form.advancedFormulaEnabled && form.advancedFormulaLabel.trim()
      ? form.advancedFormulaLabel.trim()
      : metricLabel;
  const rankingFields = isAdvanced ? advancedFields : selectedFields;
  const rankingNameFields = rankingFields.filter(
    (field) =>
      GROUPABLE_FIELD_TYPES.has(field.fieldType) ||
      ["text", "select", "boolean", "date"].includes(field.fieldType),
  );
  const rankingMetricFields = isAdvanced
    ? [
        ...(formulaFieldOption ? [formulaFieldOption] : []),
        ...advancedNumericFields,
      ]
    : numericFields;
  const rankingMetricLabel =
    rankingMetricFields.find((field) => field.code === form.metricField)
      ?.label ??
    (form.advancedFormulaEnabled ? form.advancedFormulaLabel : metricLabel);
  const rankingNameLabel =
    rankingFields.find((field) => field.code === form.rankingNameField)
      ?.label ?? "";
  const rankingTypeLabel =
    rankingFields.find((field) => field.code === form.rankingTypeField)
      ?.label ?? "";
  const spatialSourceLayer = dataSources.find(
    (source) => source.layerId === form.spatialSourceLayerId,
  );
  const spatialZoneLayer = dataSources.find(
    (source) => source.layerId === form.spatialZoneLayerId,
  );
  const spatialSourceFields = spatialSourceLayer?.fields ?? [];
  const spatialZoneFields = spatialZoneLayer?.fields ?? [];
  const spatialMetricFields = spatialSourceFields.filter((field) =>
    NUMERIC_FIELD_TYPES.has(field.fieldType),
  );
  const spatialZoneLabelFields = spatialZoneFields.filter((field) =>
    GROUPABLE_FIELD_TYPES.has(field.fieldType),
  );
  const spatialLayers = dataSources.filter(
    (source) => String(source.geometryType ?? "").toLowerCase() !== "none",
  );
  const polygonLayers = dataSources.filter((source) =>
    isPolygonGeometryType(source.geometryType),
  );
  const formulaValidationError = getFormulaValidationError(
    form,
    advancedNumericFields,
  );
  const formulaWarning = getFormulaWarning(form);
  const timeValidationError = getTimeValidationError(form);
  const sortLabel = form.advancedSortField
    ? (advancedFields.find((field) => field.code === form.advancedSortField)
        ?.label ?? "")
    : "";
  const advancedFilterSummaries = form.advancedFilters.map((filter) => {
    const field = advancedFields.find((item) => item.code === filter.fieldCode);
    return {
      id: filter.id,
      text: formatFilterSummary(filter, field),
      warning: getFilterWarning(filter, field),
    };
  });
  const advancedHavingSummaries = form.advancedHavingFilters.map((filter) => {
    const field = advancedFields.find((item) => item.code === filter.field);
    return {
      id: filter.id,
      text: formatHavingSummary(filter, field),
      warning: getHavingWarning(filter),
    };
  });
  const timeFieldLabel =
    advancedTimeFields.find((field) => field.code === form.advancedTimeDateField)
      ?.label ?? "";
  const timeSummary = getTimeSummary(form, timeFieldLabel);
  const compareUnsupported =
    form.advancedTimeEnabled &&
    form.advancedTimeCompare !== "none" &&
    form.widgetType !== "stat";
  const previewMetricField = form.advancedFormulaEnabled
    ? FORMULA_FIELD_CODE
    : form.metricField;
  const previewUnit = getWidgetValueUnit(
    {
      displayConfig: {
        ...(form.unit.trim() ? { unit: form.unit.trim() } : {}),
        ...(form.suffix.trim() ? { suffix: form.suffix.trim() } : {}),
      },
      dataSourceConfig: {
        ...(previewMetricField ? { metricField: previewMetricField } : {}),
        ...(previewMetricField ? { fieldCode: previewMetricField } : {}),
        ...(form.advancedFormulaEnabled && form.advancedFormulaUnit.trim()
          ? {
              advancedQuery: {
                formula: { unit: form.advancedFormulaUnit.trim() },
              },
            }
          : {}),
      },
    } as Pick<DashboardWidget, "displayConfig" | "dataSourceConfig">,
    previewMetricField,
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Tiêu đề widget</label>
        <input
          className={inputClass}
          value={form.title}
          placeholder={autoTitle}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted">
          Có thể để trống để hệ thống tạo: “{autoTitle}”.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">Mô tả ngắn</label>
        <input
          className={inputClass}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Ví dụ: Tổng diện tích đang canh tác"
        />
        <p className="mt-1 text-xs text-muted">
          Hiển thị bên dưới KPI hoặc tiêu đề biểu đồ; có thể để trống để hệ
          thống tự gợi ý.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">Kiểu widget</label>
        <select
          className={inputClass}
          value={form.widgetType}
          onChange={(e) => {
            const widgetType = e.target.value as WidgetType;
            const operational = isOperationalWidgetType(widgetType);
            const layoutW =
              widgetType === "stat"
                ? 3
                : widgetType === "text"
                  ? 12
                  : [
                        "minimap",
                        "activity_feed",
                        "alert_center",
                        "spatial_summary",
                        "spatial_ranking",
                        "thematic_map",
                        "spatial_alert",
                        "seasonal_calendar",
                      ].includes(widgetType)
                    ? 8
                    : 6;
            const layoutH =
              widgetType === "stat"
                ? 2
                : widgetType === "text"
                  ? 2
                  : operational || widgetType === "minimap"
                    ? 5
                    : 4;
            onChange({
              ...form,
              widgetType,
              queryMode:
                operational ||
                widgetType === "minimap" ||
                widgetType === "text" ||
                widgetType === "map"
                  ? "simple"
                  : form.queryMode,
              aggregation:
                widgetType === "ranking"
                  ? "top"
                  : widgetType === "progress_ring"
                    ? "avg"
                    : widgetType === "treemap"
                      ? "sum"
                      : operational || widgetType === "minimap"
                        ? "records"
                        : form.aggregation === "records"
                          ? "count"
                          : form.aggregation,
              layoutW,
              layoutH,
            });
          }}
        >
          {Object.entries(WIDGET_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {canUseAdvanced && (
        <div>
          <label className="block text-sm font-medium">Chế độ cấu hình</label>
          <div className="mt-2 inline-flex rounded-lg border border-border bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onChange({ ...form, queryMode: "simple" })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                !isAdvanced
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Cơ bản
            </button>
            <button
              type="button"
              onClick={() => {
                if (form.advancedSourceId) {
                  onChange({ ...form, queryMode: "advanced" });
                  return;
                }
                const query = buildAdvancedQueryFromSimpleConfig(
                  buildSimpleConfigSnapshot(form),
                );
                if (!query) {
                  onChange({ ...form, queryMode: "advanced" });
                  return;
                }
                const sourceName = getAdvancedSourceName(
                  query.source.type,
                  query.source.id,
                  datasets,
                  savedViews,
                  dataSources,
                );
                const fields = getFieldsForSource(
                  query.source.type,
                  query.source.id,
                  datasets,
                  savedViews,
                  dataSources,
                );
                onChange(formFromAdvancedQuery(form, query, sourceName, fields));
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                isAdvanced
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Nâng cao
            </button>
          </div>
        </div>
      )}

      {isText ? (
        <div>
          <label className="block text-sm font-medium">Nội dung</label>
          <textarea
            className={inputClass}
            rows={4}
            value={form.content}
            onChange={(e) => onChange({ ...form, content: e.target.value })}
          />
        </div>
      ) : (
        <>
          {isAdvanced && (
            <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Trình dựng truy vấn nâng cao
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium">Nguồn dữ liệu</label>
                <select
                  className={inputClass}
                  required
                  value={advancedSourceValue}
                  onChange={(event) => {
                    if (!event.target.value) {
                      onChange({
                        ...form,
                        queryMode: "advanced",
                        advancedSourceId: "",
                        sourceName: "",
                        metricField: "",
                        dimensionField: "",
                        displayFields: [],
                        advancedSortField: "",
                        advancedFilters: [],
                        advancedHavingFilters: [],
                        advancedFormulaEnabled: false,
                        advancedFormulaLabel: "",
                        advancedFormulaUnit: "",
                        advancedFormulaExpression: "",
                        advancedTimeEnabled: false,
                        advancedTimeDateField: "",
                        advancedTimePreset: "this_month",
                        advancedTimeCustomFrom: "",
                        advancedTimeCustomTo: "",
                        advancedTimeCompare: "none",
                        fieldLabels: {},
                      });
                      return;
                    }
                    const [rawType, id] = event.target.value.split(":");
                    const sourceType =
                      rawType === "view" || rawType === "layer"
                        ? rawType
                        : "dataset";
                    const fields = getFieldsForSource(
                      sourceType,
                      id,
                      datasets,
                      savedViews,
                      dataSources,
                    );
                    onChange({
                      ...form,
                      queryMode: "advanced",
                      advancedSourceType: sourceType,
                      advancedSourceId: id,
                      sourceName: getAdvancedSourceName(
                        sourceType,
                        id,
                        datasets,
                        savedViews,
                        dataSources,
                      ),
                      metricField: "",
                      dimensionField: "",
                      displayFields: [],
                      advancedSortField: "",
                      advancedFilters: [],
                      advancedHavingFilters: [],
                      advancedFormulaEnabled: false,
                      advancedFormulaLabel: "",
                      advancedFormulaUnit: "",
                      advancedFormulaExpression: "",
                      advancedTimeEnabled: false,
                      advancedTimeDateField: "",
                      advancedTimePreset: "this_month",
                      advancedTimeCustomFrom: "",
                      advancedTimeCustomTo: "",
                      advancedTimeCompare: "none",
                      fieldLabels: Object.fromEntries(
                        fields.map((field) => [field.code, field.label]),
                      ),
                    });
                  }}
                >
                  <option value="">— Chọn nguồn —</option>
                  <optgroup label="Dataset">
                    {datasets.map((dataset) => (
                      <option key={dataset.id} value={`dataset:${dataset.id}`}>
                        {dataset.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Saved View">
                    {savedViews.map((view) => (
                      <option key={view.id} value={`view:${view.id}`}>
                        {view.layerName} / {view.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Layer">
                    {dataSources.map((source) => (
                      <option key={source.layerId} value={`layer:${source.layerId}`}>
                        {source.layerName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Trường phân nhóm
                  </label>
                  <p className="mb-1 text-xs text-muted">
                    Dùng để chia dữ liệu thành nhóm, ví dụ: Loại vùng, Khu vực,
                    Trạng thái.
                  </p>
                  <select
                    className={inputClass}
                    required={requiresAdvancedDimension(form.widgetType)}
                    value={form.dimensionField}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        dimensionField: event.target.value,
                        advancedSortField:
                          form.advancedSortField || event.target.value,
                      })
                    }
                  >
                    <option value="">— Không phân nhóm —</option>
                    {advancedGroupableFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Trường chỉ số
                  </label>
                  <p className="mb-1 text-xs text-muted">
                    Trường số dùng để tính toán, ví dụ: Lợi nhuận, Diện tích,
                    Sản lượng.
                  </p>
                  <select
                    className={inputClass}
                    required={
                      form.aggregation !== "count" &&
                      !form.advancedFormulaEnabled
                    }
                    disabled={form.advancedFormulaEnabled}
                    value={form.advancedFormulaEnabled ? "" : form.metricField}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        metricField: event.target.value,
                        advancedSortField:
                          form.advancedSortField || event.target.value,
                        advancedHavingFilters:
                          form.advancedHavingFilters.map((item) => ({
                            ...item,
                            field: event.target.value,
                            aggregation: form.aggregation,
                          })),
                      })
                    }
                  >
                    <option value="">— Chọn trường —</option>
                    {advancedNumericFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  {!form.advancedFormulaEnabled &&
                    form.widgetType !== "ranking" &&
                    form.aggregation !== "top" && (
                    <MetricUnitInput
                      value={form.unit}
                      onChange={(unit) => onChange({ ...form, unit })}
                    />
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-sky-100 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">
                  Công thức chỉ số
                </p>
                <p className="mt-1 text-xs text-muted">
                  Tạo chỉ số tính toán từ các trường số. Ví dụ: Lợi nhuận /
                  Diện tích.
                </p>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={form.advancedFormulaEnabled}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        advancedFormulaEnabled: event.target.checked,
                        metricField: event.target.checked
                          ? FORMULA_FIELD_CODE
                          : "",
                        advancedHavingFilters: event.target.checked
                          ? form.advancedHavingFilters.map((item) => ({
                              ...item,
                              field: FORMULA_FIELD_CODE,
                            }))
                          : [],
                      })
                    }
                  />
                  Dùng công thức thay cho trường chỉ số
                </label>

                {form.advancedFormulaEnabled && (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium">
                          Tên chỉ số
                        </label>
                        <input
                          className={inputClass}
                          value={form.advancedFormulaLabel}
                          placeholder="Lợi nhuận/ha"
                          onChange={(event) =>
                            onChange({
                              ...form,
                              advancedFormulaLabel: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Đơn vị
                        </label>
                        <p className="mb-1 text-xs text-muted">
                          Đơn vị hiển thị sau giá trị, ví dụ: triệu đồng/năm,
                          ha, tấn, đối tượng.
                        </p>
                        <input
                          className={inputClass}
                          value={form.advancedFormulaUnit}
                          placeholder="triệu đồng/ha"
                          onChange={(event) =>
                            onChange({
                              ...form,
                              advancedFormulaUnit: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Công thức
                      </label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={form.advancedFormulaExpression}
                        placeholder="loi_nhuan_trieu_dong_nam / dien_tich_ha"
                        onChange={(event) =>
                          onChange({
                            ...form,
                            advancedFormulaExpression: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Thêm nhanh trường số
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {advancedNumericFields.map((field) => (
                          <button
                            key={field.code}
                            type="button"
                            className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-slate-50"
                            onClick={() =>
                              onChange({
                                ...form,
                                advancedFormulaExpression:
                                  `${form.advancedFormulaExpression} ${field.code}`.trim(),
                              })
                            }
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Toán tử
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["+", "-", "*", "/", "(", ")"].map((operator) => (
                          <button
                            key={operator}
                            type="button"
                            className="rounded-lg border border-border bg-white px-3 py-1 text-sm font-medium hover:bg-slate-50"
                            onClick={() =>
                              onChange({
                                ...form,
                                advancedFormulaExpression:
                                  `${form.advancedFormulaExpression} ${operator}`.trim(),
                              })
                            }
                          >
                            {operator}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted">
                      Chỉ hỗ trợ phép tính số cơ bản. Không hỗ trợ function JS.
                      Không nhập chữ tự do ngoài field key, số, toán tử và
                      ngoặc.
                    </p>
                    {formulaValidationError && (
                      <p className="text-xs text-red-600">
                        {formulaValidationError}
                      </p>
                    )}
                    {formulaWarning && !formulaValidationError && (
                      <p className="text-xs text-amber-700">{formulaWarning}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Phép tổng hợp
                  </label>
                  <select
                    className={inputClass}
                    value={form.aggregation}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        aggregation: event.target.value as AggregationType,
                        advancedHavingFilters:
                          event.target.value === "count"
                            ? []
                            : form.advancedHavingFilters.map((item) => ({
                                ...item,
                                field: form.advancedFormulaEnabled
                                  ? FORMULA_FIELD_CODE
                                  : item.field,
                                aggregation:
                                  event.target.value as AggregationType,
                              })),
                      })
                    }
                  >
                    {(
                      [
                        "count",
                        "sum",
                        "avg",
                        "min",
                        "max",
                        "top",
                      ] as AggregationType[]
                    ).map((aggregation) => (
                      <option key={aggregation} value={aggregation}>
                        {ADVANCED_AGGREGATION_LABELS[aggregation]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Số dòng/nhóm tối đa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    className={inputClass}
                    value={form.limit}
                    onChange={(event) =>
                      onChange({ ...form, limit: Number(event.target.value) || 10 })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Sắp xếp theo
                  </label>
                  <select
                    className={inputClass}
                    value={form.advancedSortField}
                    onChange={(event) =>
                      onChange({ ...form, advancedSortField: event.target.value })
                    }
                  >
                    <option value="">— Không sắp xếp —</option>
                    {advancedSortFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Chiều sắp xếp
                  </label>
                  <select
                    className={inputClass}
                    value={form.advancedSortDirection}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        advancedSortDirection: event.target.value as
                          | "asc"
                          | "desc",
                      })
                    }
                  >
                    <option value="asc">Tăng dần</option>
                    <option value="desc">Giảm dần</option>
                  </select>
                </div>
              </div>

              {(form.widgetType === "ranking" || form.aggregation === "top") && (
                <div className="space-y-3 rounded-lg border border-sky-100 bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Cấu hình xếp hạng
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Thiết lập tên đối tượng, nhóm phụ, chỉ số và thứ tự xếp
                      hạng.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium">
                        Kiểu xếp hạng
                      </label>
                      <select
                        className={inputClass}
                        value={form.rankingMode}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            rankingMode: event.target.value as
                              | "top"
                              | "bottom",
                            rankingSort:
                              event.target.value === "bottom"
                                ? "asc"
                                : "desc",
                            advancedSortDirection:
                              event.target.value === "bottom"
                                ? "asc"
                                : "desc",
                          })
                        }
                      >
                        <option value="top">Top cao nhất</option>
                        <option value="bottom">Bottom thấp nhất</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Số lượng hiển thị
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className={inputClass}
                        value={form.limit}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            limit: Number(event.target.value) || 5,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium">
                        Trường tên đối tượng
                      </label>
                      <select
                        className={inputClass}
                        value={form.rankingNameField}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            rankingNameField: event.target.value,
                            dimensionField:
                              event.target.value || form.dimensionField,
                          })
                        }
                      >
                        <option value="">— Chọn tên —</option>
                        {rankingNameFields.map((field) => (
                          <option key={field.code} value={field.code}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Trường nhóm phụ / loại
                      </label>
                      <select
                        className={inputClass}
                        value={form.rankingTypeField}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            rankingTypeField: event.target.value,
                          })
                        }
                      >
                        <option value="">— Không dùng —</option>
                        {rankingNameFields
                          .filter(
                            (field) => field.code !== form.rankingNameField,
                          )
                          .map((field) => (
                            <option key={field.code} value={field.code}>
                              {field.label}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Trường giá trị xếp hạng
                      </label>
                      <select
                        className={inputClass}
                        disabled={form.advancedFormulaEnabled}
                        value={
                          form.advancedFormulaEnabled
                            ? FORMULA_FIELD_CODE
                            : form.metricField
                        }
                        onChange={(event) =>
                          onChange({
                            ...form,
                            metricField: event.target.value,
                            advancedSortField: event.target.value,
                          })
                        }
                      >
                        <option value="">— Chọn chỉ số —</option>
                        {rankingMetricFields.map((field) => (
                          <option key={field.code} value={field.code}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <MetricUnitInput
                        value={
                          form.unit ||
                          (form.advancedFormulaEnabled
                            ? form.advancedFormulaUnit
                            : "")
                        }
                        onChange={(unit) => onChange({ ...form, unit })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.showMedal}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            showMedal: event.target.checked,
                          })
                        }
                      />
                      Hiển thị huy chương
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.showProgressBar}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            showProgressBar: event.target.checked,
                          })
                        }
                      />
                      Hiển thị thanh tiến độ
                    </label>
                  </div>
                  <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-800">
                    Xếp hạng {form.rankingMode === "bottom" ? "Bottom" : "Top"}{" "}
                    {form.limit || 5} theo {rankingMetricLabel || "chỉ số"}
                    {rankingTypeLabel ? `, nhóm phụ ${rankingTypeLabel}` : ""}.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-sky-100 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">
                  Thời gian
                </p>
                <p className="mt-1 text-xs text-muted">
                  Lọc và so sánh dữ liệu theo thời gian, ví dụ tháng này so với
                  tháng trước.
                </p>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={form.advancedTimeEnabled}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        advancedTimeEnabled: event.target.checked,
                        advancedTimeDateField: event.target.checked
                          ? form.advancedTimeDateField ||
                            advancedTimeFields[0]?.code ||
                            ""
                          : "",
                        advancedTimeCompare: event.target.checked
                          ? form.advancedTimeCompare
                          : "none",
                      })
                    }
                  />
                  Bật lọc thời gian
                </label>
                {form.advancedTimeEnabled && (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium">
                          Trường ngày
                        </label>
                        <select
                          className={inputClass}
                          value={form.advancedTimeDateField}
                          onChange={(event) =>
                            onChange({
                              ...form,
                              advancedTimeDateField: event.target.value,
                            })
                          }
                        >
                          <option value="">— Chọn trường ngày —</option>
                          {advancedTimeFields.map((field) => (
                            <option key={field.code} value={field.code}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Khoảng thời gian
                        </label>
                        <select
                          className={inputClass}
                          value={form.advancedTimePreset}
                          onChange={(event) =>
                            onChange({
                              ...form,
                              advancedTimePreset: event.target.value as TimePreset,
                            })
                          }
                        >
                          {Object.entries(TIME_PRESET_LABELS).map(
                            ([preset, label]) => (
                              <option key={preset} value={preset}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                    {form.advancedTimePreset === "custom" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium">
                            Từ ngày
                          </label>
                          <input
                            type="date"
                            className={inputClass}
                            value={form.advancedTimeCustomFrom}
                            onChange={(event) =>
                              onChange({
                                ...form,
                                advancedTimeCustomFrom: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            Đến ngày
                          </label>
                          <input
                            type="date"
                            className={inputClass}
                            value={form.advancedTimeCustomTo}
                            onChange={(event) =>
                              onChange({
                                ...form,
                                advancedTimeCustomTo: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium">
                        So sánh
                      </label>
                      <select
                        className={inputClass}
                        value={form.advancedTimeCompare}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            advancedTimeCompare:
                              event.target.value as TimeCompareMode,
                          })
                        }
                      >
                        {Object.entries(TIME_COMPARE_LABELS).map(
                          ([compare, label]) => (
                            <option key={compare} value={compare}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    {timeValidationError && (
                      <p className="text-xs text-red-600">
                        {timeValidationError}
                      </p>
                    )}
                    {compareUnsupported && (
                      <p className="text-xs text-amber-700">
                        Widget này sẽ áp dụng lọc thời gian, nhưng chưa hiển thị
                        so sánh.
                      </p>
                    )}
                    <p className="text-xs text-muted">{timeSummary}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Bộ lọc dữ liệu
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Chỉ lấy các dòng dữ liệu thỏa điều kiện. Các điều kiện
                      hiện được kết hợp theo AND.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-slate-50"
                    onClick={() =>
                      onChange({
                        ...form,
                        advancedFilters: [
                          ...form.advancedFilters,
                          createAdvancedFilterRow(),
                        ],
                      })
                    }
                  >
                    + Thêm điều kiện
                  </button>
                </div>

                {form.advancedFilters.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-muted">
                    Chưa có điều kiện lọc.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {form.advancedFilters.map((filter) => {
                      const field = advancedFields.find(
                        (item) => item.code === filter.fieldCode,
                      );
                      const operators = getFilterOperatorsForField(field);
                      const valueOptions = getFieldValueOptions(field);
                      const warning = getFilterWarning(filter, field);
                      const valueText = Array.isArray(filter.value)
                        ? filter.value.join(", ")
                        : String(filter.value ?? "");
                      return (
                        <div
                          key={filter.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1.4fr_auto]">
                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Trường
                              </label>
                              <select
                                className={inputClass}
                                value={filter.fieldCode}
                                onChange={(event) => {
                                  const nextField = advancedFields.find(
                                    (item) => item.code === event.target.value,
                                  );
                                  const nextOperator =
                                    getFilterOperatorsForField(nextField)[0] ??
                                    "eq";
                                  onChange({
                                    ...form,
                                    advancedFilters: form.advancedFilters.map(
                                      (item) =>
                                        item.id === filter.id
                                          ? {
                                              ...item,
                                              fieldCode: event.target.value,
                                              operator: nextOperator,
                                              value:
                                                nextOperator === "in" ? [] : "",
                                            }
                                          : item,
                                    ),
                                  });
                                }}
                              >
                                <option value="">— Chọn trường —</option>
                                {advancedFields.map((item) => (
                                  <option key={item.code} value={item.code}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Toán tử
                              </label>
                              <select
                                className={inputClass}
                                value={filter.operator}
                                onChange={(event) => {
                                  const operator = event.target
                                    .value as AdvancedFilterOperator;
                                  onChange({
                                    ...form,
                                    advancedFilters: form.advancedFilters.map(
                                      (item) =>
                                        item.id === filter.id
                                          ? {
                                              ...item,
                                              operator,
                                              value:
                                                operator === "in"
                                                  ? []
                                                  : filterOperatorNeedsValue(
                                                        operator,
                                                      )
                                                    ? ""
                                                    : undefined,
                                            }
                                          : item,
                                    ),
                                  });
                                }}
                              >
                                {operators.map((operator) => (
                                  <option key={operator} value={operator}>
                                    {FILTER_OPERATOR_LABELS[operator]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Giá trị
                              </label>
                              {!filterOperatorNeedsValue(filter.operator) ? (
                                <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-muted">
                                  Không cần nhập giá trị.
                                </p>
                              ) : valueOptions.length > 0 &&
                                filter.operator === "in" ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <div className="space-y-1">
                                    {valueOptions.map((option) => {
                                      const selected = Array.isArray(
                                        filter.value,
                                      )
                                        ? filter.value.map(String)
                                        : [];
                                      return (
                                        <label
                                          key={option.value}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300"
                                            checked={selected.includes(
                                              option.value,
                                            )}
                                            onChange={(event) => {
                                              const nextValue = event.target
                                                .checked
                                                ? [...selected, option.value]
                                                : selected.filter(
                                                    (item) =>
                                                      item !== option.value,
                                                  );
                                              onChange({
                                                ...form,
                                                advancedFilters:
                                                  form.advancedFilters.map(
                                                    (item) =>
                                                      item.id === filter.id
                                                        ? {
                                                            ...item,
                                                            value: nextValue,
                                                          }
                                                        : item,
                                                  ),
                                              });
                                            }}
                                          />
                                          <span>{option.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : valueOptions.length > 0 ? (
                                <select
                                  className={inputClass}
                                  value={String(filter.value ?? "")}
                                  onChange={(event) => {
                                    onChange({
                                      ...form,
                                      advancedFilters: form.advancedFilters.map(
                                        (item) =>
                                          item.id === filter.id
                                            ? {
                                                ...item,
                                                value: event.target.value,
                                              }
                                            : item,
                                      ),
                                    });
                                  }}
                                >
                                  <option value="">— Chọn giá trị —</option>
                                  {valueOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className={inputClass}
                                  type={
                                    NUMERIC_FIELD_TYPES.has(
                                      field?.fieldType ?? "",
                                    )
                                      ? "number"
                                      : isDateFieldType(field?.fieldType)
                                        ? "date"
                                        : "text"
                                  }
                                  value={valueText}
                                  placeholder={
                                    filter.operator === "in"
                                      ? "Nhập nhiều giá trị, cách nhau bằng dấu phẩy"
                                      : "Nhập giá trị lọc"
                                  }
                                  onChange={(event) => {
                                    const nextValue =
                                      filter.operator === "in"
                                        ? event.target.value
                                        : NUMERIC_FIELD_TYPES.has(
                                              field?.fieldType ?? "",
                                            )
                                          ? event.target.value === ""
                                            ? ""
                                            : Number(event.target.value)
                                          : event.target.value;
                                    onChange({
                                      ...form,
                                      advancedFilters: form.advancedFilters.map(
                                        (item) =>
                                          item.id === filter.id
                                            ? { ...item, value: nextValue }
                                            : item,
                                      ),
                                    });
                                  }}
                                />
                              )}
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  onChange({
                                    ...form,
                                    advancedFilters: form.advancedFilters.filter(
                                      (item) => item.id !== filter.id,
                                    ),
                                  })
                                }
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                          {warning && (
                            <p className="mt-2 text-xs text-amber-700">
                              {warning}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Bộ lọc kết quả
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Lọc sau khi đã tính tổng, trung bình hoặc nhóm dữ liệu.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!form.metricField || form.aggregation === "count"}
                    onClick={() =>
                      onChange({
                        ...form,
                        advancedHavingFilters: [
                          ...form.advancedHavingFilters,
                          createAdvancedHavingRow(form),
                        ],
                      })
                    }
                  >
                    + Thêm điều kiện
                  </button>
                </div>

                {!form.metricField || form.aggregation === "count" ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-muted">
                    Chọn trường chỉ số và phép tổng hợp khác Đếm để lọc kết
                    quả.
                  </p>
                ) : form.advancedHavingFilters.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-muted">
                    Chưa có điều kiện lọc kết quả.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {form.advancedHavingFilters.map((filter) => {
                      const field = advancedFields.find(
                        (item) => item.code === filter.field,
                      );
                      const warning = getHavingWarning(filter);
                      return (
                        <div
                          key={filter.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1.2fr_auto]">
                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Trường
                              </label>
                              <select
                                className={inputClass}
                                value={filter.field || form.metricField}
                                onChange={(event) =>
                                  onChange({
                                    ...form,
                                    advancedHavingFilters:
                                      form.advancedHavingFilters.map((item) =>
                                        item.id === filter.id
                                          ? {
                                              ...item,
                                              field: event.target.value,
                                              aggregation: form.aggregation,
                                            }
                                          : item,
                                      ),
                                  })
                                }
                              >
                                {form.metricField && (
                                  <option value={form.metricField}>
                                    {formulaMetricLabel || "Trường chỉ số hiện tại"}
                                  </option>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Toán tử
                              </label>
                              <select
                                className={inputClass}
                                value={filter.operator}
                                onChange={(event) =>
                                  onChange({
                                    ...form,
                                    advancedHavingFilters:
                                      form.advancedHavingFilters.map((item) =>
                                        item.id === filter.id
                                          ? {
                                              ...item,
                                              operator: event.target
                                                .value as AdvancedHavingOperator,
                                            }
                                          : item,
                                      ),
                                  })
                                }
                              >
                                {Object.entries(HAVING_OPERATOR_LABELS).map(
                                  ([operator, label]) => (
                                    <option key={operator} value={operator}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700">
                                Giá trị
                              </label>
                              <input
                                type="number"
                                className={inputClass}
                                value={filter.value}
                                placeholder="Nhập giá trị số"
                                onChange={(event) =>
                                  onChange({
                                    ...form,
                                    advancedHavingFilters:
                                      form.advancedHavingFilters.map((item) =>
                                        item.id === filter.id
                                          ? {
                                              ...item,
                                              field:
                                                item.field || form.metricField,
                                              aggregation: form.aggregation,
                                              value: event.target.value,
                                            }
                                          : item,
                                      ),
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  onChange({
                                    ...form,
                                    advancedHavingFilters:
                                      form.advancedHavingFilters.filter(
                                        (item) => item.id !== filter.id,
                                      ),
                                  })
                                }
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                          {warning && (
                            <p className="mt-2 text-xs text-amber-700">
                              {warning}
                            </p>
                          )}
                          {!warning && (
                            <p className="mt-2 text-xs text-muted">
                              {formatHavingSummary(filter, field)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">
                  Cấu hình sẽ tạo truy vấn:
                </p>
                <div className="mt-2 space-y-1 text-muted">
                  <p>Nguồn: {advancedSourceName || "Chưa chọn"}</p>
                  {(form.widgetType === "ranking" ||
                    form.aggregation === "top") && (
                    <>
                      <p>Kiểu widget: Xếp hạng</p>
                      <p>
                        Chế độ:{" "}
                        {form.rankingMode === "bottom"
                          ? "Bottom thấp nhất"
                          : "Top cao nhất"}
                      </p>
                      <p>
                        Tên đối tượng: {rankingNameLabel || "Chưa chọn"}
                      </p>
                      <p>Nhóm phụ: {rankingTypeLabel || "Không dùng"}</p>
                      <p>Giá trị: {rankingMetricLabel || "Chưa chọn"}</p>
                      <p>Số lượng: {form.limit || 5}</p>
                    </>
                  )}
                  <p>Phân nhóm: {dimensionLabel || "Không phân nhóm"}</p>
                  <p>
                    Chỉ số: {ADVANCED_AGGREGATION_LABELS[form.aggregation]}
                    {formulaMetricLabel ? ` ${formulaMetricLabel}` : ""}
                  </p>
                  <p>
                    Sắp xếp:{" "}
                    {sortLabel
                      ? `${sortLabel} ${
                          form.advancedSortDirection === "asc"
                            ? "tăng dần"
                            : "giảm dần"
                        }`
                      : "Không sắp xếp"}
                  </p>
                  <p>Giới hạn: {form.limit}</p>
                  <div>
                    <p>Thời gian:</p>
                    <p className="pl-3">{timeSummary}</p>
                    {form.advancedTimeEnabled && (
                      <p className="pl-3">
                        So sánh: {TIME_COMPARE_LABELS[form.advancedTimeCompare]}
                      </p>
                    )}
                    {timeValidationError && (
                      <p className="pl-3 text-amber-700">
                        {timeValidationError}
                      </p>
                    )}
                  </div>
                  <div>
                    <p>Bộ lọc:</p>
                    {advancedFilterSummaries.length === 0 ? (
                      <p className="pl-3">Chưa có điều kiện lọc.</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {advancedFilterSummaries.map((item) => (
                          <li
                            key={item.id}
                            className={
                              item.warning ? "text-amber-700" : undefined
                            }
                          >
                            {item.text}
                            {item.warning ? ` (${item.warning})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p>Bộ lọc kết quả:</p>
                    {advancedHavingSummaries.length === 0 ? (
                      <p className="pl-3">Chưa có điều kiện lọc kết quả.</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {advancedHavingSummaries.map((item) => (
                          <li
                            key={item.id}
                            className={
                              item.warning ? "text-amber-700" : undefined
                            }
                          >
                            {item.text}
                            {item.warning ? ` (${item.warning})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Xem trước kết quả
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Chạy thử truy vấn hiện tại mà không lưu widget.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isPreviewLoading}
                    onClick={async () => {
                      setPreviewError("");
                      setPreviewResult(null);
                      if (!form.advancedSourceId) {
                        setPreviewError("Chọn nguồn dữ liệu trước khi xem trước.");
                        return;
                      }
                      if (formulaValidationError) {
                        setPreviewError(formulaValidationError);
                        return;
                      }
                      if (timeValidationError) {
                        setPreviewError(timeValidationError);
                        return;
                      }
                      if (
                        form.aggregation !== "count" &&
                        !form.metricField &&
                        !form.advancedFormulaEnabled
                      ) {
                        setPreviewError("Chọn trường chỉ số trước khi xem trước.");
                        return;
                      }
                      if (
                        requiresAdvancedDimension(form.widgetType) &&
                        !form.dimensionField
                      ) {
                        setPreviewError("Chọn trường phân nhóm trước khi xem trước.");
                        return;
                      }
                      setIsPreviewLoading(true);
                      try {
                        const dataSourceConfig = buildAdvancedDataSourceConfig({
                          ...form,
                          queryMode: "advanced",
                        }) as DashboardWidget["dataSourceConfig"];
                        if (!dataSourceConfig) {
                          setPreviewError("Chưa có cấu hình nguồn dữ liệu.");
                          return;
                        }
                        const result = await previewAnalytics({
                          dataSourceConfig,
                        });
                        setPreviewResult(result);
                      } catch (error) {
                        setPreviewError(
                          error instanceof Error
                            ? error.message
                            : "Không thể xem trước truy vấn.",
                        );
                      } finally {
                        setIsPreviewLoading(false);
                      }
                    }}
                  >
                    {isPreviewLoading ? "Đang tải..." : "Xem trước kết quả"}
                  </button>
                </div>
                {previewError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {previewError}
                  </p>
                )}
                {compareUnsupported && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Widget này chỉ áp dụng lọc thời gian; so sánh chỉ hiển thị
                    cho KPI.
                  </p>
                )}
                {!previewError && !previewResult && !isPreviewLoading && (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-muted">
                    Chưa có dữ liệu xem trước.
                  </p>
                )}
                {previewResult &&
                  renderPreviewResult(previewResult, {
                    metricField: previewMetricField,
                    unit: previewUnit,
                  })}
              </div>

              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  if (!form.advancedSourceId) {
                    window.alert("Chọn nguồn dữ liệu trước khi áp dụng.");
                    return;
                  }
                  if (formulaValidationError) {
                    window.alert(formulaValidationError);
                    return;
                  }
                  if (timeValidationError) {
                    window.alert(timeValidationError);
                    return;
                  }
                  if (
                    form.aggregation !== "count" &&
                    !form.metricField &&
                    !form.advancedFormulaEnabled
                  ) {
                    window.alert("Chọn trường chỉ số trước khi áp dụng.");
                    return;
                  }
                  if (
                    requiresAdvancedDimension(form.widgetType) &&
                    !form.dimensionField
                  ) {
                    window.alert("Chọn trường phân nhóm trước khi áp dụng.");
                    return;
                  }
                  onChange({
                    ...form,
                    queryMode: "advanced",
                    datasetId:
                      form.advancedSourceType === "dataset"
                        ? form.advancedSourceId
                        : "",
                    viewId:
                      form.advancedSourceType === "view"
                        ? form.advancedSourceId
                        : "",
                    layerId:
                      form.advancedSourceType === "layer"
                        ? form.advancedSourceId
                        : "",
                    sourceName: advancedSourceName,
                    displayFields: Array.from(
                      new Set(
                        [
                          ...form.displayFields,
                          form.dimensionField,
                          form.metricField,
                        ].filter(Boolean),
                      ),
                    ),
                  });
                }}
              >
                Áp dụng cấu hình nâng cao
              </button>
            </div>
          )}

          {!isAdvanced &&
            form.widgetType !== "minimap" &&
            !isSpatialWidgetType(form.widgetType) && <div>
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium">Nguồn dữ liệu</label>
              <Link
                href="/quan-tri/saved-views"
                target="_blank"
                className="text-xs text-primary hover:underline"
              >
                + Tạo View mới
              </Link>
            </div>
            <p className="mb-1 text-xs text-muted">
              Chọn Saved View, Bộ dữ liệu hoặc Layer để lấy dữ liệu cho widget.
            </p>
            <select
              className={inputClass}
              required
              value={sourceValue}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(":");
                const sourceName =
                  kind === "dataset"
                    ? (datasets.find((dataset) => dataset.id === id)?.name ??
                      "")
                    : kind === "view"
                      ? (() => {
                          const view = savedViews.find(
                            (item) => item.id === id,
                          );
                          return view ? `${view.layerName} / ${view.name}` : "";
                        })()
                      : (dataSources.find((source) => source.layerId === id)
                          ?.layerName ?? "");
                const sourceFields =
                  kind === "dataset"
                    ? (
                        datasets.find((dataset) => dataset.id === id)?.config
                          .fields ?? []
                      ).map((field) => ({
                        code: field.key,
                        label: getFieldLabel(field.key, {
                          label: field.label,
                        }),
                      }))
                    : (() => {
                        const layerId =
                          kind === "view"
                            ? savedViews.find((view) => view.id === id)?.layerId
                            : id;
                        return (
                          dataSources.find(
                            (source) => source.layerId === layerId,
                          )?.fields ?? []
                        );
                      })();
                onChange({
                  ...form,
                  datasetId: kind === "dataset" ? id : "",
                  viewId: kind === "view" ? id : "",
                  layerId: kind === "legacy" ? id : "",
                  advancedSourceType:
                    kind === "view"
                      ? "view"
                      : kind === "legacy"
                        ? "layer"
                        : "dataset",
                  advancedSourceId: id,
                  sourceName,
                  metricField: "",
                  dimensionField: "",
                  displayFields: [],
                  advancedFilters: [],
                  advancedHavingFilters: [],
                  advancedFormulaEnabled: false,
                  advancedFormulaLabel: "",
                  advancedFormulaUnit: "",
                  advancedFormulaExpression: "",
                  advancedTimeEnabled: false,
                  advancedTimeDateField: "",
                  advancedTimePreset: "this_month",
                  advancedTimeCustomFrom: "",
                  advancedTimeCustomTo: "",
                  advancedTimeCompare: "none",
                  fieldLabels: Object.fromEntries(
                    sourceFields.map((field) => [
                      field.code,
                      getFieldLabel(field.code, field),
                    ]),
                  ),
                  titleField: "",
                  descriptionField: "",
                  startDateField: "",
                  dateField: "",
                  endDateField: "",
                  statusField: "",
                  groupField: "",
                  typeField: "",
                  severityField: "",
                  progressField: "",
                  ownerField: "",
                  deadlineField: "",
                  resultField: "",
                  metricFields: [],
                });
              }}
            >
              <option value="">— Chọn nguồn —</option>
              <optgroup label="Bộ dữ liệu">
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={`dataset:${dataset.id}`}>
                    {dataset.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Saved View">
                {savedViews.map((view) => (
                  <option key={view.id} value={`view:${view.id}`}>
                    {view.layerName} / {view.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Layer tương thích cũ">
                {dataSources.map((source) => (
                  <option
                    key={source.layerId}
                    value={`legacy:${source.layerId}`}
                  >
                    {source.layerName}
                  </option>
                ))}
              </optgroup>
            </select>
            {(selectedLayer || selectedDataset) && (
              <p className="mt-1 text-xs text-muted">
                {selectedDataset
                  ? `Bộ dữ liệu: ${selectedDataset.name} · ${selectedFields.length} trường`
                  : `Layer: ${selectedLayer?.layerName} · ${selectedFields.length} trường`}
              </p>
            )}
            {savedViews.length === 0 && !form.layerId && (
              <p className="mt-1 text-xs text-amber-700">
                Chưa có Saved View. Hãy tạo một view trước khi thêm widget dữ
                liệu.
              </p>
            )}
            {!isOperational &&
              !isMiniMap &&
              selectedDataset &&
              groupableFields.length === 0 && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Bộ dữ liệu chưa có trường phân nhóm. Hãy thêm field kiểu Văn
                  bản như loai_vung.
                </p>
              )}
          </div>}

          {!isAdvanced && isSpatialWidgetType(form.widgetType) && (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Phân tích không gian
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Tính số liệu bằng PostGIS theo quan hệ không gian giữa layer nguồn và layer phân vùng.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Layer nguồn</label>
                  <p className="mb-1 text-xs text-muted">
                    Lớp cần thống kê: point, line hoặc polygon.
                  </p>
                  <select
                    className={inputClass}
                    required
                    value={form.spatialSourceLayerId}
                    onChange={(event) => {
                      const layer = dataSources.find(
                        (item) => item.layerId === event.target.value,
                      );
                      onChange({
                        ...form,
                        spatialSourceLayerId: event.target.value,
                        spatialMetricField: "",
                        sourceName: layer?.layerName ?? form.sourceName,
                        layerId: event.target.value,
                      });
                    }}
                  >
                    <option value="">— Chọn layer nguồn —</option>
                    {spatialLayers.map((source) => (
                      <option key={source.layerId} value={source.layerId}>
                        {source.layerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Layer phân vùng</label>
                  <p className="mb-1 text-xs text-muted">
                    Lớp polygon dùng để gom nhóm, ví dụ ấp/xã.
                  </p>
                  <select
                    className={inputClass}
                    required
                    value={form.spatialZoneLayerId}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        spatialZoneLayerId: event.target.value,
                        spatialZoneLabelField: "",
                      })
                    }
                  >
                    <option value="">— Chọn layer phân vùng —</option>
                    {polygonLayers.map((source) => (
                      <option key={source.layerId} value={source.layerId}>
                        {source.layerName}
                      </option>
                    ))}
                  </select>
                  {polygonLayers.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Chưa có layer kiểu vùng/polygon để gom nhóm.
                    </p>
                  )}
                  {form.spatialZoneLayerId &&
                    !isPolygonGeometryType(spatialZoneLayer?.geometryType) && (
                      <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Layer phân vùng phải là kiểu vùng.
                      </p>
                    )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Trường tên vùng</label>
                  <p className="mb-1 text-xs text-muted">
                    Tên ấp/xã hiển thị trong kết quả.
                  </p>
                  <select
                    className={inputClass}
                    value={form.spatialZoneLabelField}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        spatialZoneLabelField: event.target.value,
                      })
                    }
                  >
                    <option value="">Tự nhận diện tên khu vực</option>
                    {spatialZoneLabelFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {getFieldLabel(field.code, field)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Metric</label>
                  <p className="mb-1 text-xs text-muted">
                    Số lượng, tổng, trung bình, nhỏ nhất hoặc lớn nhất.
                  </p>
                  <div className="grid grid-cols-[0.85fr_1.15fr] gap-2">
                    <select
                      className={inputClass}
                      value={form.spatialMetricAggregation}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          spatialMetricAggregation: event.target
                            .value as WidgetFormState["spatialMetricAggregation"],
                          spatialMetricField:
                            event.target.value === "count"
                              ? ""
                              : form.spatialMetricField,
                        })
                      }
                    >
                      <option value="count">Đếm</option>
                      <option value="sum">Tổng</option>
                      <option value="avg">Trung bình</option>
                      <option value="min">Nhỏ nhất</option>
                      <option value="max">Lớn nhất</option>
                    </select>
                    <select
                      className={inputClass}
                      disabled={form.spatialMetricAggregation === "count"}
                      value={form.spatialMetricField}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          spatialMetricField: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        {form.spatialMetricAggregation === "count"
                          ? "Không cần field"
                          : "— Chọn field số —"}
                      </option>
                      <option value="__geometry_area_m2">Diện tích geometry</option>
                      {spatialMetricFields.map((field) => (
                        <option key={field.code} value={field.code}>
                          {getFieldLabel(field.code, field)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    {form.widgetType === "spatial_ranking" ? "Top N" : "Giới hạn"}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={50}
                    value={form.limit}
                    onChange={(event) =>
                      onChange({ ...form, limit: Number(event.target.value) || 10 })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {!isAdvanced && isOperational && !isSpatialWidgetType(form.widgetType) && (
            <OperationalWidgetMappingFields
              widgetType={form.widgetType}
              fields={selectedFields}
              values={{
                titleField: form.titleField,
                descriptionField: form.descriptionField,
                startDateField: form.startDateField,
                dateField: form.dateField,
                endDateField: form.endDateField,
                statusField: form.statusField,
                groupField: form.groupField,
                typeField: form.typeField,
                severityField: form.severityField,
                areaField: form.areaField,
                progressField: form.progressField,
                ownerField: form.ownerField,
                deadlineField: form.deadlineField,
                resultField: form.resultField,
              }}
              metricFields={form.metricFields}
              limit={form.limit}
              onFieldChange={(key, value) =>
                onChange({ ...form, [key]: value })
              }
              onMetricFieldsChange={(metricFields) =>
                onChange({ ...form, metricFields })
              }
              onLimitChange={(limit) => onChange({ ...form, limit })}
            />
          )}

          {!isAdvanced && form.widgetType !== "map" && !isMiniMap && !isOperational && (
            <div>
              <label className="block text-sm font-medium">Tổng hợp</label>
              <p className="mb-1 text-xs text-muted">
                Cách tính số liệu: đếm, tổng, trung bình, top...
              </p>
              <select
                className={inputClass}
                value={form.aggregation}
                onChange={(e) =>
                  onChange({
                    ...form,
                    aggregation: e.target.value as AggregationType,
                  })
                }
              >
                {Object.entries(AGGREGATION_LABELS)
                  .filter(([code]) => {
                    if (form.widgetType === "progress_ring") {
                      return code === "avg" || code === "sum";
                    }
                    if (form.widgetType === "treemap") {
                      return code === "count" || code === "sum";
                    }
                    return code !== "top" || Boolean(selectedDataset);
                  })
                  .map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {!isAdvanced && needsNumericField && (
            <div>
              <label className="block text-sm font-medium">Trường chỉ số</label>
              <p className="mb-1 text-xs text-muted">
                Trường số dùng để tính toán, ví dụ: lợi nhuận, diện tích, sản
                lượng.
              </p>
              <select
                className={inputClass}
                required
                value={form.metricField}
                onChange={(e) =>
                  onChange({ ...form, metricField: e.target.value })
                }
              >
                <option value="">— Chọn trường —</option>
                {numericFields.map((field) => (
                  <option key={field.code} value={field.code}>
                    {field.label}
                  </option>
                ))}
              </select>
              {form.widgetType !== "ranking" && form.aggregation !== "top" && (
                <MetricUnitInput
                  value={form.unit}
                  onChange={(unit) => onChange({ ...form, unit })}
                />
              )}
              {selectedDataset && numericFields.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Bộ dữ liệu chưa có trường số phù hợp để làm chỉ số.
                </p>
              )}
            </div>
          )}

          {!isAdvanced && needsDimension && (
            <>
              <div>
                <label className="block text-sm font-medium">
                  Trường phân nhóm
                </label>
                <p className="mb-1 text-xs text-muted">
                  Trường dùng để chia nhóm, ví dụ: loại vùng, khu vực, trạng
                  thái.
                </p>
                <select
                  className={inputClass}
                  required={form.aggregation !== "top"}
                  value={form.dimensionField}
                  onChange={(e) =>
                    onChange({ ...form, dimensionField: e.target.value })
                  }
                >
                  <option value="">— Chọn trường —</option>
                  {groupableFields.map((field) => (
                    <option key={field.code} value={field.code}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.aggregation !== "top" && (
                <div>
                  <label className="block text-sm font-medium">
                    Số nhóm tối đa
                  </label>
                  <p className="mb-1 text-xs text-muted">
                    Giới hạn số nhóm hiển thị trong biểu đồ hoặc bảng xếp hạng.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className={inputClass}
                    value={form.limit}
                    onChange={(e) =>
                      onChange({ ...form, limit: Number(e.target.value) || 20 })
                    }
                  />
                </div>
              )}
            </>
          )}

          {!isAdvanced && form.aggregation === "top" && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
              <div>
                <p className="text-sm font-semibold text-violet-950">
                  Cấu hình xếp hạng
                </p>
                <p className="mt-1 text-xs text-violet-800">
                  Chọn đối tượng, nhóm phụ, chỉ số và cách xếp hạng.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Kiểu xếp hạng
                  </label>
                  <select
                    className={inputClass}
                    value={form.rankingMode}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        rankingMode: event.target.value as "top" | "bottom",
                        rankingSort:
                          event.target.value === "bottom" ? "asc" : "desc",
                      })
                    }
                  >
                    <option value="top">Top cao nhất</option>
                    <option value="bottom">Bottom thấp nhất</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Số lượng hiển thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={inputClass}
                    value={form.limit}
                    onChange={(e) =>
                      onChange({ ...form, limit: Number(e.target.value) || 5 })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">
                    Trường tên đối tượng
                  </label>
                  <select
                    className={inputClass}
                    value={form.rankingNameField}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        rankingNameField: event.target.value,
                        dimensionField: event.target.value || form.dimensionField,
                      })
                    }
                  >
                    <option value="">— Chọn tên —</option>
                    {rankingNameFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Trường nhóm phụ / loại
                  </label>
                  <select
                    className={inputClass}
                    value={form.rankingTypeField}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        rankingTypeField: event.target.value,
                      })
                    }
                  >
                    <option value="">— Không dùng —</option>
                    {rankingNameFields
                      .filter((field) => field.code !== form.rankingNameField)
                      .map((field) => (
                        <option key={field.code} value={field.code}>
                          {field.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Trường giá trị xếp hạng
                  </label>
                  <select
                    className={inputClass}
                    value={form.metricField}
                    onChange={(event) =>
                      onChange({ ...form, metricField: event.target.value })
                    }
                  >
                    <option value="">— Chọn chỉ số —</option>
                    {numericFields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <MetricUnitInput
                    value={form.unit}
                    onChange={(unit) => onChange({ ...form, unit })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showMedal}
                    onChange={(event) =>
                      onChange({ ...form, showMedal: event.target.checked })
                    }
                  />
                  Hiển thị huy chương
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showProgressBar}
                    onChange={(event) =>
                      onChange({ ...form, showProgressBar: event.target.checked })
                    }
                  />
                  Hiển thị thanh tiến độ
                </label>
              </div>
              <p className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-violet-900">
                Xếp hạng {form.rankingMode === "bottom" ? "Bottom" : "Top"}{" "}
                {form.limit || 5} theo {rankingMetricLabel || "chỉ số"}
                {rankingTypeLabel ? `, nhóm phụ ${rankingTypeLabel}` : ""}.
              </p>
            </div>
          )}

          {!isAdvanced && (form.widgetType === "table" || form.widgetType === "bar") &&
            form.aggregation !== "top" && (
              <div>
                <label className="block text-sm font-medium">
                  Cách hiển thị
                </label>
                <p className="mb-1 text-xs text-muted">
                  Chọn bảng xếp hạng để hiển thị huy hiệu thứ hạng và thanh tiến
                  độ theo giá trị cao nhất.
                </p>
                <select
                  className={inputClass}
                  value={form.renderVariant}
                  onChange={(event) =>
                    onChange({ ...form, renderVariant: event.target.value })
                  }
                >
                  <option value="default">
                    {form.widgetType === "bar" ? "Biểu đồ cột" : "Bảng dữ liệu"}
                  </option>
                  <option value="ranking">Bảng xếp hạng</option>
                </select>
              </div>
            )}

          {form.widgetType === "minimap" && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-xs text-emerald-800">
                Bản đồ tổng quan dùng cùng boundary, layer và style với trang
                bản đồ WebGIS.
              </p>
              <div>
                <label className="block text-sm font-medium">Chế độ layer</label>
                <p className="mb-1 text-xs text-muted">
                  Chọn cách MiniMap lấy các layer từ bản đồ chính.
                </p>
                <select
                  className={inputClass}
                  value={form.minimapLayerMode}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      minimapLayerMode: event.target.value as
                        | "visible"
                        | "all"
                        | "default",
                    })
                  }
                >
                  <option value="visible">Theo layer đang bật trên bản đồ</option>
                  <option value="all">Tất cả layer hiển thị trên bản đồ</option>
                  <option value="default">Các layer mặc định</option>
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckOption
                  label="Hiện ranh giới xã"
                  checked={form.showBoundary}
                  onChange={(showBoundary) =>
                    onChange({ ...form, showBoundary })
                  }
                />
                <CheckOption
                  label="Hiện chú giải"
                  checked={form.showLegend}
                  onChange={(showLegend) => onChange({ ...form, showLegend })}
                />
                <CheckOption
                  label="Tự động zoom"
                  checked={form.autoFitBounds}
                  onChange={(autoFitBounds) =>
                    onChange({ ...form, autoFitBounds })
                  }
                />
                <CheckOption
                  label="Cho phép tương tác"
                  checked={form.interactive}
                  onChange={(interactive) => onChange({ ...form, interactive })}
                />
              </div>
            </div>
          )}

          {form.widgetType === "progress_ring" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div>
                <label className="block text-sm font-medium">Mục tiêu</label>
                <p className="mb-1 text-xs text-muted">
                  Giá trị tương ứng với một vòng hoàn thành.
                </p>
                <input
                  type="number"
                  min={0.01}
                  className={inputClass}
                  value={form.target}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      target: Number(event.target.value) || 100,
                    })
                  }
                />
              </div>
            </div>
          )}

          {form.widgetType === "treemap" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
              <CheckOption
                label="Hiện chú giải"
                checked={form.showLegend}
                onChange={(showLegend) => onChange({ ...form, showLegend })}
              />
            </div>
          )}

          {form.widgetType === "seasonal_calendar" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <label className="block text-sm font-medium">
                Chế độ thời gian
              </label>
              <p className="mb-1 text-xs text-muted">
                Theo tháng hoặc gom thành bốn quý trong năm.
              </p>
              <select
                className={inputClass}
                value={form.seasonalMode}
                onChange={(event) =>
                  onChange({
                    ...form,
                    seasonalMode: event.target.value as "month" | "quarter",
                  })
                }
              >
                <option value="month">Theo tháng</option>
                <option value="quarter">Theo quý</option>
              </select>
            </div>
          )}

          {form.widgetType === "stat" && (
            <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Biểu tượng
                  </label>
                  <select
                    className={inputClass}
                    value={form.icon}
                    onChange={(e) =>
                      onChange({ ...form, icon: e.target.value })
                    }
                  >
                    <option value="auto">Tự động</option>
                    <option value="water">Nước / thủy lợi</option>
                    <option value="agriculture">Nông nghiệp</option>
                    <option value="warning">Cảnh báo</option>
                    <option value="money">Doanh thu / lợi nhuận</option>
                    <option value="area">Diện tích</option>
                    <option value="count">Số lượng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Màu nhấn</label>
                  <select
                    className={inputClass}
                    value={form.theme}
                    onChange={(e) =>
                      onChange({ ...form, theme: e.target.value })
                    }
                  >
                    <option value="sky">Xanh trời</option>
                    <option value="green">Xanh lá</option>
                    <option value="amber">Hổ phách</option>
                    <option value="rose">Đỏ hồng</option>
                    <option value="violet">Tím</option>
                    <option value="slate">Xám xanh</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Hậu tố hiển thị (tùy chọn)
                </label>
                <input
                  className={inputClass}
                  value={form.suffix}
                  onChange={(e) =>
                    onChange({ ...form, suffix: e.target.value })
                  }
                  placeholder="triệu đ, ha, %, ..."
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Chiều rộng (1–12)</label>
          <input
            type="number"
            min={1}
            max={12}
            className={inputClass}
            value={form.layoutW}
            onChange={(e) =>
              onChange({ ...form, layoutW: Number(e.target.value) || 3 })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Chiều cao (hàng)</label>
          <input
            type="number"
            min={1}
            max={8}
            className={inputClass}
            value={form.layoutH}
            onChange={(e) =>
              onChange({ ...form, layoutH: Number(e.target.value) || 2 })
            }
          />
        </div>
      </div>
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/80 bg-white px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
