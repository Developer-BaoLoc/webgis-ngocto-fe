"use client";

import { FieldConfigForm } from "@/components/admin/field-config-form";
import {
  getConfigFieldsForType,
  validateFieldDataSchema,
} from "@/lib/fields/field-config";
import { getFieldTypeLabel } from "@/lib/i18n/vi";
import type {
  ImportColumnSuggestion,
  ImportCreateFieldPayload,
  ImportNewFieldType,
} from "@/types/api/import";
import type { FieldTypeMeta } from "@/types/api/metadata";
import { cn } from "@/lib/utils";
import { getFieldLabel } from "@/lib/fields/field-label";

export interface ImportNewFieldDraft extends ImportCreateFieldPayload {
  sourceColumn: string;
  create: boolean;
}

function defaultDataSchemaForType(
  fieldType: string,
  required?: boolean,
): Record<string, unknown> {
  return {
    ...(required ? { required: true } : {}),
    ...(fieldType === "image" || fieldType === "file" ? { maxCount: 20 } : {}),
    ...(fieldType === "relationship"
      ? {
          relationType: "many-to-one",
          targetPrimaryKey: "id",
          notFoundAction: "error",
        }
      : {}),
  };
}

function withRequiredFlag(
  dataSchema: Record<string, unknown>,
  required?: boolean,
): Record<string, unknown> {
  const next = { ...dataSchema };
  if (required) next.required = true;
  else delete next.required;
  return next;
}

function normalizeFieldCode(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 64);

  if (!normalized) return "field";
  return /^[a-z]/.test(normalized) ? normalized : `f_${normalized}`;
}

export function buildNewFieldDrafts(
  unknownColumns: string[] = [],
  suggestions: ImportColumnSuggestion[] = [],
  previous: ImportNewFieldDraft[] = [],
): ImportNewFieldDraft[] {
  const previousBySource = new Map(
    previous.map((field) => [field.sourceColumn, field]),
  );
  const suggestionsByCode = new Map(
    suggestions.map((suggestion) => [suggestion.code, suggestion]),
  );

  return unknownColumns.map((column) => {
    const existing = previousBySource.get(column);
    if (existing) return existing;

    const suggestion = suggestionsByCode.get(column);
    return {
      sourceColumn: column,
      create: false,
      code: suggestion?.code ?? column,
      label: suggestion?.label ?? getFieldLabel(column),
      fieldType: suggestion?.suggestedType ?? "text",
      required: false,
      dataSchema: defaultDataSchemaForType(suggestion?.suggestedType ?? "text"),
      uiSchema: {},
      displaySchema: {},
    };
  });
}

export function selectedNewFields(
  drafts: ImportNewFieldDraft[],
): ImportCreateFieldPayload[] {
  return drafts
    .filter((field) => field.create && field.code.trim() && field.label.trim())
    .map((field) => ({
      code: normalizeFieldCode(field.code),
      label: field.label.trim(),
      fieldType: field.fieldType,
      required: field.required,
      dataSchema: {
        ...withRequiredFlag(field.dataSchema ?? {}, field.required),
      },
      uiSchema: field.uiSchema ?? {},
      displaySchema: field.displaySchema ?? {},
    }));
}

export function newFieldMappingRows(
  drafts: ImportNewFieldDraft[],
): Array<{ sourceKey: string; fieldCode: string }> {
  return drafts
    .filter(
      (field) =>
        field.create &&
        field.code.trim() &&
        field.fieldType !== "image" &&
        field.fieldType !== "file",
    )
    .map((field) => ({
      sourceKey: field.sourceColumn,
      fieldCode: normalizeFieldCode(field.code),
    }));
}

export function validateNewFieldDrafts(
  drafts: ImportNewFieldDraft[],
  fieldTypes: FieldTypeMeta[],
): string | null {
  for (const field of drafts) {
    if (!field.create) continue;
    if (!field.code.trim() || !field.label.trim()) {
      return `Trường "${field.sourceColumn}" cần có mã và nhãn.`;
    }
    const selectedType = fieldTypes.find(
      (type) => type.type === field.fieldType,
    );
    const error = validateFieldDataSchema(
      field.fieldType,
      field.dataSchema ?? {},
      selectedType?.configFields,
    );
    if (error) {
      return `${field.label}: ${error}`;
    }
  }

  return null;
}

