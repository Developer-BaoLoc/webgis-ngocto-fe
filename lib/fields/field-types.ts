import { getFieldTypeLabel } from "@/lib/i18n/vi";
import type { FieldTypeMeta } from "@/types/api/metadata";

const POINT_ONLY_TYPES = new Set(["lat_lng"]);
const POLYGON_ONLY_TYPES = new Set(["area_polygon"]);

function normalizeGeometryKind(geometryType: string): string {
  return geometryType.toLowerCase();
}

/** Kiểu trường hình học theo loại lớp — polygon có area_polygon, point có lat_lng */
export function getFieldTypesForLayerGeometry(
  geometryType: string | undefined,
  fieldTypes: FieldTypeMeta[],
): FieldTypeMeta[] {
  const kind = normalizeGeometryKind(geometryType ?? "point");
  let filtered = fieldTypes;

  if (kind === "polygon") {
    filtered = fieldTypes.filter((type) => !POINT_ONLY_TYPES.has(type.type));
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
    return fieldTypes.filter((type) => !POLYGON_ONLY_TYPES.has(type.type));
  }

  if (kind === "line" || kind === "linestring") {
    return fieldTypes.filter(
      (type) =>
        !POINT_ONLY_TYPES.has(type.type) && !POLYGON_ONLY_TYPES.has(type.type),
    );
  }

  return fieldTypes;
}
