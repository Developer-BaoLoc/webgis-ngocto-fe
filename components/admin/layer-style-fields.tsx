"use client";

import { LayerIconUploadField } from "@/components/admin/layer-icon-upload";
import type { StyleFieldMeta } from "@/types/api/metadata";
import type { LayerStyle } from "@/types/api/admin";
import { inputClass } from "@/components/form/field-wrapper";

interface LayerStyleFieldsProps {
  fields: StyleFieldMeta[];
  style: LayerStyle;
  onChange: (style: LayerStyle) => void;
}

function isIconUploadField(field: StyleFieldMeta): boolean {
  return field.type === "icon" || field.type === "icon_upload";
}

function styleValue(style: LayerStyle, key: string): string | number | undefined {
  if (key === "lineColor") return style.lineColor;
  if (key === "lineWidth") return style.lineWidth;
  if (key === "fillColor") return style.fillColor;
  if (key === "strokeColor") return style.strokeColor;
  return undefined;
}

export function LayerStyleFields({
  fields,
  style,
  onChange,
}: LayerStyleFieldsProps) {
  if (fields.length === 0) return null;

  function update(key: string, value: string | number) {
    if (key === "lineColor") {
      onChange({ ...style, lineColor: String(value) });
      return;
    }
    if (key === "lineWidth") {
      onChange({ ...style, lineWidth: Number(value) });
      return;
    }
    if (key === "fillColor") {
      onChange({ ...style, fillColor: String(value) });
      return;
    }
    if (key === "strokeColor") {
      onChange({ ...style, strokeColor: String(value) });
      return;
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-slate-50/50 p-4">
      <p className="text-sm font-medium text-foreground">Kiểu hiển thị bản đồ</p>
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
              <div className="mt-1.5 flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-border"
                  value={String(styleValue(style, field.key) ?? "#000000").slice(0, 7)}
                  onChange={(e) => update(field.key, e.target.value)}
                />
                <input
                  className={inputClass}
                  value={String(styleValue(style, field.key) ?? "")}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            ) : field.type === "number" ? (
              <input
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={styleValue(style, field.key) ?? ""}
                onChange={(e) =>
                  update(field.key, Number(e.target.value) || 0)
                }
              />
            ) : isIconUploadField(field) ? (
              <div className="mt-1.5">
                <LayerIconUploadField style={style} onChange={onChange} />
              </div>
            ) : (
              <input
                className={inputClass}
                value={String(styleValue(style, field.key) ?? "")}
                onChange={(e) => update(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