export function ImportNewFieldsPanel({
  unknownColumns,
  suggestions = [],
  fieldTypes,
  sourceLayerId,
  value,
  onChange,
}: {
  unknownColumns: string[];
  suggestions?: ImportColumnSuggestion[];
  fieldTypes: FieldTypeMeta[];
  sourceLayerId?: string;
  value: ImportNewFieldDraft[];
  onChange: (value: ImportNewFieldDraft[]) => void;
}) {
  if (unknownColumns.length === 0) return null;

  const suggestionsByCode = new Map(
    suggestions.map((suggestion) => [suggestion.code, suggestion]),
  );

  function updateRow(index: number, patch: Partial<ImportNewFieldDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateFieldType(index: number, fieldType: ImportNewFieldType) {
    const current = value[index];
    if (!current) return;
    updateRow(index, {
      fieldType,
      dataSchema: defaultDataSchemaForType(fieldType, current.required),
    });
  }

  function updateRequired(index: number, required: boolean) {
    const current = value[index];
    if (!current) return;
    updateRow(index, {
      required,
      dataSchema: withRequiredFlag(current.dataSchema ?? {}, required),
    });
  }

  function setAllCreate(create: boolean) {
    onChange(value.map((row) => ({ ...row, create })));
  }

  const selectedCount = value.filter((row) => row.create).length;

  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-950">
          Cột chưa có trong schema
        </h3>
        <p className="mt-1 text-sm text-amber-900">
          Chọn cột cần tạo field mới. Cột không chọn sẽ bị bỏ qua khi import.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-900">
          Chỉ các trường được chọn mới được tạo vào schema.
          {selectedCount === 0 && (
            <span className="font-semibold"> Hiện chưa chọn trường nào.</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllCreate(true)}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={() => setAllCreate(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-amber-50 text-left text-xs uppercase text-amber-900">
            <tr>
              <th className="px-3 py-2">Cột trong tệp</th>
              <th className="px-3 py-2">Đã tồn tại</th>
              <th className="px-3 py-2">Tạo trường mới</th>
              <th className="px-3 py-2">Mã trường</th>
              <th className="px-3 py-2">Nhãn</th>
              <th className="px-3 py-2">Kiểu dữ liệu</th>
              <th className="px-3 py-2">Bắt buộc</th>
              <th className="px-3 py-2">Cấu hình</th>
              <th className="px-3 py-2">Gợi ý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {value.map((row, index) => {
              const suggestion = suggestionsByCode.get(row.sourceColumn);
              return (
                <tr key={row.sourceColumn}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {row.sourceColumn}
                  </td>
                  <td className="px-3 py-2 text-red-600">Chưa có</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.create}
                      onChange={(event) =>
                        updateRow(index, { create: event.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.code}
                      disabled={!row.create}
                      onChange={(event) =>
                        updateRow(index, { code: event.target.value })
                      }
                      className={cn(
                        "h-9 w-40 rounded-md border border-border px-2 text-sm",
                        !row.create && "bg-slate-100 text-muted",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.label}
                      disabled={!row.create}
                      onChange={(event) =>
                        updateRow(index, { label: event.target.value })
                      }
                      className={cn(
                        "h-9 w-44 rounded-md border border-border px-2 text-sm",
                        !row.create && "bg-slate-100 text-muted",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.fieldType}
                      disabled={!row.create}
                      onChange={(event) =>
                        updateFieldType(index, event.target.value)
                      }
                      className={cn(
                        "h-9 w-44 rounded-md border border-border px-2 text-sm",
                        !row.create && "bg-slate-100 text-muted",
                      )}
                    >
                      {fieldTypes.map((option) => (
                        <option key={option.type} value={option.type}>
                          {option.label ?? getFieldTypeLabel(option.type)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.required ?? false}
                      disabled={!row.create}
                      onChange={(event) =>
                        updateRequired(index, event.target.checked)
                      }
                    />
                  </td>
                  <td className="min-w-72 px-3 py-2">
                    {row.create &&
                    getConfigFieldsForType(
                      row.fieldType,
                      fieldTypes.find((type) => type.type === row.fieldType)
                        ?.configFields,
                    ).length > 0 ? (
                      <FieldConfigForm
                        fieldType={row.fieldType}
                        dataSchema={row.dataSchema ?? {}}
                        configFields={
                          fieldTypes.find((type) => type.type === row.fieldType)
                            ?.configFields
                        }
                        sourceLayerId={sourceLayerId}
                        fieldCode={row.code}
                        onChange={(dataSchema) =>
                          updateRow(index, {
                            dataSchema: withRequiredFlag(
                              dataSchema,
                              row.required,
                            ),
                          })
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted">
                        Không cần cấu hình
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {suggestion
                      ? `${getFieldTypeLabel(suggestion.suggestedType)} (${Math.round(
                          suggestion.confidence * 100,
                        )}%)`
                      : getFieldTypeLabel("text")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
