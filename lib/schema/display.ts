import type { SchemaField } from "@/types/api/schema";

/** Cột hiển thị — ưu tiên displaySchema.visible !== false, fallback tất cả fields */
export function getDisplayFields(fields: SchemaField[]): SchemaField[] {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const visible = sorted.filter(
    (f) => f.displaySchema?.visible !== false,
  );
  return visible.length > 0 ? visible : sorted;
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    if ("value" in (value as object) && "unit" in (value as object)) {
      const v = value as { value: unknown; unit?: string };
      return v.unit ? `${v.value} ${v.unit}` : String(v.value);
    }
    return JSON.stringify(value);
  }
  return String(value);
}
