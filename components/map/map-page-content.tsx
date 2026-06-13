"use client";

import { MapView } from "@/components/map/map-view";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { wardConfig } from "@/config/ward.config";

export function MapPageContent() {
  const { catalog, error } = useLayerCatalog();

  const center = catalog?.project.center ?? wardConfig.center;
  const zoom = catalog?.project.defaultZoom ?? wardConfig.defaultZoom;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Không tải cấu hình bản đồ từ API. Dùng tọa độ mặc định Long Bình.
        </div>
      )}
      <MapView center={center} zoom={zoom} />
    </div>
  );
}
