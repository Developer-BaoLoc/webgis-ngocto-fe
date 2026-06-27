import type { FieldTypeMeta } from "@/types/api/metadata";

const NUMERIC_TYPES = new Set([
  "number",
  "integer",
  "decimal",
  "float",
  "double",
  "currency",
  "money",
  "numeric",
  "real",
  "bigint",
  "smallint",
  "measurement",
  "quantity",
]);

type FieldLike = {
  fieldType?: unknown;
  type?: unknown;
  dataType?: unknown;
  columnType?: unknown;
  dataSchema?: {
    type?: unknown;
  } | null;
};

function normalizeFieldType(type: unknown) {
  return String(type ?? "").trim().toLowerCase();
}

export function isNumericFieldType(type: unknown): boolean {
  return NUMERIC_TYPES.has(normalizeFieldType(type));
}

export function isNumericField(fieldOrType: FieldLike | unknown): boolean {
  if (typeof fieldOrType === "string") {
    return isNumericFieldType(fieldOrType);
  }
  if (!fieldOrType || typeof fieldOrType !== "object") {
    return false;
  }

  const field = fieldOrType as FieldLike;
  return [
    field.fieldType,
    field.type,
    field.dataType,
    field.columnType,
    field.dataSchema?.type,
  ].some(isNumericFieldType);
}

export const NUMERIC_FIELD_TYPES = NUMERIC_TYPES;

export function getFieldTypesForLayerGeometry(
  geometryType: string | null | undefined,
  fieldTypes: FieldTypeMeta[],
): FieldTypeMeta[] {
  const normalizedGeometry = String(geometryType ?? "").toLowerCase();
  return fieldTypes.filter((fieldType) => {
    const type = String(fieldType.type ?? "").toLowerCase();
    if (type === "lat_lng") {
      return (
        !normalizedGeometry ||
        normalizedGeometry.includes("point") ||
        normalizedGeometry === "none"
      );
    }
    if (type === "line" || type === "linestring") {
      return !normalizedGeometry || normalizedGeometry.includes("line");
    }
    if (type === "area_polygon") {
      return !normalizedGeometry || normalizedGeometry.includes("polygon");
    }
    return true;
  });
}
