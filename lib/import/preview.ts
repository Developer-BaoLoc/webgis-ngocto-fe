import type { ImportPreviewResult } from "@/types/api/import";
import { formatCellValue } from "@/lib/schema/display";

export interface NormalizedPreview {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  warnings: string[];
  errors: string[];
}

export function normalizePreview(data: ImportPreviewResult): NormalizedPreview {
  const warnings = data.warnings ?? [];
  const errors = data.errors ?? [];

  if (data.previewRows && data.previewRows.length > 0) {
    const rows = data.previewRows.map((row) => {
      const base = row.mapped ?? row.data ?? row.raw ?? {};
      const record: Record<string, unknown> = { ...base };
      if (row.rowNumber !== undefined) record._row = row.rowNumber;
      if (row.errors?.length) record._errors = row.errors.join("; ");
      return record;
    });
    const headers = inferHeaders(rows);
    return {
      headers,
      rows,
      totalRows: data.totalRows,
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

export function formatPreviewValue(value: unknown): string {
  return formatCellValue(value);
}
