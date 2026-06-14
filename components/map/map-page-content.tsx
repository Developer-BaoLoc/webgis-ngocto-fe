"use client";

import { MapView } from "@/components/map/map-view";
import { useWardBoundary } from "@/components/map/use-ward-boundary";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { normalizeMapViewConfig } from "@/lib/api/map-view";
import { wardConfig } from "@/config/ward.config";
import { normalizeMapCenter } from "@/lib/map/vietnam";
import type { MapViewConfig, MapViewConfigInput } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

interface MapPageContentProps {
  mapView?: MapViewConfig | null;
  boundary?: GeoJsonFeatureCollection | null;
  boundaryError?: string | null;
  fullscreen?: boolean;
}

function buildMapView(
  catalogMapView: MapViewConfigInput | undefined,
  catalogCenter: { lat: number; lng: number } | undefined,
  catalogZoom: number | undefined,
): MapViewConfig {
  if (catalogMapView) {
    return normalizeMapViewConfig(catalogMapView);
  }

  return {
    center: normalizeMapCenter(catalogCenter ?? wardConfig.center),
    zoom: catalogZoom ?? wardConfig.defaultZoom,
  };
}

export function MapPageContent({
  mapView: mapViewProp,
  boundary = null,
  boundaryError = null,
  fullscreen = false,
}: MapPageContentProps) {
  const { catalog, layers, error } = useLayerCatalog();

  const mapView =
    mapViewProp ??
    buildMapView(
      catalog?.project.mapView,
      catalog?.project.center,
      catalog?.project.defaultZoom,
    );

  const { boundary: resolvedBoundary, boundaryError: resolvedBoundaryError } =
    useWardBoundary({
      initialBoundary: boundary,
      initialError: boundaryError,
    });

  const alerts = (
    <>
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Không tải cấu hình bản đồ từ API. Dùng tọa độ mặc định Long Bình.
        </div>
      )}
      {resolvedBoundaryError && !resolvedBoundary?.features.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Không tải ranh giới phường từ API — bản đồ vẫn hiển thị theo tọa độ
          trung tâm.
        </div>
      )}
    </>
  );

  if (fullscreen) {
    return (
      <div className="relative h-full min-h-0 w-full">
        {(error || (resolvedBoundaryError && !resolvedBoundary?.features.length)) && (
          <div className="absolute left-4 right-4 top-4 z-20 flex max-w-md flex-col gap-2">
            {alerts}
          </div>
        )}
        <MapView
          mapView={mapView}
          boundary={resolvedBoundary}
          layers={layers}
          fullscreen
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts}
      <MapView
        mapView={mapView}
        boundary={resolvedBoundary}
        layers={layers}
      />
    </div>
  );
}
