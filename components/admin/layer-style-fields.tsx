"use client";

import { useEffect, useMemo, useState } from "react";
import { LayerIconUploadField } from "@/components/admin/layer-icon-upload";
import { inputClass } from "@/components/form/field-wrapper";
import { getLayerGeoJson, getLayerSchema } from "@/lib/api/layers";
import {
  createStyleRule,
  DEFAULT_DYNAMIC_FALLBACK,
  DYNAMIC_STYLE_PALETTE,
  valueIdentity,
} from "@/lib/layers/dynamic-style";
import { getFieldLabel, getOptionLabel } from "@/lib/fields/field-label";
import type {
  LayerStyle,
  LayerStyleRule,
  LayerStyleValue,
} from "@/types/api/admin";
import type { StyleFieldMeta } from "@/types/api/metadata";
import type { SchemaField } from "@/types/api/schema";

interface LayerStyleFieldsProps {
  fields: StyleFieldMeta[];
  style: LayerStyle;
  geometryType: string;
  layerId?: string;
  onChange: (style: LayerStyle) => void;
}

interface DynamicField {
  key: string;
  label: string;
  values: Array<{ value: LayerStyleValue; label: string }>;
}

const DYNAMIC_FIELD_TYPES = new Set([
  "text",
  "string",
  "select",
  "category",
  "enum",
  "boolean",
]);

function isIconUploadField(field: StyleFieldMeta): boolean {
  return field.type === "icon" || field.type === "icon_upload";
}

function styleValue(
  style: LayerStyle,
  key: string,
): string | number | undefined {
  if (key === "lineColor") return style.lineColor;
  if (key === "lineWidth") return style.lineWidth;
  if (key === "fillColor") return style.fillColor;
  if (key === "strokeColor") return style.strokeColor;
  return undefined;
}

function toStyleValue(value: unknown): LayerStyleValue | null {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : null;
}

function dictionaryValues(field: SchemaField): LayerStyleValue[] {
  const data = field.dataSchema ?? {};
  const ui = field.uiSchema ?? {};
  const collections = [
    data.options,
    data.values,
    data.dictionaryItems,
    ui.options,
    ui.values,
  ];
  const result: LayerStyleValue[] = [];
  for (const collection of collections) {
    if (
      collection &&
      typeof collection === "object" &&
      !Array.isArray(collection)
    ) {
      for (const key of Object.keys(collection)) result.push(key);
      continue;
    }
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const value = toStyleValue(
          record.value ?? record.code ?? record.key ?? record.id,
        );
        if (value !== null) result.push(value);
      } else {
        const value = toStyleValue(item);
        if (value !== null) result.push(value);
      }
    }
  }
  if (Array.isArray(data.enum)) {
    for (const item of data.enum) {
      const value = toStyleValue(item);
      if (value !== null) result.push(value);
    }
  }
  return result;
}

function ColorInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex min-w-[118px] gap-2">
      <input
        type="color"
        aria-label={ariaLabel}
        className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border"
        value={value.slice(0, 7)}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        aria-label={`${ariaLabel} dạng mã`}
        className={`${inputClass} min-w-0 font-mono text-xs`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function LayerStyleFields({
  fields,
  style,
  geometryType,
  layerId,
  onChange,
}: LayerStyleFieldsProps) {
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [featureProperties, setFeatureProperties] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!layerId) return;
    let active = true;
    setLoadingValues(true);
    setLoadError(null);
    Promise.all([getLayerSchema(layerId), getLayerGeoJson(layerId)])
      .then(([schema, geojson]) => {
        if (!active) return;
        setSchemaFields(
          schema.fields.filter((field) => field.isActive !== false),
        );
        setFeatureProperties(
          geojson.features.map((feature) => feature.properties ?? {}),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không tải được trường và giá trị của layer.",
        );
      })
      .finally(() => {
        if (active) setLoadingValues(false);
      });
    return () => {
      active = false;
    };
  }, [layerId]);

  const dynamicFields = useMemo<DynamicField[]>(
    () =>
      schemaFields
        .filter((field) =>
          DYNAMIC_FIELD_TYPES.has(field.fieldType.toLocaleLowerCase()),
        )
        .map((field) => {
          const unique = new Map<string, LayerStyleValue>();
          for (const properties of featureProperties) {
            const value = toStyleValue(properties[field.code]);
            if (value !== null && String(value).trim()) {
              unique.set(valueIdentity(value), value);
            }
          }
          for (const value of dictionaryValues(field)) {
            unique.set(valueIdentity(value), value);
          }
          return {
            key: field.code,
            label: getFieldLabel(field.code, field),
            values: [...unique.values()].map((value) => ({
              value,
              label: getOptionLabel(field.code, value, field),
            })),
          };
        }),
    [featureProperties, schemaFields],
  );

  const selectedField = dynamicFields.find(
    (field) => field.key === style.styleField,
  );
  const rules = style.styleRules ?? [];
  const fallback = {
    ...DEFAULT_DYNAMIC_FALLBACK,
    ...style.fallbackStyle,
  };
  const hasUploadedIcon = Boolean(style.iconAttachmentId || style.iconUrl);

  function update(key: string, value: string | number) {
    onChange({ ...style, [key]: value });
  }

  function setMode(mode: "single" | "by_value") {
    if (mode === "single") {
      onChange({
        ...style,
        styleMode: "single",
        styleField: undefined,
        styleRules: undefined,
        fallbackStyle: undefined,
      });
      return;
    }
    onChange({
      ...style,
      styleMode: "by_value",
      fallbackStyle: fallback,
    });
  }

  function rulesForField(fieldKey: string): LayerStyleRule[] {
    const field = dynamicFields.find((item) => item.key === fieldKey);
    return (field?.values ?? []).map((item, index) =>
      createStyleRule(item.value, item.label, index),
    );
  }

  function selectField(fieldKey: string) {
    onChange({
      ...style,
      styleMode: "by_value",
      styleField: fieldKey,
      styleRules: rulesForField(fieldKey),
      fallbackStyle: fallback,
    });
  }

  function updateRule(index: number, patch: Partial<LayerStyleRule>) {
    onChange({
      ...style,
      styleRules: rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    });
  }

  function generateColors() {
    const sourceRules = rules.length
      ? rules
      : selectedField
        ? rulesForField(selectedField.key)
        : [];
    onChange({
      ...style,
      styleRules: sourceRules.map((rule, index) => {
        const colors =
          DYNAMIC_STYLE_PALETTE[index % DYNAMIC_STYLE_PALETTE.length];
        return { ...rule, ...colors, lineColor: colors.fillColor };
      }),
    });
  }

  function resetDynamicStyle() {
    onChange({
      ...style,
      styleMode: "by_value",
      styleRules: selectedField ? rulesForField(selectedField.key) : [],
      fallbackStyle: DEFAULT_DYNAMIC_FALLBACK,
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-slate-50/50 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          Kiểu hiển thị bản đồ
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Chọn một màu chung hoặc phân màu từng đối tượng theo giá trị thuộc
          tính.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer gap-2 rounded-lg border border-border bg-white p-3 text-sm">
          <input
            type="radio"
            name="styleMode"
            checked={(style.styleMode ?? "single") === "single"}
            onChange={() => setMode("single")}
          />
          <span>
            <strong className="block">Một màu duy nhất</strong>
            <small className="text-muted">
              Áp dụng cùng màu cho toàn bộ layer.
            </small>
          </span>
        </label>
        <label className="flex cursor-pointer gap-2 rounded-lg border border-border bg-white p-3 text-sm">
          <input
            type="radio"
            name="styleMode"
            checked={style.styleMode === "by_value"}
            onChange={() => setMode("by_value")}
          />
          <span>
            <strong className="block">Tô màu theo giá trị trường</strong>
            <small className="text-muted">
              Mỗi giá trị có màu và chú giải riêng.
            </small>
          </span>
        </label>
      </div>

      {style.styleMode !== "by_value" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className={isIconUploadField(field) ? "sm:col-span-2" : undefined}
            >
              <label className="block text-sm font-medium text-foreground">
                {field.label}
              </label>
              {field.type === "color" ? (
                <div className="mt-1.5">
                  <ColorInput
                    ariaLabel={field.label}
                    value={String(styleValue(style, field.key) ?? "#000000")}
                    onChange={(value) => update(field.key, value)}
                  />
                </div>
              ) : field.type === "number" ? (
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClass}
                  value={styleValue(style, field.key) ?? ""}
                  onChange={(event) =>
                    update(field.key, Number(event.target.value) || 0)
                  }
                />
              ) : isIconUploadField(field) ? (
                <div className="mt-1.5">
                  <LayerIconUploadField style={style} onChange={onChange} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-sky-200 bg-white p-3">
          {geometryType === "point" && hasUploadedIcon && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Layer đang dùng icon upload. Màu động chỉ áp dụng khi dùng marker
              tròn mặc định; icon vẫn được giữ nguyên.
            </p>
          )}
          {!layerId && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Hãy tạo layer và các trường trước, sau đó mở sửa để cấu hình màu
              theo dữ liệu.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium">Trường phân màu</label>
            <p className="mb-1.5 text-xs text-muted">
              Chỉ hiển thị trường Văn bản, lựa chọn, phân loại hoặc Đúng/Sai.
            </p>
            <select
              className={inputClass}
              value={style.styleField ?? ""}
              disabled={loadingValues || !layerId}
              onChange={(event) => selectField(event.target.value)}
            >
              <option value="">
                {loadingValues ? "Đang tải trường..." : "Chọn trường"}
              </option>
              {dynamicFields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label} ({field.values.length} giá trị)
                </option>
              ))}
            </select>
            {loadError && (
              <p className="mt-1 text-xs text-red-600">{loadError}</p>
            )}
            {!loadingValues && layerId && dynamicFields.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Layer chưa có trường phân loại phù hợp.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!style.styleField}
              onClick={generateColors}
              className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Tự tạo màu
            </button>
            <button
              type="button"
              disabled={!style.styleField}
              onClick={() =>
                onChange({
                  ...style,
                  styleRules: [
                    ...rules,
                    createStyleRule("", "Giá trị mới", rules.length),
                  ],
                })
              }
              className="rounded-md border border-border bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              + Thêm rule
            </button>
            <button
              type="button"
              onClick={resetDynamicStyle}
              className="rounded-md border border-border bg-white px-3 py-2 text-xs font-medium"
            >
              Reset về mặc định
            </button>
          </div>

          {rules.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-[720px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Giá trị raw</th>
                    <th className="px-3 py-2">Nhãn hiển thị</th>
                    <th className="px-3 py-2">
                      {geometryType === "line" ? "Màu đường" : "Màu vùng"}
                    </th>
                    <th className="px-3 py-2">Màu viền</th>
                    <th className="w-12 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((rule, index) => (
                    <tr key={`${valueIdentity(rule.value)}-${index}`}>
                      <td className="px-3 py-2">
                        <input
                          className={inputClass}
                          value={String(rule.value)}
                          onChange={(event) =>
                            updateRule(index, { value: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={inputClass}
                          value={rule.label ?? ""}
                          onChange={(event) =>
                            updateRule(index, { label: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <ColorInput
                          ariaLabel={`Màu chính rule ${index + 1}`}
                          value={rule.fillColor ?? rule.lineColor ?? "#94a3b8"}
                          onChange={(value) =>
                            updateRule(index, {
                              fillColor: value,
                              ...(geometryType === "line"
                                ? { lineColor: value }
                                : {}),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <ColorInput
                          ariaLabel={`Màu viền rule ${index + 1}`}
                          value={rule.strokeColor ?? "#475569"}
                          onChange={(value) =>
                            updateRule(index, { strokeColor: value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          aria-label={`Xóa rule ${rule.label ?? rule.value}`}
                          onClick={() =>
                            onChange({
                              ...style,
                              styleRules: rules.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                          className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium">Màu mặc định</label>
              <p className="mb-1 text-[11px] text-muted">
                Dùng khi giá trị không khớp rule.
              </p>
              <ColorInput
                ariaLabel="Màu mặc định"
                value={fallback.fillColor}
                onChange={(value) =>
                  onChange({
                    ...style,
                    fallbackStyle: { ...fallback, fillColor: value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium">
                Màu viền mặc định
              </label>
              <p className="mb-1 text-[11px] text-muted">
                Áp dụng cho viền vùng hoặc đường.
              </p>
              <ColorInput
                ariaLabel="Màu viền mặc định"
                value={fallback.strokeColor}
                onChange={(value) =>
                  onChange({
                    ...style,
                    fallbackStyle: {
                      ...fallback,
                      strokeColor: value,
                      lineColor: value,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
