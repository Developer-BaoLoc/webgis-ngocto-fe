import type { GeometryKind } from "@/types/api/layer-catalog";
import type { LayerStyle } from "@/types/api/admin";

export interface Layer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  geometryType: string;
  geometryKind: GeometryKind;
  geometryTypeDisplay: string;
  geometryRequired: boolean;
  endpoint: string;
  hasGeometry: boolean;
  layerRole?: string;
  isSpatial?: boolean;
  showOnMap?: boolean;
  showInMapSidebar?: boolean;
  color: string;
  sortOrder: number;
  style?: Record<string, unknown> | LayerStyle;
}

export const geometryKindLabels: Record<string, string> = {
  point: "Điểm",
  polygon: "Vùng",
  line: "Đường",
  linestring: "Đường",
  sub_layer: "Lớp phụ",
  none: "Không có bản đồ",
};

const GEOMETRY_KIND_TO_TYPE: Record<string, string> = {
  point: "Point",
  polygon: "Polygon",
  line: "LineString",
  linestring: "LineString",
  sub_layer: "Lớp phụ",
  none: "None",
};

export function geometryKindToType(kind: string): string {
  return GEOMETRY_KIND_TO_TYPE[kind.toLowerCase()] ?? kind;
}
