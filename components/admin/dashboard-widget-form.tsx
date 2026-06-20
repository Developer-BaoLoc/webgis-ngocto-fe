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
import type { Dataset } from "@/types/api/dataset";

export interface WidgetFormState {
  widgetType: WidgetType;
  title: string;
  description: string;
  viewId: string;
  datasetId: string;
  layerId: string;
  aggregation: AggregationType;
  metricField: string;
  dimensionField: string;
  limit: number;
  displayFields: string[];
  suffix: string;
  icon: string;
  theme: string;
  renderVariant: string;
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
    aggregation: "count",
    metricField: "",
    dimensionField: "",
    limit: 20,
    displayFields: [],
    suffix: "",
    icon: "auto",
    theme: "sky",
    renderVariant: "default",
    content: "",
    layoutW: 3,
    layoutH: 2,
  };
}

export function widgetToForm(widget: DashboardWidget): WidgetFormState {
  return {
    widgetType: widget.widgetType,
    title: widget.title,
    description: String(widget.displayConfig?.description ?? ""),
    viewId: widget.dataSourceConfig?.viewId ?? "",
    datasetId: widget.dataSourceConfig?.datasetId ?? "",
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
    displayFields: widget.dataSourceConfig?.displayFields ?? [],
    suffix: String(widget.displayConfig?.suffix ?? ""),
    icon: String(widget.displayConfig?.icon ?? "auto"),
    theme: String(widget.displayConfig?.theme ?? "sky"),
    renderVariant: String(widget.displayConfig?.variant ?? "default"),
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
    form.aggregation === "top" ||
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";

  const topDisplayFields = Array.from(
    new Set([
      ...form.displayFields,
      ...(form.dimensionField ? [form.dimensionField] : []),
      ...(form.metricField ? [form.metricField] : []),
    ]),
  );

  const dataSourceConfig =
    form.widgetType === "text"
      ? undefined
      : {
          ...(form.viewId ? { viewId: form.viewId } : {}),
          ...(form.datasetId ? { datasetId: form.datasetId } : {}),
          ...(!form.datasetId && !form.viewId && form.layerId
            ? { layerId: form.layerId }
            : {}),
          aggregation: form.aggregation,
          ...(form.metricField && form.aggregation !== "count"
            ? { metricField: form.metricField }
            : {}),
          ...(needsDimension && form.dimensionField
            ? { dimensionField: form.dimensionField }
            : {}),
          ...(needsDimension ? { limit: form.limit } : {}),
          ...(form.aggregation === "top" && form.metricField
            ? {
                sort: { field: form.metricField, direction: "desc" as const },
                limit: form.limit,
                ...(topDisplayFields.length > 0
                  ? { displayFields: topDisplayFields }
                  : {}),
              }
            : {}),
        };

  const displayConfig = {
    ...(form.widgetType === "text" ? { content: form.content } : {}),
    ...(form.suffix ? { suffix: form.suffix } : {}),
    ...(form.description ? { description: form.description } : {}),
    ...(form.renderVariant !== "default"
      ? { variant: form.renderVariant }
      : {}),
    ...(form.widgetType === "stat"
      ? { icon: form.icon, theme: form.theme }
      : {}),
  };

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

  const needsNumericField = form.aggregation !== "count";
  const needsDimension =
    form.aggregation === "top" ||
    form.widgetType === "bar" ||
    form.widgetType === "pie" ||
    form.widgetType === "donut" ||
    form.widgetType === "line" ||
    form.widgetType === "table";
  const isText = form.widgetType === "text";
  const sourceValue = form.datasetId
    ? `dataset:${form.datasetId}`
    : form.viewId
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
        <p className="mt-1 text-xs text-muted">
          Tên ngắn giúp người xem hiểu nội dung widget.
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
                onChange({
                  ...form,
                  datasetId: kind === "dataset" ? id : "",
                  viewId: kind === "view" ? id : "",
                  layerId: kind === "legacy" ? id : "",
                  metricField: "",
                  dimensionField: "",
                  displayFields: [],
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
            {selectedDataset && groupableFields.length === 0 && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Bộ dữ liệu chưa có trường phân nhóm. Hãy thêm field kiểu Văn bản
                như loai_vung.
              </p>
            )}
          </div>

          {form.widgetType !== "map" && (
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
                  .filter(
                    ([code]) => code !== "top" || Boolean(selectedDataset),
                  )
                  .map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {needsNumericField && form.widgetType !== "map" && (
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
            </div>
          )}

          {(form.widgetType === "table" || form.widgetType === "bar") &&
            form.aggregation !== "top" && (
            <div>
              <label className="block text-sm font-medium">Cách hiển thị</label>
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
                  {form.widgetType === "bar"
                    ? "Biểu đồ cột"
                    : "Bảng dữ liệu"}
                </option>
                <option value="ranking">Bảng xếp hạng</option>
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
