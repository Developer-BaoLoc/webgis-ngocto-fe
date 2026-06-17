import { getFieldTypeLabel } from "@/lib/i18n/vi";
import type { FieldTypeMeta } from "@/types/api/metadata";

const POINT_ONLY_TYPES = new Set(["lat_lng"]);
const POLYGON_ONLY_TYPES = new Set(["area_polygon"]);
const LINE_ONLY_TYPES = new Set(["line", "linestring"]);

function normalizeGeometryKind(geometryType: string): string {
  return geometryType.toLowerCase();
}

function isPolygonKind(kind: string): boolean {
  return kind === "polygon" || kind === "multipolygon";
}

function isLineKind(kind: string): boolean {
  return kind === "line" || kind === "linestring" || kind === "multilinestring";
}

/** Kiểu trường hình học theo loại lớp — point có lat_lng, polygon có area_polygon, line có line */
export function getFieldTypesForLayerGeometry(
  geometryType: string | undefined,
  fieldTypes: FieldTypeMeta[],
): FieldTypeMeta[] {
  const kind = normalizeGeometryKind(geometryType ?? "point");
  let filtered = fieldTypes;

  if (isPolygonKind(kind)) {
    filtered = fieldTypes.filter(
      (type) =>
        !POINT_ONLY_TYPES.has(type.type) && !LINE_ONLY_TYPES.has(type.type),
    );
    if (!filtered.some((type) => type.type === "area_polygon")) {
      filtered = [
        ...filtered,
        {
          type: "area_polygon",
          label: getFieldTypeLabel("area_polygon"),
          uiComponent: "area_polygon",
        },
      ];
    }
    return filtered;
  }

  if (kind === "point") {
    return fieldTypes.filter(
      (type) =>
        !POLYGON_ONLY_TYPES.has(type.type) && !LINE_ONLY_TYPES.has(type.type),
    );
  }

  if (isLineKind(kind)) {
    filtered = fieldTypes.filter(
      (type) =>
        !POINT_ONLY_TYPES.has(type.type) && !POLYGON_ONLY_TYPES.has(type.type),
    );
    if (!filtered.some((type) => type.type === "line")) {
      filtered = [
        ...filtered,
        {
          type: "line",
          label: getFieldTypeLabel("line"),
          uiComponent: "line",
        },
      ];
    }
    return filtered;
  }

  return fieldTypes.filter(
    (type) =>
      !POINT_ONLY_TYPES.has(type.type) &&
      !POLYGON_ONLY_TYPES.has(type.type) &&
      !LINE_ONLY_TYPES.has(type.type),
  );
}
