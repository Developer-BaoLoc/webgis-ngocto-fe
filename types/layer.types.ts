import type { GeometryKind } from "@/types/api/layer-catalog";

export interface Layer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  geometryKind: GeometryKind;
  /** MapLibre / icon display */
  geometryType: string;
  geometryRequired: boolean;
  endpoint: string;
  hasGeometry: boolean;
  color: string;
  sortOrder: number;
}

export const geometryKindLabels: Record<string, string> = {
  point: "Điểm",
  polygon: "Vùng",
  line: "Tuyến",
  none: "Không có bản đồ",
};

const GEOMETRY_KIND_TO_TYPE: Record<string, string> = {
  point: "Point",
  polygon: "Polygon",
  line: "LineString",
  none: "None",
};

export function geometryKindToType(kind: string): string {
  return GEOMETRY_KIND_TO_TYPE[kind] ?? kind;
}
