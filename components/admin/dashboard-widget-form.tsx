"use client";

import Link from "next/link";
import { useMemo } from "react";
import { inputClass } from "@/components/form/field-wrapper";
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

export interface WidgetFormState {
  widgetType: WidgetType;
  title: string;
  viewId: string;
  layerId: string;
  aggregation: AggregationType;
  metricField: string;
  dimensionField: string;
  limit: number;
  suffix: string;
  content: string;
  layoutW: number;
  layoutH: number;
}

export function emptyWidgetForm(): WidgetFormState {
  return {
    widgetType: "stat",
    title: "",
    viewId: "",
    layerId: "",
    aggregation: "count",
    metricField: "",
    dimensionField: "",
    limit: 20,
    suffix: "",
    content: "",
    layoutW: 3,
    layoutH: 2,
  };
}

export function widgetToForm(widget: DashboardWidget): WidgetFormState {
  return {
    widgetType: widget.widgetType,
    title: widget.title,
    viewId: widget.dataSourceConfig?.viewId ?? "",
    layerId: widget.dataSourceConfig?.layerId ?? "",
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
    suffix: String(widget.displayConfig?.suffix ?? ""),
    content: String(widget.displayConfig?.content ?? ""),
    layoutW: widget.layoutConfig.w,
    layoutH: widget.layoutConfig.h,
  };
}

export function formToWidget(
  form: WidgetFormState,
  index: number,
  existingId?: string,
): DashboardWidget {
  const needsDimension =
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";

  const dataSourceConfig =
    form.widgetType === "text"
      ? undefined
      : {
          ...(form.viewId ? { viewId: form.viewId } : {}),
          ...(!form.viewId && form.layerId ? { layerId: form.layerId } : {}),
          aggregation: form.aggregation,
          ...(form.metricField &&
          (form.aggregation === "sum" || form.aggregation === "avg")
            ? { metricField: form.metricField }
            : {}),
          ...(needsDimension && form.dimensionField
            ? { dimensionField: form.dimensionField }
            : {}),
          ...(needsDimension ? { limit: form.limit } : {}),
        };

  const displayConfig =
    form.widgetType === "text"
      ? { content: form.content }
      : form.suffix
        ? { suffix: form.suffix }
        : undefined;

  return {
    ...(existingId ? { id: existingId } : {}),
    widgetType: form.widgetType,
    title: form.title,
    layoutConfig: {
      x: (index % 2) * (form.layoutW >= 6 ? 0 : 3),
      y: index * form.layoutH,
      w: form.layoutW,
      h: form.layoutH,
    },
    ...(dataSourceConfig ? { dataSourceConfig } : {}),
    ...(displayConfig ? { displayConfig } : {}),
  };
}

interface WidgetFormFieldsProps {
  form: WidgetFormState;
  dataSources: DataSourceLayer[];
  savedViews: SavedView[];
  onChange: (form: WidgetFormState) => void;
}

export function WidgetFormFields({
  form,
  dataSources,
  savedViews,
  onChange,
}: WidgetFormFieldsProps) {
  const selectedView = useMemo(
    () => savedViews.find((view) => view.id === form.viewId),
    [savedViews, form.viewId],
  );
  const selectedLayer = useMemo(
    () =>
      dataSources.find(
        (source) =>
          source.layerId === (selectedView?.layerId ?? form.layerId),
      ),
    [dataSources, form.layerId, selectedView],
  );

  const numericFields =
    selectedLayer?.fields.filter((field) =>
      NUMERIC_FIELD_TYPES.has(field.fieldType),
    ) ?? [];
  const groupableFields =
    selectedLayer?.fields.filter((field) =>
      GROUPABLE_FIELD_TYPES.has(field.fieldType),
    ) ?? [];

  const needsNumericField =
    form.aggregation === "sum" || form.aggregation === "avg";
  const needsDimension =
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";
  const isText = form.widgetType === "text";
  const sourceValue = form.viewId
    ? `view:${form.viewId}`
    : form.layerId
      ? `legacy:${form.layerId}`
      : "";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Tiêu đề widget</label>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Kiểu widget</label>
        <select
          className={inputClass}
          value={form.widgetType}
          onChange={(e) => {
            const widgetType = e.target.value as WidgetType;
            const layoutW =
              widgetType === "stat" ? 3 : widgetType === "text" ? 12 : 6;
            const layoutH =
              widgetType === "stat" ? 2 : widgetType === "text" ? 2 : 4;
            onChange({ ...form, widgetType, layoutW, layoutH });
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
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium">
                Nguồn dữ liệu (Saved View)
              </label>
              <Link
                href="/quan-tri/saved-views"
                target="_blank"
                className="text-xs text-primary hover:underline"
              >
                + Tạo View mới
              </Link>
            </div>
            <select
              className={inputClass}
              required
              value={sourceValue}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(":");
                onChange({
                  ...form,
                  viewId: kind === "view" ? id : "",
                  layerId: kind === "legacy" ? id : "",
                  metricField: "",
                  dimensionField: "",
                });
              }}
            >
              <option value="">— Chọn Saved View —</option>
              {form.layerId && (
                <option value={`legacy:${form.layerId}`}>
                  {selectedLayer?.layerName ?? "Layer"} / Nguồn cũ (tương thích)
                </option>
              )}
              {savedViews.map((view) => (
                <option key={view.id} value={`view:${view.id}`}>
                  {view.layerName} / {view.name}
                </option>
              ))}
            </select>
            {selectedLayer && (
              <p className="mt-1 text-xs text-muted">
                Layer: {selectedLayer.layerName} · {selectedLayer.fields.length} trường
              </p>
            )}
            {savedViews.length === 0 && !form.layerId && (
              <p className="mt-1 text-xs text-amber-700">
                Chưa có Saved View. Hãy tạo một view trước khi thêm widget dữ liệu.
              </p>
            )}
          </div>

          {form.widgetType !== "map" && (
            <div>
              <label className="block text-sm font-medium">Tổng hợp</label>
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
                {Object.entries(AGGREGATION_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsNumericField && form.widgetType !== "map" && (
            <div>
              <label className="block text-sm font-medium">Metric field</label>
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
            </div>
          )}

          {needsDimension && (
            <>
              <div>
                <label className="block text-sm font-medium">
                  Dimension field
                </label>
                <select
                  className={inputClass}
                  required
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
              <div>
                <label className="block text-sm font-medium">
                  Số nhóm tối đa
                </label>
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
            </>
          )}

          {form.widgetType === "stat" && (
            <div>
              <label className="block text-sm font-medium">
                Hậu tố hiển thị (tùy chọn)
              </label>
              <input
                className={inputClass}
                value={form.suffix}
                onChange={(e) => onChange({ ...form, suffix: e.target.value })}
                placeholder="HTX, ha, ..."
              />
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
