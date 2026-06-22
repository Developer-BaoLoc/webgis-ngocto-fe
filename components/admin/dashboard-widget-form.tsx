"use client";

import Link from "next/link";
import { useMemo } from "react";
import { inputClass } from "@/components/form/field-wrapper";
import { OperationalWidgetMappingFields } from "@/components/admin/operational-widget-mapping-fields";
import {
  buildWidgetAutoTitle,
  getWidgetDisplayTitle,
  readWidgetFieldLabels,
} from "@/lib/dashboard/widget-labels";
import {
  AGGREGATION_LABELS,
  GROUPABLE_FIELD_TYPES,
  NUMERIC_FIELD_TYPES,
  WIDGET_TYPE_LABELS,
} from "@/lib/dashboard/utils";
import type {
  AggregationType,
  DashboardWidget,
  DataSourceLayer,
  WidgetType,
} from "@/types/api/dashboard";
import type { SavedView } from "@/types/api/saved-view";
import type { Dataset } from "@/types/api/dataset";

export interface WidgetFormState {
  widgetType: WidgetType;
  title: string;
  description: string;
  viewId: string;
  datasetId: string;
  layerId: string;
  sourceName: string;
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
  progressField: string;
  ownerField: string;
  deadlineField: string;
  resultField: string;
  metricFields: string[];
  suffix: string;
  icon: string;
  theme: string;
  renderVariant: string;
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
  minimapLayerMode: "active" | "all" | "default";
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
    progressField: "",
    ownerField: "",
    deadlineField: "",
    resultField: "",
    metricFields: [],
    suffix: "",
    icon: "auto",
    theme: "sky",
    renderVariant: "default",
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
    minimapLayerMode: "active",
    content: "",
    layoutW: 3,
    layoutH: 2,
  };
}

export function widgetToForm(widget: DashboardWidget): WidgetFormState {
  return {
    widgetType: widget.widgetType,
    title: getWidgetDisplayTitle(widget),
    description: String(widget.displayConfig?.description ?? ""),
    viewId: widget.dataSourceConfig?.viewId ?? "",
    datasetId: widget.dataSourceConfig?.datasetId ?? "",
    layerId: widget.dataSourceConfig?.layerId ?? "",
    sourceName: widget.dataSourceConfig?.name ?? "",
    aggregation: widget.dataSourceConfig?.aggregation ?? "count",
    metricField:
      widget.dataSourceConfig?.metricField ??
      widget.dataSourceConfig?.fieldCode ??
      "",
    dimensionField:
      widget.dataSourceConfig?.dimensionField ??
      widget.dataSourceConfig?.groupByFieldCode ??
      "",
    limit: widget.dataSourceConfig?.limit ?? 20,
    displayFields: widget.dataSourceConfig?.displayFields ?? [],
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
    progressField: widget.dataSourceConfig?.progressField ?? "",
    ownerField: widget.dataSourceConfig?.ownerField ?? "",
    deadlineField: widget.dataSourceConfig?.deadlineField ?? "",
    resultField: widget.dataSourceConfig?.resultField ?? "",
    metricFields: widget.dataSourceConfig?.metricFields ?? [],
    suffix: String(widget.displayConfig?.suffix ?? ""),
    icon: String(widget.displayConfig?.icon ?? "auto"),
    theme: String(widget.displayConfig?.theme ?? "sky"),
    renderVariant: String(widget.displayConfig?.variant ?? "default"),
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
        : "active",
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
  "seasonal_calendar",
]);

