import { formatAttachmentList } from "@/lib/fields/attachments";

export const MONEY_UNIT_LABELS: Record<string, string> = {
  vnd: "VNĐ",
  hundred_thousand: "Trăm nghìn đồng",
  million: "Triệu đồng",
  billion: "Tỷ đồng",
};

export const MEASUREMENT_TYPE_LABELS: Record<string, string> = {
  distance: "Khoảng cách",
  area: "Diện tích",
};

export const DISTANCE_UNIT_LABELS: Record<string, string> = {
  m: "m",
  km: "km",
};

export const AREA_UNIT_LABELS: Record<string, string> = {
  m2: "m²",
  ha: "ha",
};

export const QUANTITY_UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  tan: "tấn",
  lit: "lít",
  m3: "m³",
  con: "con",
  bo: "bó",
  cay: "cây",
};

export function getMoneyUnitLabel(code?: string): string | undefined {
  return code ? MONEY_UNIT_LABELS[code] : undefined;
}

export function getMeasurementUnitLabel(
  measurementType?: string,
  unit?: string,
): string | undefined {
  if (!unit) return undefined;
  if (measurementType === "distance") return DISTANCE_UNIT_LABELS[unit] ?? unit;
  if (measurementType === "area") return AREA_UNIT_LABELS[unit] ?? unit;
  return DISTANCE_UNIT_LABELS[unit] ?? AREA_UNIT_LABELS[unit] ?? unit;
}

export function getQuantityUnitLabel(code?: string): string | undefined {
  return code ? QUANTITY_UNIT_LABELS[code] ?? code : undefined;
}

export function getFieldUnitLabel(
  fieldType: string,
  dataSchema: Record<string, unknown>,
): string | undefined {
  const unit = dataSchema.unit as string | undefined;
  switch (fieldType) {
    case "money":
      return getMoneyUnitLabel(unit);
    case "measurement":
      return getMeasurementUnitLabel(
        dataSchema.measurementType as string | undefined,
        unit,
      );
    case "quantity":
      return getQuantityUnitLabel(unit);
    default:
      return undefined;
  }
}

export function formatSchemaFieldValue(
  fieldType: string,
  value: unknown,
  dataSchema?: Record<string, unknown>,
): string {
  if (value === null || value === undefined) return "—";

  if (fieldType === "image" || fieldType === "file") {
    return formatAttachmentList(value);
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    if (fieldType === "money") {
      const amount =
        obj.sourceValue ?? obj.value ?? obj.amount;
      const unit = (obj.sourceUnit ?? obj.unit ?? dataSchema?.unit) as
        | string
        | undefined;
      if (amount === undefined || amount === null) return "—";
      const unitLabel = getMoneyUnitLabel(unit) ?? unit ?? "VNĐ";
      return `${amount} ${unitLabel}`;
    }

    if (fieldType === "measurement" || fieldType === "quantity") {
      const num = obj.value ?? obj.normalizedValue;
      const unit = (obj.unit ?? dataSchema?.unit) as string | undefined;
      if (num === undefined || num === null) return "—";
      const unitLabel =
        fieldType === "quantity"
          ? getQuantityUnitLabel(unit)
          : getMeasurementUnitLabel(
              (obj.measurementType ?? dataSchema?.measurementType) as string,
              unit,
            );
      return unitLabel ? `${num} ${unitLabel}` : String(num);
    }

    if ("value" in obj && "unit" in obj) {
      return `${obj.value} ${obj.unit}`;
    }
  }

  if (fieldType === "money" && dataSchema?.unit) {
    const unitLabel = getMoneyUnitLabel(String(dataSchema.unit));
    return unitLabel ? `${value} ${unitLabel}` : String(value);
  }

  return String(value);
}
