import { formatLatLng, isLatLngValue } from "@/lib/fields/lat-lng";
import { formatAreaPolygon, isAreaPolygonValue } from "@/lib/fields/area-polygon";
import { formatMultiCategoryValue } from "@/lib/fields/multi-category";
import { formatAttachmentList } from "@/lib/fields/attachments";
import { formatSchemaFieldValue } from "@/lib/fields/units";
import {
  formatDictionaryValue,
  type DictionaryLabelMap,
} from "@/lib/dictionaries/labels";
import type { SchemaField } from "@/types/api/schema";

/** Cột hiển thị — ưu tiên displaySchema.visible !== false, fallback tất cả fields */
export function getDisplayFields(fields: SchemaField[]): SchemaField[] {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const visible = sorted.filter(
    (f) => f.displaySchema?.visible !== false,
  );
  return visible.length > 0 ? visible : sorted;
}

const TABLE_SKIP_TYPES = new Set([
  "image",
  "file",
  "lat_lng",
  "area_polygon",
  "textarea",
]);

const TABLE_MAX_COLUMNS = 5;

/** Cột bảng danh sách — ưu tiên bắt buộc, giới hạn số cột để gọn UI */
export function getTableFields(fields: SchemaField[]): SchemaField[] {
  const display = getDisplayFields(fields);
  const candidates = display.filter((f) => !TABLE_SKIP_TYPES.has(f.fieldType));

  const required = candidates.filter((f) => f.dataSchema?.required);
  const optional = candidates.filter((f) => !f.dataSchema?.required);
  const picked = [...required, ...optional].slice(0, TABLE_MAX_COLUMNS);

  if (picked.length > 0) return picked;
  return display.slice(0, TABLE_MAX_COLUMNS);
}

export function formatCellValue(
  value: unknown,
  field?: Pick<SchemaField, "fieldType" | "dataSchema">,
  dictionaryLabels?: DictionaryLabelMap,
): string {
  if (value === null || value === undefined) return "—";
  if (isLatLngValue(value)) return formatLatLng(value);
  if (isAreaPolygonValue(value)) return formatAreaPolygon(value);

  if (field?.fieldType === "multi_category") {
    const dictionaryCode = field.dataSchema?.dictionary as string | undefined;
    const formatted = formatMultiCategoryValue(value, (code) => {
      if (!dictionaryLabels || !dictionaryCode) return null;
      return (
        formatDictionaryValue(
          { fieldType: "category", dataSchema: { dictionary: dictionaryCode } },
          code,
          dictionaryLabels,
        ) ?? null
      );
    });
    return formatted ?? "—";
  }

  if (field?.fieldType === "image" || field?.fieldType === "file") {
    return formatAttachmentList(value);
  }

  if (field && dictionaryLabels) {
    const dictionaryLabel = formatDictionaryValue(field, value, dictionaryLabels);
    if (dictionaryLabel) return dictionaryLabel;
  }

  if (field) {
    return formatSchemaFieldValue(
      field.fieldType,
      value,
      field.dataSchema as Record<string, unknown> | undefined,
    );
  }

  if (typeof value === "object") {
    if ("value" in (value as object)) {
      const v = value as { value: unknown; unit?: string };
      return v.unit ? `${v.value} ${v.unit}` : String(v.value);
    }
    return JSON.stringify(value);
  }

  return String(value);
}
