import type {
  ImportPreviewResult,
  LayerImportValidationError,
} from "@/types/api/import";
import type { SchemaField } from "@/types/api/schema";
import type { DictionaryLabelMap } from "@/lib/dictionaries/labels";
import { formatCellValue } from "@/lib/schema/display";

export interface NormalizedPreview {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  previewCount?: number;
  validCount?: number;
  errorCount?: number;
  warnings: string[];
  errors: string[];
}

export interface LayerPreviewState {
  normalized: NormalizedPreview;
  canImport: boolean;
  validationErrors: LayerImportValidationError[];
  message?: string;
  validRows?: number;
  errorRows?: number;
}

function extractLegacyErrorMessages(
  errors: ImportPreviewResult["errors"],
): string[] {
  if (!errors?.length) return [];
  if (typeof errors[0] === "string") return errors as unknown as string[];
  return [];
}

function isValidationError(
  value: unknown,
): value is LayerImportValidationError {
  return (
    value !== null &&
    typeof value === "object" &&
    "message" in value &&
    "rowNumber" in value
  );
}

export function normalizeLayerPreview(data: ImportPreviewResult): LayerPreviewState {
  const validationErrors = (data.errors ?? []).filter(isValidationError);
  const normalized = normalizePreview({
    ...data,
    errors: [],
    validCount: data.validRows ?? data.validCount,
    errorCount: data.errorRows ?? data.errorCount,
  });

  return {
    normalized,
    canImport:
      data.canImport ?? (validationErrors.length === 0 && normalized.errorCount === 0),
    validationErrors,
    message: data.message,
    validRows: data.validRows,
    errorRows: data.errorRows,
  };
}

export function normalizePreview(data: ImportPreviewResult): NormalizedPreview {
  const warnings = data.warnings ?? [];
  const errors = extractLegacyErrorMessages(data.errors);

  if (data.previewRows && data.previewRows.length > 0) {
    const rows = data.previewRows.map((row) => {
      const base =
        row.properties ?? row.mapped ?? row.data ?? row.raw ?? {};
      const record: Record<string, unknown> = { ...base };
      if (row.rowNumber !== undefined) record._row = row.rowNumber;
      if (row.valid !== undefined) record._valid = row.valid;
      if (row.errors?.length) record._errors = row.errors.join("; ");
      return record;
    });
    const headers = inferHeaders(rows);
    const validCount =
      data.validCount ??
      data.validRows ??
      data.previewRows.filter((row) => row.valid !== false).length;
    const errorCount =
      data.errorCount ??
      data.errorRows ??
      data.previewRows.filter((row) => row.valid === false).length;
    return {
      headers,
      rows,
      totalRows: data.totalRows,
      previewCount: data.previewCount ?? data.previewRows.length,
      validCount,
      errorCount,
      warnings,
      errors,
    };
  }

  if (data.rows && data.rows.length > 0) {
    const first = data.rows[0];
    if (Array.isArray(first) && data.headers) {
      const rows = (data.rows as unknown[][]).map((row) => {
        const record: Record<string, unknown> = {};
        data.headers!.forEach((h, i) => {
          record[h] = row[i];
        });
        return record;
      });
      return { headers: data.headers, rows, totalRows: data.totalRows, warnings, errors };
    }

    const rows = data.rows as Record<string, unknown>[];
    return {
      headers: data.headers ?? inferHeaders(rows),
      rows,
      totalRows: data.totalRows,
      warnings,
      errors,
    };
  }

  return {
    headers: data.headers ?? [],
    rows: [],
    totalRows: data.totalRows ?? 0,
    warnings,
    errors,
  };
}

function inferHeaders(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (!k.startsWith("_")) keys.add(k);
    });
  }
  return Array.from(keys);
}

export function formatPreviewValue(
  value: unknown,
  field?: Pick<SchemaField, "fieldType" | "dataSchema">,
  dictionaryLabels?: DictionaryLabelMap,
): string {
  return formatCellValue(value, field, dictionaryLabels);
}
