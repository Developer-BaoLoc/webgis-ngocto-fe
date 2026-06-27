"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TemplatePreviewCard,
  type TemplateWidgetPreviewState,
} from "@/components/admin/dashboard-template-preview";
import { previewAnalytics } from "@/lib/api/analytics";
import { advancedQueryToDataSourceConfig } from "@/lib/dashboard/advanced-query";
import { isNoDataWidget } from "@/lib/dashboard/no-data-widgets";
import {
  getVirtualDataset,
  isVirtualDatasetId,
  previewVirtualDatasetAnalytics,
  virtualDatasetSnapshot,
} from "@/lib/dashboard/virtual-datasets";
import {
  applyDashboardTemplate,
  collectTemplatePlaceholders,
  hasUnresolvedPlaceholders,
  validateTemplateValues,
  type DashboardTemplate,
  type DashboardTemplatePlaceholder,
  type DashboardTemplatePlaceholderValues,
} from "@/lib/dashboard/templates";
import {
  buildTemplateAutoMapping,
  getFieldAutoCandidates,
  getPlaceholderSource,
  getSourceFieldsForTemplatePlaceholder,
  isTemplateFieldTypeValid,
  type TemplateMappingState,
} from "@/lib/dashboard/templates/auto-mapping";
import { getFieldLabel } from "@/lib/fields/field-label";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  isTopAnalyticsResult,
  type DashboardWidget,
  type DataSourceField,
  type DataSourceLayer,
} from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import { useMessage } from "@/providers/message-provider";

interface DashboardTemplateWizardProps {
  templates: DashboardTemplate[];
  customTemplateIds?: string[];
  aiTemplateIds?: string[];
  initialTemplateCode?: string;
  initialValues?: DashboardTemplatePlaceholderValues;
  dataSources: DataSourceLayer[];
  savedViews: SavedView[];
  datasets: Dataset[];
  existingWidgetCount: number;
  onCancel: () => void;
  onApply: (widgets: DashboardWidget[], mode: "append" | "replace") => void;
}

type HealthCheckItem = {
  label: string;
  ok: boolean;
  detail?: string;
};

