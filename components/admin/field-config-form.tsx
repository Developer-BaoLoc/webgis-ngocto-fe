"use client";

import type { ConfigFieldMeta } from "@/types/api/metadata";
import {
  getConfigFieldsForType,
  getVisibleConfigFields,
} from "@/lib/fields/field-config";
import { inputClass } from "@/components/form/field-wrapper";
import { DictionaryPicker } from "@/components/admin/dictionary-picker";

interface FieldConfigFormProps {
  fieldType: string;
  dataSchema: Record<string, unknown>;
  configFields?: ConfigFieldMeta[];
  onChange: (dataSchema: Record<string, unknown>) => void;
}

export function FieldConfigForm({
  fieldType,
  dataSchema,
  configFields,
  onChange,
}: FieldConfigFormProps) {
  const visibleFields = getVisibleConfigFields(
    fieldType,
    dataSchema,
    configFields,
  );

  if (visibleFields.length === 0) return null;

  function handleChange(key: string, value: string) {
    const next = { ...dataSchema, [key]: value };
    if (key === "measurementType") {
      delete next.unit;
    }
    onChange(next);
  }

  function handleNumberChange(key: string, value: string) {
    const next = { ...dataSchema };
    if (value === "") {
      delete next[key];
    } else {
      next[key] = Number(value);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-3">
      <p className="text-sm font-medium">Cấu hình kiểu dữ liệu</p>
      {visibleFields.map((field) => (
        <div key={`${field.key}-${field.label}`}>
          <label className="block text-sm font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.type === "dictionary" ? (
            <DictionaryPicker
              value={String(dataSchema[field.key] ?? "")}
              onChange={(code) => handleChange(field.key, code)}
              required={field.required}
            />
          ) : field.type === "number" ? (
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={
                dataSchema[field.key] === undefined
                  ? ""
                  : String(dataSchema[field.key])
              }
              onChange={(e) => handleNumberChange(field.key, e.target.value)}
              placeholder="20"
            />
          ) : (
            <select
              className={inputClass}
              required={field.required}
              value={String(dataSchema[field.key] ?? "")}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              <option value="">— Chọn —</option>
              {field.options?.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

export function hasFieldConfig(
  fieldType: string,
  configFields?: ConfigFieldMeta[],
): boolean {
  return getConfigFieldsForType(fieldType, configFields).length > 0;
}
