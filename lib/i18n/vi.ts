import type { FieldTypeMeta } from "@/types/api/metadata";
import { getConfigFieldsForType } from "@/lib/fields/field-config";

/** Nhãn tiếng Việt cho kiểu trường (field type) */
export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Văn bản",
  textarea: "Văn bản dài",
  integer: "Số nguyên",
  decimal: "Số thập phân",
  money: "Tiền tệ",
  measurement: "Đo lường",
  quantity: "Sản lượng",
  phone: "Số điện thoại",
  boolean: "Có / Không",
  date: "Ngày",
  category: "Chọn một",
  multi_category: "Chọn nhiều",
  reference: "Tham chiếu",
  lat_lng: "Toạ độ",
  image: "Hình ảnh",
  file: "Tệp tin",
};

export const FIELD_TYPE_OPTIONS: FieldTypeMeta[] = Object.entries(
  FIELD_TYPE_LABELS,
).map(([type, label]) => ({ type, label }));

export function getFieldTypeLabel(type: string, apiLabel?: string): string {
  return FIELD_TYPE_LABELS[type] ?? apiLabel ?? type;
}

export function enrichFieldTypes(types: FieldTypeMeta[]): FieldTypeMeta[] {
  const base = types.length > 0 ? types : FIELD_TYPE_OPTIONS;
  return base.map((t) => ({
    ...t,
    label: getFieldTypeLabel(t.type, t.label),
    configFields: getConfigFieldsForType(t.type, t.configFields),
  }));
}

export const SCHEMA_STATUS_LABELS = {
  published: "Đã xuất bản",
  draft: "Bản nháp",
  none: "—",
} as const;

export const LAYER_STATUS_LABELS = {
  inactive: "Không hoạt động",
} as const;
