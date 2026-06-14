"use client";

import { useEffect, useState } from "react";
import { getDictionaryItems } from "@/lib/api/dictionaries";
import { getFieldUnitLabel } from "@/lib/fields/units";
import type { DictionaryItem } from "@/types/api/dictionary";
import type { SchemaField } from "@/types/api/schema";
import { LatLngField } from "./lat-lng-field";
import { AttachmentUploadField } from "./attachment-upload-field";
import { FieldWrapper, inputClass } from "./field-wrapper";

interface DynamicFieldProps {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function DynamicField({
  field,
  value,
  onChange,
  error,
}: DynamicFieldProps) {
  const required = Boolean(field.dataSchema?.required);
  const dictionaryCode = field.dataSchema?.dictionary as string | undefined;

  return (
    <div>
      <FieldWrapper label={field.label} required={required}>
        <DynamicFieldInput
          field={field}
          value={value}
          onChange={onChange}
          dictionaryCode={dictionaryCode}
        />
      </FieldWrapper>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange,
  dictionaryCode,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  dictionaryCode?: string;
}) {
  switch (field.fieldType) {
    case "textarea":
      return (
        <textarea
          className={inputClass}
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "boolean":
      return (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-border"
          />
          Có
        </label>
      );

    case "integer":
    case "decimal":
      return (
        <input
          type="number"
          className={inputClass}
          value={getPlainNumericValue(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );

    case "money":
    case "measurement":
    case "quantity":
      return (
        <TypedNumericField
          field={field}
          value={value}
          onChange={onChange}
        />
      );

    case "date":
      return (
        <input
          type="date"
          className={inputClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "category":
      return (
        <DictionarySelect
          dictionaryCode={dictionaryCode}
          value={value}
          onChange={onChange}
          multiple={false}
        />
      );

    case "multi_category":
      return (
        <DictionarySelect
          dictionaryCode={dictionaryCode}
          value={value}
          onChange={onChange}
          multiple
        />
      );

    case "lat_lng":
      return (
        <LatLngField
          value={value}
          onChange={onChange}
          required={Boolean(field.dataSchema?.required)}
        />
      );

    case "image":
      return (
        <AttachmentUploadField
          kind="image"
          value={value}
          onChange={onChange}
          dataSchema={field.dataSchema}
          required={Boolean(field.dataSchema?.required)}
        />
      );

    case "file":
      return (
        <AttachmentUploadField
          kind="file"
          value={value}
          onChange={onChange}
          dataSchema={field.dataSchema}
          required={Boolean(field.dataSchema?.required)}
        />
      );

    case "phone":
    case "text":
    default:
      return (
        <input
          type={field.fieldType === "phone" ? "tel" : "text"}
          className={inputClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function getPlainNumericValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  return "";
}

function getTypedNumericValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.sourceValue === "number") return String(obj.sourceValue);
    if (typeof obj.value === "number") return String(obj.value);
  }
  return "";
}

function TypedNumericField({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const unitLabel = getFieldUnitLabel(field.fieldType, field.dataSchema ?? {});

  return (
    <div>
      <input
        type="number"
        className={inputClass}
        value={getTypedNumericValue(value)}
        onChange={(e) =>
          onChange(
            e.target.value === "" ? null : { value: Number(e.target.value) },
          )
        }
      />
      {unitLabel && (
        <p className="mt-1 text-xs text-muted">Đơn vị: {unitLabel}</p>
      )}
    </div>
  );
}

function DictionarySelect({
  dictionaryCode,
  value,
  onChange,
  multiple,
}: {
  dictionaryCode?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  multiple: boolean;
}) {
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dictionaryCode) return;
    setLoading(true);
    getDictionaryItems(dictionaryCode)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [dictionaryCode]);

  if (!dictionaryCode) {
    return (
      <p className="text-sm text-muted">
        Chưa gắn danh mục cho trường này.
      </p>
    );
  }

  if (multiple) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    if (loading) {
      return <p className="text-sm text-muted">Đang tải giá trị...</p>;
    }
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted">
          Danh mục chưa có giá trị. Thêm giá trị trong Quản trị → Danh mục dùng
          chung.
        </p>
      );
    }
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        {items.map((item) => {
          const checked = selected.includes(item.code);
          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={loading}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, item.code]
                    : selected.filter((code) => code !== item.code);
                  onChange(next);
                }}
                className="rounded border-border"
              />
              {item.label}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <select
      className={inputClass}
      value={String(value ?? "")}
      disabled={loading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">— Chọn —</option>
      {items.map((item) => (
        <option key={item.id} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
