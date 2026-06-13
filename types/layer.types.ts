import type { LayerCatalogStatus } from "./api/layer-catalog";
import type { GeoJsonGeometryType } from "./gis.types";

export interface Layer {
  id: string;
  /** Phase 1 layer code — prototype dùng id làm code tạm */
  code: string;
  name: string;
  description: string;
  geometryType: GeoJsonGeometryType | string;
  status: LayerCatalogStatus;
  endpoint: string;
  hasGeometry: boolean;
  color: string;
}

export const layerStatusLabels: Record<LayerCatalogStatus, string> = {
  planned: "Dự kiến",
  in_progress: "Đang triển khai",
  ready: "Sẵn sàng",
};
