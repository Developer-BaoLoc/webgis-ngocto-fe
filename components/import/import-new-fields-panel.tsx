"use client";

import type {
  ImportColumnSuggestion,
  ImportCreateFieldPayload,
  ImportNewFieldType,
} from "@/types/api/import";
import { cn } from "@/lib/utils";

export interface ImportNewFieldDraft extends ImportCreateFieldPayload {
  sourceColumn: string;
  create: boolean;
}

const FIELD_TYPE_OPTIONS: Array<{
  value: ImportNewFieldType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "decimal", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
];

function titleFromCode(code: string): string {
  return code
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      create: true,
      code: suggestion?.code ?? column,
      label: suggestion?.label ?? titleFromCode(column),
      fieldType: suggestion?.suggestedType ?? "text",
      required: false,
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
        ...(field.dataSchema ?? {}),
        ...(field.required ? { required: true } : {}),
      },
    }));
}

export function newFieldMappingRows(
  drafts: ImportNewFieldDraft[],
): Array<{ sourceKey: string; fieldCode: string }> {
  return drafts
    .filter((field) => field.create && field.code.trim())
    .map((field) => ({
      sourceKey: field.sourceColumn,
      fieldCode: normalizeFieldCode(field.code),
    }));
}

export function ImportNewFieldsPanel({
  unknownColumns,
  suggestions = [],
  value,
  onChange,
}: {
  unknownColumns: string[];
  suggestions?: ImportColumnSuggestion[];
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

      <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-amber-50 text-left text-xs uppercase text-amber-900">
            <tr>
              <th className="px-3 py-2">Column trong file</th>
              <th className="px-3 py-2">Đã tồn tại</th>
              <th className="px-3 py-2">Tạo field mới</th>
              <th className="px-3 py-2">Field code</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Field type</th>
              <th className="px-3 py-2">Required</th>
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
                        updateRow(index, {
                          fieldType: event.target.value as ImportNewFieldType,
                        })
                      }
                      className={cn(
                        "h-9 w-32 rounded-md border border-border px-2 text-sm",
                        !row.create && "bg-slate-100 text-muted",
                      )}
                    >
                      {FIELD_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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
                        updateRow(index, { required: event.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {suggestion
                      ? `${suggestion.suggestedType} (${Math.round(
                          suggestion.confidence * 100,
                        )}%)`
                      : "text"}
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
