"use client";

import { useMemo, useState } from "react";
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

export interface WidgetFormState {
  widgetType: WidgetType;
  title: string;
  layerId: string;
  aggregation: AggregationType;
  fieldCode: string;
  groupByFieldCode: string;
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
    layerId: "",
    aggregation: "count",
    fieldCode: "",
    groupByFieldCode: "",
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
    layerId: widget.dataSourceConfig?.layerId ?? "",
    aggregation: widget.dataSourceConfig?.aggregation ?? "count",
    fieldCode: widget.dataSourceConfig?.fieldCode ?? "",
    groupByFieldCode: widget.dataSourceConfig?.groupByFieldCode ?? "",
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
  const needsGroup =
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";

  const dataSourceConfig =
    form.widgetType === "text"
      ? undefined
      : {
          layerId: form.layerId,
          aggregation: form.aggregation,
          ...(form.fieldCode &&
          (form.aggregation === "sum" || form.aggregation === "avg")
            ? { fieldCode: form.fieldCode }
            : {}),
          ...(needsGroup && form.groupByFieldCode
            ? { groupByFieldCode: form.groupByFieldCode }
            : {}),
          ...(needsGroup ? { limit: form.limit } : {}),
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
  onChange: (form: WidgetFormState) => void;
}

export function WidgetFormFields({
  form,
  dataSources,
  onChange,
}: WidgetFormFieldsProps) {
  const selectedLayer = useMemo(
    () => dataSources.find((source) => source.layerId === form.layerId),
    [dataSources, form.layerId],
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
  const needsGroupBy =
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";
  const isText = form.widgetType === "text";
  const isMap = form.widgetType === "map";

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
            <label className="block text-sm font-medium">Lớp dữ liệu</label>
            <select
              className={inputClass}
              required
              value={form.layerId}
              onChange={(e) =>
                onChange({
                  ...form,
                  layerId: e.target.value,
                  fieldCode: "",
                  groupByFieldCode: "",
                })
              }
            >
              <option value="">— Chọn lớp —</option>
              {dataSources.map((source) => (
                <option key={source.layerId} value={source.layerId}>
                  {source.layerName}
                </option>
              ))}
            </select>
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

          {needsNumericField && (
            <div>
              <label className="block text-sm font-medium">Trường số</label>
              <select
                className={inputClass}
                required
                value={form.fieldCode}
                onChange={(e) =>
                  onChange({ ...form, fieldCode: e.target.value })
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

          {needsGroupBy && (
            <>
              <div>
                <label className="block text-sm font-medium">
                  Nhóm theo trường
                </label>
                <select
                  className={inputClass}
                  required
                  value={form.groupByFieldCode}
                  onChange={(e) =>
                    onChange({ ...form, groupByFieldCode: e.target.value })
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