function isOperationalWidgetType(widgetType: WidgetType) {
  return OPERATIONAL_WIDGET_TYPES.has(widgetType);
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

export function formToWidget(
  form: WidgetFormState,
  index: number,
  existingId?: string,
): DashboardWidget {
  const isOperational = isOperationalWidgetType(form.widgetType);
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
      ...(form.dimensionField ? [form.dimensionField] : []),
      ...(form.metricField ? [form.metricField] : []),
    ]),
  );

  const dataSourceConfig =
    form.widgetType === "text" || form.widgetType === "minimap"
      ? undefined
      : {
          ...(form.viewId ? { viewId: form.viewId } : {}),
          ...(form.datasetId ? { datasetId: form.datasetId } : {}),
          ...(!form.datasetId && !form.viewId && form.layerId
            ? { layerId: form.layerId }
            : {}),
          ...(form.sourceName ? { name: form.sourceName } : {}),
          aggregation:
            isOperational || form.widgetType === "minimap"
              ? ("records" as const)
              : form.aggregation,
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
                  direction: form.rankingSort,
                },
                limit: form.limit,
                ...(topDisplayFields.length > 0
                  ? { displayFields: topDisplayFields }
                  : {}),
              }
            : {}),
          ...(isOperational ? buildOperationalDataSourceConfig(form) : {}),
        };

  const displayConfig = {
    ...(form.widgetType === "text" ? { content: form.content } : {}),
    ...(form.suffix ? { suffix: form.suffix } : {}),
    ...(form.description ? { description: form.description } : {}),
    ...(form.renderVariant !== "default"
      ? { variant: form.renderVariant }
      : {}),
    ...(form.widgetType === "ranking"
      ? {
          variant: "ranking",
          labelField: form.dimensionField,
          valueField: form.metricField,
          limit: form.limit,
          sort: form.rankingSort,
          showMedal: form.showMedal,
          showProgressBar: form.showProgressBar,
        }
      : {}),
    ...(form.widgetType === "stat"
      ? { icon: form.icon, theme: form.theme }
      : {}),
    ...(["progress_ring", "treemap"].includes(form.widgetType)
      ? { unit: form.unit }
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
    ...(["activity_feed", "seasonal_calendar"].includes(form.widgetType)
      ? {
          titleField: form.titleField,
          descriptionField: form.descriptionField,
          dateField: form.dateField,
          startDateField: form.startDateField,
          endDateField: form.endDateField,
          statusField: form.statusField,
          severityField: form.severityField,
          typeField: form.typeField,
          groupField: form.groupField,
          ...(form.widgetType === "seasonal_calendar"
            ? { mode: form.seasonalMode }
            : {}),
        }
      : {}),
    ...(Object.keys(form.fieldLabels).length
      ? { fieldLabels: form.fieldLabels }
      : {}),
  };

  const title =
    form.title.trim() ||
    (form.widgetType === "minimap"
      ? `Bản đồ ${form.sourceName || "dữ liệu"}`
      : form.widgetType === "progress_ring"
        ? `Tiến độ ${form.metricField ? (form.fieldLabels[form.metricField] ?? form.metricField) : "thực hiện"}`
        : form.widgetType === "activity_feed"
          ? "Hoạt động gần đây"
        : form.widgetType === "treemap"
          ? `Cơ cấu ${form.metricField ? (form.fieldLabels[form.metricField] ?? form.metricField) : "số lượng"}${form.dimensionField ? ` theo ${form.fieldLabels[form.dimensionField] ?? form.dimensionField}` : ""}`
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

export function WidgetFormFields({
  form,
  dataSources,
  savedViews,
  datasets,
  onChange,
}: WidgetFormFieldsProps) {
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
  const selectedFields = selectedDataset
    ? selectedDataset.config.fields.map((field) => ({
        code: field.key,
        label: field.label,
        fieldType: field.type,
      }))
    : (selectedLayer?.fields ?? []);

  const numericFields = selectedFields.filter((field) =>
    NUMERIC_FIELD_TYPES.has(field.fieldType),
  );
  const groupableFields = selectedFields.filter((field) =>
    GROUPABLE_FIELD_TYPES.has(field.fieldType),
  );

  const isOperational = isOperationalWidgetType(form.widgetType);
  const isMiniMap = form.widgetType === "minimap";
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
  const sourceValue = form.datasetId
    ? `dataset:${form.datasetId}`
    : form.viewId
      ? `view:${form.viewId}`
      : form.layerId
        ? `legacy:${form.layerId}`
        : "";
  const autoTitle = formToWidget({ ...form, title: "" }, 0).title;

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
                  : ["minimap", "activity_feed", "seasonal_calendar"].includes(
                        widgetType,
                      )
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
          {form.widgetType !== "minimap" && <div>
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
                        label: field.label,
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
                  sourceName,
                  metricField: "",
                  dimensionField: "",
                  displayFields: [],
                  fieldLabels: Object.fromEntries(
                    sourceFields.map((field) => [field.code, field.label]),
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

          {isOperational && (
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

          {form.widgetType !== "map" && !isMiniMap && !isOperational && (
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

          {needsNumericField && (
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
              {selectedDataset && numericFields.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Bộ dữ liệu chưa có trường số phù hợp để làm chỉ số.
                </p>
              )}
            </div>
          )}

          {needsDimension && (
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

          {form.aggregation === "top" && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
              <div>
                <p className="text-sm font-semibold text-violet-950">
                  Cấu hình bảng xếp hạng
                </p>
                <p className="mt-1 text-xs text-violet-800">
                  Dùng để xếp hạng theo giá trị cao nhất. Nên chọn trường chỉ
                  số, trường phân nhóm và các trường hiển thị.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Số dòng/nhóm tối đa
                </label>
                <p className="mb-1 text-xs text-muted">
                  Giới hạn số đối tượng xuất hiện trong bảng xếp hạng.
                </p>
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
              <div>
                <label className="block text-sm font-medium">
                  Trường hiển thị
                </label>
                <p className="mb-2 text-xs text-muted">
                  Trường đầu tiên là tên, trường thứ hai là mô tả phụ. Trường
                  chỉ số luôn được gửi kèm để hiển thị giá trị.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedFields
                    .filter((field) => field.code !== form.metricField)
                    .map((field) => (
                      <label
                        key={field.code}
                        className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.displayFields.includes(field.code)}
                          onChange={(event) =>
                            onChange({
                              ...form,
                              displayFields: event.target.checked
                                ? [...form.displayFields, field.code]
                                : form.displayFields.filter(
                                    (code) => code !== field.code,
                                  ),
                            })
                          }
                        />
                        {field.label}
                      </label>
                    ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Sắp xếp</label>
                  <select
                    className={inputClass}
                    value={form.rankingSort}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        rankingSort: event.target.value as "asc" | "desc",
                      })
                    }
                  >
                    <option value="desc">Giá trị cao xuống thấp</option>
                    <option value="asc">Giá trị thấp lên cao</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.showMedal}
                      onChange={(event) =>
                        onChange({ ...form, showMedal: event.target.checked })
                      }
                    />
                    Hiển thị huy chương Top 3
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
                    Hiển thị thanh tỷ lệ
                  </label>
                </div>
              </div>
            </div>
          )}

          {(form.widgetType === "table" || form.widgetType === "bar") &&
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
                        | "active"
                        | "all"
                        | "default",
                    })
                  }
                >
                  <option value="active">Theo layer đang bật trên bản đồ</option>
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
            <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-2">
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
              <div>
                <label className="block text-sm font-medium">Đơn vị</label>
                <p className="mb-1 text-xs text-muted">
                  Ví dụ: %, ha, triệu đ.
                </p>
                <input
                  className={inputClass}
                  value={form.unit}
                  onChange={(event) =>
                    onChange({ ...form, unit: event.target.value })
                  }
                  placeholder="%"
                />
              </div>
            </div>
          )}

          {form.widgetType === "treemap" && (
            <div className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Đơn vị</label>
                <input
                  className={inputClass}
                  value={form.unit}
                  onChange={(event) =>
                    onChange({ ...form, unit: event.target.value })
                  }
                  placeholder="ha, triệu đ, ..."
                />
              </div>
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
