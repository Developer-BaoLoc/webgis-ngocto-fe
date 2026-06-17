import type { ConfigFieldMeta } from "@/types/api/metadata";
import {
  getMoneyUnitLabel,
  getMeasurementUnitLabel,
  getQuantityUnitLabel,
} from "@/lib/fields/units";

export const FALLBACK_CONFIG_FIELDS: Record<string, ConfigFieldMeta[]> = {
  money: [
    {
      key: "unit",
      label: "Đơn vị tiền tệ",
      required: true,
      type: "select",
      options: [
        { code: "vnd", label: "VNĐ" },
        { code: "hundred_thousand", label: "Trăm nghìn đồng" },
        { code: "million", label: "Triệu đồng" },
        { code: "billion", label: "Tỷ đồng" },
      ],
    },
  ],
  measurement: [
    {
      key: "measurementType",
      label: "Loại đo lường",
      required: true,
      type: "select",
      options: [
        { code: "distance", label: "Khoảng cách" },
        { code: "area", label: "Diện tích" },
      ],
    },
    {
      key: "unit",
      label: "Đơn vị khoảng cách",
      required: true,
      type: "select",
      dependsOn: { key: "measurementType", value: "distance" },
      options: [
        { code: "m", label: "m" },
        { code: "km", label: "km" },
      ],
    },
    {
      key: "unit",
      label: "Đơn vị diện tích",
      required: true,
      type: "select",
      dependsOn: { key: "measurementType", value: "area" },
      options: [
        { code: "m2", label: "m²" },
        { code: "ha", label: "ha" },
      ],
    },
  ],
  quantity: [
    {
      key: "unit",
      label: "Đơn vị sản lượng",
      required: true,
      type: "select",
      options: [
        { code: "kg", label: "kg" },
        { code: "tan", label: "tấn" },
        { code: "lit", label: "lít" },
        { code: "m3", label: "m³" },
        { code: "con", label: "con" },
        { code: "bo", label: "bó" },
        { code: "cay", label: "cây" },
      ],
    },
  ],
  category: [
    {
      key: "dictionary",
      label: "Danh mục dùng chung",
      required: true,
      type: "dictionary",
    },
  ],
  multi_category: [
    {
      key: "dictionary",
      label: "Danh mục dùng chung",
      required: true,
      type: "dictionary",
    },
  ],
  image: [
    {
      key: "maxCount",
      label: "Số ảnh tối đa",
      required: false,
      type: "number",
    },
  ],
  file: [
    {
      key: "maxCount",
      label: "Số file tối đa",
      required: false,
      type: "number",
    },
  ],
  relationship: [
    {
      key: "relationType",
      label: "Loại quan hệ",
      required: true,
      type: "select",
      options: [
        { code: "many-to-one", label: "Many-to-One" },
        { code: "one-to-many", label: "One-to-Many" },
        { code: "many-to-many", label: "Many-to-Many" },
      ],
    },
    {
      key: "targetLayerId",
      label: "Target Table / Layer",
      required: true,
      type: "layer",
    },
    {
      key: "foreignKey",
      label: "Foreign Key field",
      required: false,
      type: "text",
    },
    {
      key: "targetDisplayField",
      label: "Display Field",
      required: true,
      type: "field",
      sourceLayerKey: "targetLayerId",
    },
    {
      key: "matchField",
      label: "Match Field khi import",
      required: false,
      type: "field",
      sourceLayerKey: "targetLayerId",
    },
    {
      key: "notFoundAction",
      label: "Nếu import không tìm thấy",
      required: false,
      type: "select",
      options: [
        { code: "error", label: "Báo lỗi" },
        { code: "skip", label: "Bỏ qua dòng" },
        { code: "create_parent", label: "Tự tạo bản ghi cha (thiết kế trước)" },
      ],
    },
  ],
};

export function getConfigFieldsForType(
  fieldType: string,
  apiConfigFields?: ConfigFieldMeta[],
): ConfigFieldMeta[] {
  if (apiConfigFields?.length) return apiConfigFields;
  return FALLBACK_CONFIG_FIELDS[fieldType] ?? [];
}

export function isConfigFieldVisible(
  field: ConfigFieldMeta,
  dataSchema: Record<string, unknown>,
): boolean {
  if (!field.dependsOn) return true;
  return dataSchema[field.dependsOn.key] === field.dependsOn.value;
}

export function getVisibleConfigFields(
  fieldType: string,
  dataSchema: Record<string, unknown>,
  apiConfigFields?: ConfigFieldMeta[],
): ConfigFieldMeta[] {
  return getConfigFieldsForType(fieldType, apiConfigFields).filter((field) =>
    isConfigFieldVisible(field, dataSchema),
  );
}

export function validateFieldDataSchema(
  fieldType: string,
  dataSchema: Record<string, unknown>,
  apiConfigFields?: ConfigFieldMeta[],
): string | null {
  const visible = getVisibleConfigFields(fieldType, dataSchema, apiConfigFields);

  for (const field of visible) {
    if (!field.required) continue;
    const value = dataSchema[field.key];
    if (value === undefined || value === null || value === "") {
      return `Vui lòng chọn ${field.label.toLowerCase()}`;
    }
  }

  return null;
}

export function summarizeFieldDataSchema(
  fieldType: string,
  dataSchema: Record<string, unknown>,
): string {
  const parts: string[] = [];

  if (dataSchema.required) parts.push("bắt buộc");

  if (fieldType === "money" && dataSchema.unit) {
    const label = getMoneyUnitLabel(String(dataSchema.unit));
    parts.push(`đơn vị: ${label ?? String(dataSchema.unit)}`);
  }

  if (fieldType === "measurement") {
    if (dataSchema.measurementType) {
      parts.push(`loại: ${String(dataSchema.measurementType)}`);
    }
    if (dataSchema.unit) {
      const label = getMeasurementUnitLabel(
        String(dataSchema.measurementType),
        String(dataSchema.unit),
      );
      parts.push(`đơn vị: ${label ?? String(dataSchema.unit)}`);
    }
  }

  if (fieldType === "quantity" && dataSchema.unit) {
    const label = getQuantityUnitLabel(String(dataSchema.unit));
    parts.push(`đơn vị: ${label ?? String(dataSchema.unit)}`);
  }

  if (
    (fieldType === "category" || fieldType === "multi_category") &&
    dataSchema.dictionary
  ) {
    parts.push(`danh mục đã gắn`);
  }

  if (
    (fieldType === "image" || fieldType === "file") &&
    dataSchema.maxCount
  ) {
    parts.push(`tối đa ${String(dataSchema.maxCount)}`);
  }

  if (fieldType === "relationship") {
    if (dataSchema.relationType) {
      parts.push(`quan hệ: ${String(dataSchema.relationType)}`);
    }
    if (dataSchema.targetDisplayField) {
      parts.push(`hiển thị: ${String(dataSchema.targetDisplayField)}`);
    }
    if (dataSchema.foreignKey) {
      parts.push(`khóa ngoại: ${String(dataSchema.foreignKey)}`);
    }
  }

  return parts.join(" · ");
}
