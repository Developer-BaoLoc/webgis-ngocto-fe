import type { DictionaryLabelMap } from "@/lib/dictionaries/labels";
import { formatCellValue } from "@/lib/schema/display";
import type { SchemaField } from "@/types/api/schema";

export type MeasurementUnitMode = "source" | "normalized";

export interface FormatRecordValueOptions {
  measurementUnitMode?: MeasurementUnitMode;
  dictionaryLabels?: DictionaryLabelMap;
  objectFallback?: "summary" | "json";
}

interface MeasurementValue {
  value?: unknown;
  unit?: unknown;
  normalizedValue?: unknown;
  normalizedUnit?: unknown;
  measurementType?: unknown;
}

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedUnitCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace("²", "2")
    .replace("³", "3");
}

function displayUnit(value: unknown) {
  const unit = normalizedUnitCode(value);
  if (unit === "tan" || unit === "ton" || unit === "t") return "tấn";
  if (unit === "lit" || unit === "liter" || unit === "litre" || unit === "l") return "lít";
  if (unit === "m2") return "m2";
  if (unit === "m3") return "m3";
  return String(value ?? "").trim();
}

export function isMeasurementRecordValue(
  value: unknown,
  field?: Pick<SchemaField, "fieldType">,
): value is MeasurementValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const object = value as MeasurementValue;
  const measurementField =
    field?.fieldType === "measurement" || field?.fieldType === "quantity";
  return Boolean(
    (measurementField ||
      object.measurementType ||
      object.normalizedValue !== undefined ||
      object.normalizedUnit) &&
      (object.value !== undefined || object.normalizedValue !== undefined) &&
      (object.unit || object.normalizedUnit),
  );
}

function deriveNormalizedMeasurement(
  value: number,
  unit: string,
  measurementType: string,
) {
  const code = normalizedUnitCode(unit);
  if (measurementType === "area") {
    if (code === "ha") return { value: value * 10_000, unit: "m2" };
    if (code === "m2") return { value, unit: "m2" };
  }
  if (measurementType === "distance") {
    if (code === "km") return { value: value * 1_000, unit: "m" };
    if (code === "m") return { value, unit: "m" };
  }
  if (measurementType === "quantity") {
    if (["tan", "ton", "t"].includes(code)) {
      return { value: value * 1_000, unit: "kg" };
    }
    if (code === "kg") return { value, unit: "kg" };
    if (["lit", "liter", "litre", "l"].includes(code)) {
      return { value, unit: "lít" };
    }
  }
  return null;
}

export function resolveMeasurementRecordValue(
  value: unknown,
  field: Pick<SchemaField, "fieldType" | "dataSchema">,
  mode: MeasurementUnitMode = "source",
) {
  if (!isMeasurementRecordValue(value, field)) return null;
  const object = value as MeasurementValue;
  const measurementType = String(
    field.fieldType === "quantity"
      ? "quantity"
      : object.measurementType ?? field.dataSchema?.measurementType ?? "",
  ).toLowerCase();
  const sourceValue = finiteNumber(object.value);
  const sourceUnit = String(object.unit ?? field.dataSchema?.unit ?? "");

  if (mode === "normalized") {
    const normalizedValue = finiteNumber(object.normalizedValue);
    const normalizedUnit = String(
      object.normalizedUnit ?? field.dataSchema?.normalizedUnit ?? "",
    );
    if (normalizedValue !== null && normalizedUnit) {
      return { value: normalizedValue, unit: displayUnit(normalizedUnit) };
    }
    if (sourceValue !== null && sourceUnit) {
      return deriveNormalizedMeasurement(sourceValue, sourceUnit, measurementType);
    }
  }

  if (sourceValue !== null) {
    return { value: sourceValue, unit: displayUnit(sourceUnit) };
  }
  const normalizedValue = finiteNumber(object.normalizedValue);
  if (normalizedValue !== null) {
    return {
      value: normalizedValue,
      unit: displayUnit(object.normalizedUnit),
    };
  }
  return null;
}

export function formatVietnameseNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatRecordValue(
  value: unknown,
  field: SchemaField,
  options: FormatRecordValueOptions = {},
) {
  if (isMeasurementRecordValue(value, field)) {
    const measurement = resolveMeasurementRecordValue(
      value,
      field,
      options.measurementUnitMode,
    );
    if (!measurement) return "—";
    return `${formatVietnameseNumber(measurement.value)}${
      measurement.unit ? ` ${measurement.unit}` : ""
    }`;
  }

  if (value && typeof value === "object") {
    const structuredTypes = new Set([
      "relationship",
      "multi_category",
      "image",
      "file",
      "lat_lng",
      "area_polygon",
      "line",
      "linestring",
      "money",
    ]);
    if (!structuredTypes.has(field.fieldType)) {
      return options.objectFallback === "json"
        ? JSON.stringify(value, null, 2)
        : "Dữ liệu cấu trúc";
    }
  }

  return formatCellValue(value, field, options.dictionaryLabels);
}

export function getRecordNumericValue(
  value: unknown,
  field: Pick<SchemaField, "fieldType" | "dataSchema">,
  measurementUnitMode: MeasurementUnitMode = "source",
) {
  const measurement = resolveMeasurementRecordValue(
    value,
    field,
    measurementUnitMode,
  );
  if (measurement) return measurement.value;
  return finiteNumber(value);
}