function normalizeType(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isPolygonLayer(layer: DataSourceLayer) {
  const geometryType = normalizeType(layer.geometryType);
  return geometryType.includes("polygon") || geometryType.includes("area");
}

function geometryMatches(
  layer: DataSourceLayer,
  geometryType?: DashboardTemplatePlaceholder["geometryType"],
) {
  if (!geometryType || geometryType === "any") return true;
  if (geometryType === "polygon") return isPolygonLayer(layer);
  return normalizeType(layer.geometryType).includes(geometryType);
}

function fieldTypeMatches(
  field: DataSourceField,
  placeholder: DashboardTemplatePlaceholder,
) {
  return isTemplateFieldTypeValid(field, placeholder);
}

function optionLabelForField(field: DataSourceField) {
  return getFieldLabel(field.code, {
    label: field.label,
    name: field.label,
  });
}

function isFieldPlaceholder(placeholder: DashboardTemplatePlaceholder) {
  return (
    placeholder.kind === "field" ||
    placeholder.kind === "metric_field" ||
    placeholder.kind === "dimension_field" ||
    placeholder.kind === "date_field" ||
    placeholder.kind === "zone_label_field"
  );
}

function fieldsForPlaceholder(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[] = [],
) {
  return getSourceFieldsForTemplatePlaceholder(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
    allPlaceholders,
  );
}

function recommendedFieldsForPlaceholder(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[] = [],
) {
  return fieldsForPlaceholder(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
    allPlaceholders,
  ).filter((field) => fieldTypeMatches(field, placeholder));
}

function fieldPlaceholderEmptyText(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[],
) {
  const source = getPlaceholderSource(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
    allPlaceholders,
  );
  if (source.status === "missing_source") {
    return placeholder.sourceKey
      ? `Hãy chọn ${placeholder.sourceKey} trước.`
      : "Placeholder này chưa khai báo sourceKey, không thể lấy field.";
  }
  if (source.status === "ambiguous_source") {
    return "Placeholder này chưa khai báo sourceKey, không thể lấy field khi mẫu có nhiều nguồn.";
  }
  return `Không tìm thấy trường phù hợp trong ${source.sourceName}.`;
}

function fieldPlaceholderDebug(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[],
  fieldsCount: number,
) {
  if (process.env.NODE_ENV !== "development") return null;
  const source = getPlaceholderSource(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
    allPlaceholders,
  );
  const sourceText =
    source.status === "resolved"
      ? `${source.sourceType}:${source.sourceName}`
      : source.status;
  return (
    <span className="block rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">
      debug key={placeholder.key}; sourceKey={placeholder.sourceKey ?? "none"};
      source={sourceText}; fields={fieldsCount}
    </span>
  );
}

function mappingStatusClass(status?: TemplateMappingState["status"]) {
  if (status === "auto") return "bg-emerald-50 text-emerald-700";
  if (status === "manual") return "bg-amber-50 text-amber-700";
  if (status === "suggested") return "bg-sky-50 text-sky-700";
  return "bg-red-50 text-red-700";
}

function mappingStatusLabel(status?: TemplateMappingState["status"]) {
  if (status === "auto") return "✓ Tự động nhận diện";
  if (status === "manual") return "Đã chỉnh thủ công";
  if (status === "suggested") return "Có gợi ý";
  return "Chưa cấu hình";
}

function mappingConfidenceLabel(score?: number) {
  if (!score || score < 50) return "Thấp";
  if (score >= 80) return "Cao";
  return "Trung bình";
}

function mappingStatusText(state?: TemplateMappingState, hasValue?: boolean) {
  const status = state?.status ?? (hasValue ? "manual" : "missing");
  const label = mappingStatusLabel(status);
  if ((status === "auto" || status === "suggested") && state?.score) {
    return `${label} · ${mappingConfidenceLabel(state.score)}`;
  }
  return label;
}

function summarizeAnalyticsPreview(result: Awaited<ReturnType<typeof previewAnalytics>>) {
  if (isTopAnalyticsResult(result) || isRecordsAnalyticsResult(result)) {
    const count = result.records.length;
    return {
      status: count > 0 ? ("success" as const) : ("empty" as const),
      message: count > 0 ? `${count} bản ghi` : "Không có bản ghi",
      result,
    };
  }
  if (isGroupedAnalyticsResult(result)) {
    const count = result.rows.length;
    const hasValue = result.rows.some((row) => Number(row.value ?? 0) !== 0);
    return {
      status: count > 0 && hasValue ? ("success" as const) : ("empty" as const),
      message: count > 0 ? `${count} nhóm dữ liệu` : "Không có nhóm dữ liệu",
      result,
    };
  }
  return {
    status: Number(result.value ?? 0) !== 0 ? ("success" as const) : ("empty" as const),
    message: `Kết quả: ${result.value ?? 0}`,
    result,
  };
}

function resolveValueLabel(
  placeholder: DashboardTemplatePlaceholder,
  value: string | undefined,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  values: DashboardTemplatePlaceholderValues,
) {
  if (!value) return "Chưa chọn";
  if (placeholder.kind === "dataset") {
    return datasets.find((dataset) => dataset.id === value)?.name ?? value;
  }
  if (placeholder.kind === "saved_view") {
    return savedViews.find((view) => view.id === value)?.name ?? value;
  }
  if (
    placeholder.kind === "layer" ||
    placeholder.kind === "zone_layer"
  ) {
    return dataSources.find((source) => source.layerId === value)?.layerName ?? value;
  }
  const fields = fieldsForPlaceholder(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
  );
  const field = fields.find((item) => item.code === value);
  return field ? optionLabelForField(field) : value;
}

function placeholderHelp(placeholder: DashboardTemplatePlaceholder) {
  if (placeholder.description) return placeholder.description;
  if (placeholder.kind === "zone_layer") {
    return "Layer polygon dùng để gom nhóm kết quả theo ấp/xã/khu vực.";
  }
  if (placeholder.kind === "zone_label_field") {
    return "Trường tên vùng sẽ hiển thị trong bản đồ hoặc bảng kết quả.";
  }
  if (placeholder.kind === "metric_field") {
    return "Chọn trường số dùng để tính tổng, trung bình hoặc xếp hạng.";
  }
  if (placeholder.kind === "dimension_field") {
    return "Chọn trường dùng để phân nhóm dữ liệu.";
  }
  if (placeholder.kind === "date_field") {
    return "Chọn trường ngày nếu widget cần hiển thị theo thời gian.";
  }
  return "Chọn dữ liệu tương ứng để thay vào mẫu.";
}

function TemplateCard({
  template,
  selected,
  isCustom,
  isAi,
  onSelect,
}: {
  template: DashboardTemplate;
  selected: boolean;
  isCustom?: boolean;
  isAi?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{template.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted">
            {template.description}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
          {isAi
            ? "AI"
            : isCustom
              ? "Tự tạo"
              : `${template.widgets.length}`}
        </span>
      </div>
      {isAi && (
        <p className="mt-2 text-[11px] font-medium text-violet-700">
          Mẫu sinh từ AI Assistant
        </p>
      )}
      {isCustom && (
        <p className="mt-2 text-[11px] font-medium text-sky-700">
          Mẫu lưu trong trình duyệt
        </p>
      )}
      {template.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

export function DashboardTemplateWizard({
  templates,
  customTemplateIds = [],
  aiTemplateIds = [],
  initialTemplateCode,
  initialValues = {},
  dataSources,
  savedViews,
  datasets,
  existingWidgetCount,
  onCancel,
  onApply,
}: DashboardTemplateWizardProps) {
  const message = useMessage();
  const [selectedCode, setSelectedCode] = useState(
    initialTemplateCode ?? templates[0]?.code ?? "",
  );
  const [step, setStep] = useState<"pick" | "map">(
    initialTemplateCode ? "map" : "pick",
  );
  const [values, setValues] = useState<DashboardTemplatePlaceholderValues>({});
  const [applyMode, setApplyMode] = useState<"append" | "replace">("append");
  const [errors, setErrors] = useState<string[]>([]);
  const [mappingStates, setMappingStates] = useState<
    Record<string, TemplateMappingState>
  >({});
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [widgetPreviewStates, setWidgetPreviewStates] = useState<
    Record<string, TemplateWidgetPreviewState>
  >({});
  const [enabledWidgetIds, setEnabledWidgetIds] = useState<Set<string>>(
    () => new Set(templates[0]?.widgets.map((widget) => widget.templateWidgetId) ?? []),
  );
  const didInitializeMapping = useRef(false);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.code === selectedCode) ??
      templates[0],
    [selectedCode, templates],
  );

  useEffect(() => {
    if (!templates.length) return;
    if (!templates.some((template) => template.code === selectedCode)) {
      setSelectedCode(initialTemplateCode ?? templates[0].code);
    }
  }, [initialTemplateCode, selectedCode, templates]);

  useEffect(() => {
    if (
      initialTemplateCode &&
      templates.some((template) => template.code === initialTemplateCode)
    ) {
      setSelectedCode(initialTemplateCode);
    }
  }, [initialTemplateCode, templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setEnabledWidgetIds(
      new Set(selectedTemplate.widgets.map((widget) => widget.templateWidgetId)),
    );
    setWidgetPreviewStates({});
    setErrors([]);
  }, [selectedTemplate?.code]);

  useEffect(() => {
    if (
      didInitializeMapping.current ||
      step !== "map" ||
      !selectedTemplate
    ) {
      return;
    }
    const autoMapping = buildTemplateAutoMapping(
      selectedTemplate,
      dataSources,
      savedViews,
      datasets,
    );
    const mergedValues = { ...autoMapping.values, ...initialValues };
    setValues(mergedValues);
    setMappingStates({
      ...autoMapping.states,
      ...Object.fromEntries(
        Object.keys(initialValues).map((key) => [
          key,
          { status: "manual" as const },
        ]),
      ),
    });
    didInitializeMapping.current = true;
  }, [dataSources, datasets, initialValues, savedViews, selectedTemplate, step]);

  const enabledTemplateWidgets = useMemo(
    () =>
      selectedTemplate?.widgets.filter((widget) =>
        enabledWidgetIds.has(widget.templateWidgetId),
      ) ?? [],
    [enabledWidgetIds, selectedTemplate],
  );

  const mappingTemplate = useMemo(
    () =>
      selectedTemplate
        ? {
            ...selectedTemplate,
            widgets: enabledTemplateWidgets.filter(
              (widget) => !isNoDataWidget(widget.widgetType),
            ),
          }
        : null,
    [enabledTemplateWidgets, selectedTemplate],
  );

  const applyTemplate = useMemo(
    () =>
      selectedTemplate
        ? {
            ...selectedTemplate,
            widgets: enabledTemplateWidgets.map((widget) =>
              isNoDataWidget(widget.widgetType)
                ? {
                    ...widget,
                    dataSourceConfig: undefined,
                    placeholders: [],
                  }
                : widget,
            ),
          }
        : null,
    [enabledTemplateWidgets, selectedTemplate],
  );

  const placeholders = useMemo(
    () => (mappingTemplate ? collectTemplatePlaceholders(mappingTemplate) : []),
    [mappingTemplate],
  );

  function updateWidgetEnabled(templateWidgetId: string, enabled: boolean) {
    setEnabledWidgetIds((current) => {
      const next = new Set(current);
      if (enabled) next.add(templateWidgetId);
      else next.delete(templateWidgetId);
      return next;
    });
    setErrors([]);
  }

  function enableAllWidgets() {
    if (!selectedTemplate) return;
    setEnabledWidgetIds(
      new Set(selectedTemplate.widgets.map((widget) => widget.templateWidgetId)),
    );
    setErrors([]);
  }

  function disableErroredWidgets() {
    setEnabledWidgetIds((current) => {
      const next = new Set(current);
      for (const [key, state] of Object.entries(widgetPreviewStates)) {
        if (state.status === "error") next.delete(key);
      }
      return next;
    });
    setErrors([]);
  }

  function keepOnlyWidgetsWithData() {
    setEnabledWidgetIds((current) => {
      const next = new Set<string>();
      for (const key of current) {
        const widget = selectedTemplate?.widgets.find(
          (item) => item.templateWidgetId === key,
        );
        const state = widgetPreviewStates[key];
        if (
          widget &&
          (isNoDataWidget(widget.widgetType) || state?.status === "success")
        ) {
          next.add(key);
        }
      }
      return next;
    });
    setErrors([]);
  }

  function updateValue(key: string, value: string) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      const sourcePlaceholder = placeholders.find(
        (placeholder) => placeholder.key === key,
      );
      if (
        sourcePlaceholder?.kind === "layer" ||
        sourcePlaceholder?.kind === "zone_layer" ||
        sourcePlaceholder?.kind === "dataset" ||
        sourcePlaceholder?.kind === "saved_view"
      ) {
        for (const placeholder of placeholders) {
          if (isFieldPlaceholder(placeholder) && placeholder.sourceKey === key) {
            const fields = fieldsForPlaceholder(
              placeholder,
              next,
              dataSources,
              savedViews,
              datasets,
              placeholders,
            );
            const candidates = getFieldAutoCandidates(placeholder, fields);
            const best = candidates[0];
            if (
              best &&
              (candidates.length === 1 ||
                (best.score >= 80 && best.score > (candidates[1]?.score ?? 0) + 15))
            ) {
              next[placeholder.key] = best.id;
            } else {
              next[placeholder.key] = "";
            }
          }
        }
      }
      setMappingStates((currentStates) => {
        const nextStates = { ...currentStates };
        nextStates[key] = { status: value ? "manual" : "missing" };
        if (
          sourcePlaceholder?.kind === "layer" ||
          sourcePlaceholder?.kind === "zone_layer" ||
          sourcePlaceholder?.kind === "dataset" ||
          sourcePlaceholder?.kind === "saved_view"
        ) {
          for (const placeholder of placeholders) {
            if (isFieldPlaceholder(placeholder) && placeholder.sourceKey === key) {
              const fields = fieldsForPlaceholder(
                placeholder,
                next,
                dataSources,
                savedViews,
                datasets,
                placeholders,
              );
              const candidates = getFieldAutoCandidates(placeholder, fields);
              const best = candidates[0];
              if (
                best &&
                (candidates.length === 1 ||
                  (best.score >= 80 && best.score > (candidates[1]?.score ?? 0) + 15))
              ) {
                nextStates[placeholder.key] = {
                  status: "auto",
                  score: best.score,
                };
              } else if (best) {
                nextStates[placeholder.key] = {
                  status: "suggested",
                  suggestion: best.id,
                  score: best.score,
                };
              } else {
                nextStates[placeholder.key] = { status: "missing" };
              }
            }
          }
        }
        return nextStates;
      });
      return next;
    });
    setErrors([]);
  }

  function applySuggestion(placeholder: DashboardTemplatePlaceholder) {
    const suggestion = mappingStates[placeholder.key]?.suggestion;
    if (!suggestion) return;
    updateValue(placeholder.key, suggestion);
  }

  function validateMapping() {
    if (!selectedTemplate) return ["Chưa chọn mẫu dashboard."];
    if (enabledTemplateWidgets.length === 0) {
      return ["Cần bật ít nhất một tiện ích để tạo dashboard."];
    }
    const nextErrors = mappingTemplate
      ? validateTemplateValues(mappingTemplate, values)
      : [];

    for (const placeholder of placeholders) {
      const value = values[placeholder.key];
      if (!value) continue;

      if (placeholder.kind === "zone_layer") {
        const layer = dataSources.find((source) => source.layerId === value);
        if (layer && !isPolygonLayer(layer)) {
          nextErrors.push(`${placeholder.label} phải là lớp dữ liệu vùng.`);
        }
      }

      if (
        placeholder.kind === "field" ||
        placeholder.kind === "metric_field" ||
        placeholder.kind === "dimension_field" ||
        placeholder.kind === "date_field" ||
        placeholder.kind === "zone_label_field"
      ) {
        const fields = fieldsForPlaceholder(
          placeholder,
          values,
          dataSources,
          savedViews,
          datasets,
          placeholders,
        );
        const field = fields.find((item) => item.code === value);
        if (!field) {
          nextErrors.push(`${placeholder.label} không thuộc nguồn dữ liệu đã chọn.`);
        }
      }
    }

    const widgets = applyTemplate ? applyDashboardTemplate(applyTemplate, values) : [];
    if (widgets.some(hasUnresolvedPlaceholders)) {
      nextErrors.push("Mẫu vẫn còn placeholder chưa được thay thế.");
    }

    return nextErrors;
  }

  const mappingErrors = useMemo(() => validateMapping(), [
    selectedTemplate,
    mappingTemplate,
    applyTemplate,
    enabledTemplateWidgets.length,
    values,
    placeholders,
    dataSources,
    savedViews,
    datasets,
  ]);

  const readyToCreate = mappingErrors.length === 0 && enabledTemplateWidgets.length > 0;
  const resolvedWidgets = useMemo(
    () => (applyTemplate ? applyDashboardTemplate(applyTemplate, values) : []),
    [applyTemplate, values],
  );
  const resolvedWidgetByTemplateId = useMemo(() => {
    const map = new Map<string, DashboardWidget>();
    enabledTemplateWidgets.forEach((widget, index) => {
      const resolved = resolvedWidgets[index];
      if (resolved) map.set(widget.templateWidgetId, resolved);
    });
    return map;
  }, [enabledTemplateWidgets, resolvedWidgets]);
  const allResolvedWidgetByTemplateId = useMemo(() => {
    const map = new Map<string, DashboardWidget>();
    if (!selectedTemplate) return map;
    const template = {
      ...selectedTemplate,
      widgets: selectedTemplate.widgets.map((widget) =>
        isNoDataWidget(widget.widgetType)
          ? { ...widget, dataSourceConfig: undefined, placeholders: [] }
          : widget,
      ),
    };
    applyDashboardTemplate(template, values).forEach((widget, index) => {
      const templateWidget = selectedTemplate.widgets[index];
      if (templateWidget) map.set(templateWidget.templateWidgetId, widget);
    });
    return map;
  }, [selectedTemplate, values]);
  const disabledWidgetCount =
    (selectedTemplate?.widgets.length ?? 0) - enabledTemplateWidgets.length;
  const activeWidgetPreviewStates = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(widgetPreviewStates).filter(([key]) =>
          enabledWidgetIds.has(key),
        ),
      ) as Record<string, TemplateWidgetPreviewState>,
    [enabledWidgetIds, widgetPreviewStates],
  );
  const unresolvedWidgetTitles = useMemo(
    () =>
      enabledTemplateWidgets
        .map((templateWidget, index) => {
          const widget = resolvedWidgets[index];
          return widget && hasUnresolvedPlaceholders(widget)
            ? templateWidget.title
            : null;
        })
        .filter((title): title is string => Boolean(title)),
    [enabledTemplateWidgets, resolvedWidgets],
  );
  const widgetSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const widget of enabledTemplateWidgets) {
      const group =
        widget.widgetType === "stat"
          ? "KPI"
          : ["bar", "line", "pie", "donut", "treemap"].includes(widget.widgetType)
            ? "Chart"
            : widget.widgetType === "ranking" || widget.widgetType === "spatial_ranking"
              ? "Ranking"
              : widget.widgetType === "minimap" || widget.widgetType === "thematic_map"
                ? "Map"
                : widget.widgetType === "alert_center" || widget.widgetType === "spatial_alert"
                  ? "Alert"
                  : widget.widgetType;
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [enabledTemplateWidgets]);
  const previewSummary = useMemo(() => {
    const states = Object.values(activeWidgetPreviewStates);
    return {
      success: states.filter((state) => state.status === "success").length,
      empty: states.filter((state) => state.status === "empty").length,
      error: states.filter((state) => state.status === "error").length,
      incomplete: states.filter((state) => state.status === "incomplete").length,
      loading: states.filter((state) => state.status === "loading").length,
      noData: states.filter((state) => state.status === "no_data").length,
    };
  }, [activeWidgetPreviewStates]);
  const sourceSummary = useMemo(
    () =>
      placeholders
        .filter((placeholder) =>
          ["layer", "zone_layer", "dataset", "saved_view"].includes(placeholder.kind),
        )
        .map((placeholder) => ({
          label: placeholder.label,
          value: resolveValueLabel(
            placeholder,
            values[placeholder.key],
            dataSources,
            savedViews,
            datasets,
            values,
          ),
        })),
    [placeholders, values, dataSources, savedViews, datasets],
  );
  const healthCheckItems = useMemo<HealthCheckItem[]>(() => {
    const previews = Object.values(activeWidgetPreviewStates);
    const previewDone =
      enabledTemplateWidgets.length > 0 &&
      previews.every((state) => state.status !== "loading" && state.status !== "incomplete");
    const analyticsOk =
      enabledTemplateWidgets.length > 0 &&
      previews.every(
        (state) =>
          state.status === "success" ||
          state.status === "empty" ||
          state.status === "no_data",
      );
    return [
      {
        label: "Đủ placeholder",
        ok: unresolvedWidgetTitles.length === 0,
        detail: unresolvedWidgetTitles.length
          ? `Còn thiếu ở: ${unresolvedWidgetTitles.join(", ")}`
          : undefined,
      },
      {
        label: "Đủ liên kết bắt buộc",
        ok: mappingErrors.length === 0,
        detail: mappingErrors[0],
      },
      {
        label: "Xem trước hoàn tất",
        ok: previewDone,
        detail: previewDone ? undefined : "Một số tiện ích chưa xem trước xong hoặc chưa đủ cấu hình.",
      },
      {
        label: "Xem trước phân tích đạt yêu cầu",
        ok: analyticsOk,
        detail: analyticsOk ? undefined : "Có tiện ích xem trước bị lỗi hoặc chưa gọi được dịch vụ phân tích.",
      },
    ];
  }, [activeWidgetPreviewStates, enabledTemplateWidgets.length, mappingErrors, unresolvedWidgetTitles]);

  useEffect(() => {
    if (step !== "map" || !selectedTemplate) {
      setWidgetPreviewStates({});
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const initialStates: Record<string, TemplateWidgetPreviewState> = {};
      const previewJobs: Array<{
        key: string;
        widget: DashboardWidget;
      }> = [];

      selectedTemplate.widgets.forEach((templateWidget) => {
        const key = templateWidget.templateWidgetId;
        if (!enabledWidgetIds.has(key)) {
          initialStates[key] = {
            status: "disabled",
            message: "Đã tắt",
          };
          return;
        }
        if (isNoDataWidget(templateWidget.widgetType)) {
          initialStates[key] = {
            status: "no_data",
            message: "Không cần dữ liệu",
          };
          return;
        }
        const missingRequired = (templateWidget.placeholders ?? []).some(
          (placeholder) => placeholder.required && !values[placeholder.key],
        );
        const widget = resolvedWidgetByTemplateId.get(key);
        if (!widget || missingRequired || hasUnresolvedPlaceholders(widget)) {
          initialStates[key] = {
            status: "incomplete",
            message: "Chưa đủ cấu hình",
          };
          return;
        }

        if (!widget.dataSourceConfig) {
          initialStates[key] = {
            status: "success",
            message: "Không cần xem trước phân tích",
          };
          return;
        }

        const dataSourceConfig = advancedQueryToDataSourceConfig(
          widget.dataSourceConfig,
        );
        const hasSource =
          Boolean(dataSourceConfig.datasetId) ||
          Boolean(dataSourceConfig.viewId) ||
          Boolean(dataSourceConfig.layerId) ||
          Boolean(dataSourceConfig.spatial);

        if (!hasSource) {
          initialStates[key] = {
            status: "incomplete",
            message: "Chưa chọn nguồn dữ liệu",
          };
          return;
        }

        initialStates[key] = {
          status: "loading",
          message: "Đang tải bản xem trước...",
        };
        previewJobs.push({
          key,
          widget: {
            ...widget,
            dataSourceConfig,
          },
        });
      });

      setWidgetPreviewStates(initialStates);

      void Promise.all(
        previewJobs.map(async ({ key, widget }) => {
          try {
            const dataSourceConfig = widget.dataSourceConfig;
            if (!dataSourceConfig) return;
            const result = isVirtualDatasetId(dataSourceConfig.datasetId)
              ? await previewVirtualDatasetAnalytics(dataSourceConfig)
              : await previewAnalytics({ dataSourceConfig });
            if (cancelled) return;
            if (!result) {
              setWidgetPreviewStates((current) => ({
                ...current,
                [key]: {
                  status: "error",
                  message: "Dataset tạm không còn trong phiên builder.",
                },
              }));
              return;
            }
            const summary = summarizeAnalyticsPreview(result);
            setWidgetPreviewStates((current) => ({
              ...current,
              [key]: summary,
            }));
          } catch (err) {
            if (cancelled) return;
            setWidgetPreviewStates((current) => ({
              ...current,
              [key]: {
                status: "error",
                message: err instanceof Error ? err.message : "Xem trước thất bại",
              },
            }));
          }
        }),
      );

    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, selectedTemplate, values, enabledWidgetIds, resolvedWidgetByTemplateId]);

  function goToMapping() {
    if (selectedTemplate) {
      const autoMapping = buildTemplateAutoMapping(
        selectedTemplate,
        dataSources,
        savedViews,
        datasets,
      );
      setValues({ ...autoMapping.values, ...initialValues });
      setMappingStates({
        ...autoMapping.states,
        ...Object.fromEntries(
          Object.keys(initialValues).map((key) => [
            key,
            { status: "manual" as const },
          ]),
        ),
      });
    } else {
      setValues({});
      setMappingStates({});
    }
    setErrors([]);
    setShowHealthCheck(false);
    setStep("map");
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    const nextErrors = validateMapping();
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    if (applyMode === "replace" && existingWidgetCount > 0) {
      const confirmed = await message.confirm({ title: "Thay thế toàn bộ tiện ích?", description: "Các tiện ích hiện tại trong bản nháp sẽ được thay bằng các tiện ích đang bật trong mẫu.", confirmLabel: "Thay thế", danger: true });
      if (!confirmed) return;
    }
    const widgets = resolvedWidgets.map((widget) => {
      const datasetId = widget.dataSourceConfig?.datasetId;
      const virtualDataset = getVirtualDataset(datasetId);
      if (!virtualDataset || !widget.dataSourceConfig) return widget;
      return {
        ...widget,
        dataSourceConfig: {
          ...widget.dataSourceConfig,
          virtualDataset: virtualDatasetSnapshot(virtualDataset),
        },
      };
    });
    onApply(widgets, applyMode);
  }

  if (!selectedTemplate) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">Chưa có mẫu dashboard khả dụng.</p>
        <button type="button" onClick={onCancel} className="rounded-lg border px-3 py-2 text-sm">
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {step === "pick" ? (
        <>
          <div>
            <p className="text-sm text-muted">
              Chọn mẫu dashboard nội bộ, sau đó map layer/field thật từ hệ thống.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.code}
                template={template}
                selected={template.code === selectedTemplate.code}
                isCustom={customTemplateIds.includes(template.id)}
                isAi={aiTemplateIds.includes(template.id)}
                onSelect={() => setSelectedCode(template.code)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="button"
              onClick={goToMapping}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Dùng mẫu này
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {selectedTemplate.name}
            </p>
            <p className="mt-1 text-xs text-muted">
              {selectedTemplate.description}
            </p>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          {errors.length === 0 && !readyToCreate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {mappingErrors.slice(0, 4).map((error) => (
                <p key={error}>{error}</p>
              ))}
              {mappingErrors.length > 4 ? (
                <p>...và {mappingErrors.length - 4} cấu hình khác.</p>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {placeholders.map((placeholder) => {
              const value = values[placeholder.key] ?? "";
              const mappingState = mappingStates[placeholder.key];
              const isField =
                placeholder.kind === "field" ||
                placeholder.kind === "metric_field" ||
                placeholder.kind === "dimension_field" ||
                placeholder.kind === "date_field" ||
                placeholder.kind === "zone_label_field";
              const sourceResolution = isField
                ? getPlaceholderSource(
                    placeholder,
                    values,
                    dataSources,
                    savedViews,
                    datasets,
                    placeholders,
                  )
                : null;
              const sourceReady = sourceResolution?.status === "resolved";
              const fields = isField
                ? fieldsForPlaceholder(
                    placeholder,
                    values,
                    dataSources,
                    savedViews,
                    datasets,
                    placeholders,
                  )
                : [];
              const recommendedFields = isField
                ? recommendedFieldsForPlaceholder(
                    placeholder,
                    values,
                    dataSources,
                    savedViews,
                    datasets,
                    placeholders,
                  )
                : [];
              const fieldOptions =
                recommendedFields.length > 0 ? recommendedFields : fields;
              const typeFilterTooTight =
                isField && sourceReady && fields.length > 0 && recommendedFields.length === 0;
              const suggestionLabel = mappingState?.suggestion
                ? resolveValueLabel(
                    placeholder,
                    mappingState.suggestion,
                    dataSources,
                    savedViews,
                    datasets,
                    values,
                  )
                : "";

              return (
                <label key={placeholder.key} className="space-y-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                    <span>
                      {placeholder.label}
                      {placeholder.required ? " *" : ""}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${mappingStatusClass(
                        mappingState?.status ?? (value ? "manual" : "missing"),
                      )}`}
                    >
                      {mappingStatusText(mappingState, Boolean(value))}
                    </span>
                  </span>
                  {placeholder.kind === "layer" || placeholder.kind === "zone_layer" ? (
                    <select
                      value={value}
                      onChange={(event) =>
                        updateValue(placeholder.key, event.target.value)
                      }
                      className="ioc-select"
                    >
                      <option value="">Chọn lớp dữ liệu</option>
                      {dataSources
                        .filter((source) => geometryMatches(source, placeholder.geometryType))
                        .map((source) => (
                          <option key={source.layerId} value={source.layerId}>
                            {source.layerName}
                          </option>
                        ))}
                    </select>
                  ) : placeholder.kind === "dataset" ? (
                    <select
                      value={value}
                      onChange={(event) =>
                        updateValue(placeholder.key, event.target.value)
                      }
                      className="ioc-select"
                    >
                      <option value="">Chọn bộ dữ liệu</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.name}
                        </option>
                      ))}
                    </select>
                  ) : placeholder.kind === "saved_view" ? (
                    <select
                      value={value}
                      onChange={(event) =>
                        updateValue(placeholder.key, event.target.value)
                      }
                      className="ioc-select"
                    >
                      <option value="">Chọn chế độ xem đã lưu</option>
                      {savedViews.map((view) => (
                        <option key={view.id} value={view.id}>
                          {view.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={value}
                      disabled={!sourceReady}
                      onChange={(event) =>
                        updateValue(placeholder.key, event.target.value)
                      }
                      className="ioc-select"
                    >
                      <option value="">
                        {sourceReady ? "Chọn trường" : "Chọn nguồn trước"}
                      </option>
                      {fieldOptions.map((field) => (
                        <option key={field.code} value={field.code}>
                          {optionLabelForField(field)}
                          {!fieldTypeMatches(field, placeholder)
                            ? " (không khớp kiểu khuyến nghị)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {isField && sourceReady ? (
                    <span className="block text-xs text-slate-500">
                      Đang lấy field từ:{" "}
                      {sourceResolution.status === "resolved"
                        ? sourceResolution.sourceName
                        : "chưa xác định"}{" "}
                      · Số field khả dụng: {fieldOptions.length}
                    </span>
                  ) : null}
                  {typeFilterTooTight ? (
                    <span className="block rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      Không có field khớp kiểu khuyến nghị, đang hiển thị toàn bộ
                      field của source.
                    </span>
                  ) : null}
                  {isField && sourceReady && fields.length === 0 ? (
                    <span className="block rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      {fieldPlaceholderEmptyText(
                        placeholder,
                        values,
                        dataSources,
                        savedViews,
                        datasets,
                        placeholders,
                      )}
                    </span>
                  ) : null}
                  {isField && !sourceReady ? (
                    <span className="block rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      {fieldPlaceholderEmptyText(
                        placeholder,
                        values,
                        dataSources,
                        savedViews,
                        datasets,
                        placeholders,
                      )}
                    </span>
                  ) : null}
                  {isField && fields.length === 0
                    ? fieldPlaceholderDebug(
                        placeholder,
                        values,
                        dataSources,
                        savedViews,
                        datasets,
                        placeholders,
                        fields.length,
                      )
                    : null}
                  <span className="block text-xs text-muted">
                    {placeholderHelp(placeholder)}
                  </span>
                  {mappingState?.status === "suggested" && mappingState.suggestion ? (
                    <button
                      type="button"
                      onClick={() => applySuggestion(placeholder)}
                      className="text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      Áp dụng gợi ý: {suggestionLabel}
                    </button>
                  ) : null}
                </label>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Xem trước tiện ích sẽ tạo</p>
                <p className="text-xs text-muted">
                  {readyToCreate
                    ? "Đã sẵn sàng tạo. Lỗi xem trước phân tích vẫn không chặn việc tạo dashboard."
                    : "Chưa đủ cấu hình để tạo dashboard từ mẫu."}
                </p>
              </div>
              <label className="text-sm">
                <span className="mr-2 text-muted">Cách áp dụng</span>
                <select
                  value={applyMode}
                  onChange={(event) =>
                    setApplyMode(event.target.value as "append" | "replace")
                  }
                  className="ioc-select inline-block w-auto min-w-[13rem]"
                >
                  <option value="append">Thêm vào dashboard hiện tại</option>
                  <option value="replace">Thay thế widget hiện tại</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={enableAllWidgets}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Bật tất cả
              </button>
              <button
                type="button"
                onClick={disableErroredWidgets}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Tắt tất cả widget lỗi
              </button>
              <button
                type="button"
                onClick={keepOnlyWidgetsWithData}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Chỉ giữ widget có dữ liệu
              </button>
            </div>
            <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 px-3 py-3 text-xs md:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-800">
                  Dashboard sẽ tạo: {enabledTemplateWidgets.length}/
                  {selectedTemplate.widgets.length} widget
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                    {enabledTemplateWidgets.length} đang bật
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                    {disabledWidgetCount} đã tắt
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                    {previewSummary.success} success
                  </span>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
                    {previewSummary.noData} không cần dữ liệu
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                    {previewSummary.empty} empty
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                    {previewSummary.error} error
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                    {previewSummary.incomplete} incomplete
                  </span>
                  {previewSummary.loading > 0 ? (
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
                      {previewSummary.loading} loading
                    </span>
                  ) : null}
                  {widgetSummary.map(([label, count]) => (
                    <span
                      key={label}
                      className="rounded-full bg-white px-2 py-1 text-slate-600"
                    >
                      {count} {label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Nguồn dữ liệu</p>
                <div className="mt-1 space-y-1">
                  {sourceSummary.map((item) => (
                    <p key={item.label} className="truncate text-slate-600">
                      {item.label}: {item.value}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowHealthCheck((current) => !current)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Kiểm tra Template
              </button>
              {showHealthCheck && (
                <div className="mt-2 grid gap-2 rounded-lg border border-border bg-slate-50 p-3 text-xs md:grid-cols-2">
                  {healthCheckItems.map((item) => (
                    <div key={item.label} className="rounded-lg bg-white px-3 py-2">
                      <p
                        className={
                          item.ok
                            ? "font-medium text-emerald-700"
                            : "font-medium text-red-700"
                        }
                      >
                        {item.ok ? "✓" : "!"} {item.label}
                      </p>
                      {item.detail ? (
                        <p className="mt-1 text-slate-500">{item.detail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {selectedTemplate.widgets.map((widget) => (
                <TemplatePreviewCard
                  key={widget.templateWidgetId}
                  templateWidget={widget}
                  enabled={enabledWidgetIds.has(widget.templateWidgetId)}
                  onToggle={(enabled) =>
                    updateWidgetEnabled(widget.templateWidgetId, enabled)
                  }
                  resolvedWidget={
                    resolvedWidgetByTemplateId.get(widget.templateWidgetId) ??
                    allResolvedWidgetByTemplateId.get(widget.templateWidgetId)
                  }
                  state={widgetPreviewStates[widget.templateWidgetId]}
                />
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
              {placeholders.map((placeholder) => (
                <p key={placeholder.key}>
                  {placeholder.label}:{" "}
                  {resolveValueLabel(
                    placeholder,
                    values[placeholder.key],
                    dataSources,
                    savedViews,
                    datasets,
                    values,
                  )}
                </p>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setErrors([]);
                setStep("pick");
              }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Quay lại
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
                Hủy
              </button>
              <button
                type="button"
                disabled={!readyToCreate}
                onClick={() => void handleGenerate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tạo dashboard từ mẫu
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
