"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BasemapSwitcher } from "@/components/map/basemap-switcher";
import { RecordDetailModal } from "@/components/map/record-detail-modal";
import { getRecordDisplay } from "@/lib/api/records";
import {
  createBasemapStyle,
  DEFAULT_BASEMAP,
  type BasemapId,
} from "@/lib/map/basemaps";
import {
  createMapboxBasemapStyle,
  getMapboxAccessToken,
  setMapboxBasemapVisibility,
} from "@/lib/map/mapbox-basemap";
import { getGeoJsonBounds, padBounds } from "@/lib/map/bounds";
import {
  upsertWardBoundaryLayer,
  removeWardBoundaryLayer,
} from "@/lib/map/ward-boundary-layer";
import { useMapDataLayers } from "@/components/map/use-map-data-layers";
import { useMapFeatureInteractions } from "@/components/map/use-map-feature-interactions";
import { normalizeMapCenter, toMapLibreCenter } from "@/lib/map/vietnam";
import type { MapViewBounds, MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import type { Layer } from "@/types/layer.types";
import type { RecordDisplayData } from "@/types/api/records";

interface MapViewProps {
  mapView: MapViewConfig;
  boundary?: GeoJsonFeatureCollection | null;
  layers?: Layer[];
  className?: string;
  fullscreen?: boolean;
}

type MapProvider = "mapbox" | "fallback";

const FIT_BOUNDS_GEO_PADDING_RATIO = 1;
const FIT_BOUNDS_PADDING = 150;
const FIT_BOUNDS_MAX_ZOOM = 16;
const DEFAULT_MIN_ZOOM = 11;
/** Pan rộng hơn fit — tránh maxBounds ép zoom vào làm cắt ranh phường */
const PAN_BOUNDS_PADDING_RATIO = 1.5;

function resolvePanBounds(
  mapView: MapViewConfig,
  boundary?: GeoJsonFeatureCollection | null,
): MapViewBounds {
  if (mapView.panBounds) return mapView.panBounds;

  const wardBounds =
    mapView.bounds ?? (boundary ? getGeoJsonBounds(boundary) : null);

  if (wardBounds) {
    const padded = padBounds(wardBounds, PAN_BOUNDS_PADDING_RATIO);
    if (padded) return padded;
  }

  const { lat, lng } = normalizeMapCenter(mapView.center);
  return (
    padBounds(
      [
        [lng - 0.015, lat - 0.015],
        [lng + 0.015, lat + 0.015],
      ],
      0.5,
    ) ?? [
      [lng - 0.02, lat - 0.02],
      [lng + 0.02, lat + 0.02],
    ]
  );
}

function resolveFitBounds(
  mapView: MapViewConfig,
  boundary?: GeoJsonFeatureCollection | null,
): MapViewBounds | null {
  const raw = mapView.bounds ?? (boundary ? getGeoJsonBounds(boundary) : null);

  if (!raw) return null;

  return padBounds(raw, FIT_BOUNDS_GEO_PADDING_RATIO) ?? raw;
}
function applyInitialView(
  map: maplibregl.Map,
  mapView: MapViewConfig,
  boundary?: GeoJsonFeatureCollection | null,
) {
  map.resize();

  const bounds = resolveFitBounds(mapView, boundary);

  if (bounds) {
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration: 0,
    });
    return;
  }

  map.jumpTo({
    center: toMapLibreCenter(mapView.center),
    zoom: mapView.zoom,
  });
}

export function MapView({
  mapView,
  boundary,
  layers = [],
  className,
  fullscreen = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const providerRef = useRef<MapProvider>("fallback");
  const mapViewRef = useRef(mapView);
  const boundaryRef = useRef(boundary);
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const basemapRef = useRef<BasemapId>(DEFAULT_BASEMAP);
  const [isLoading, setIsLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [usingMapbox, setUsingMapbox] = useState(false);
  const [detailData, setDetailData] = useState<RecordDisplayData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleViewDetail = useCallback(
    async (layerId: string, recordId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      setDetailData(null);

      try {
        const data = await getRecordDisplay(layerId, recordId);
        setDetailData(data);
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : "Không tải được chi tiết bản ghi",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const mapReady = !isLoading && mapInstance !== null;

  const { error: dataLayersError, restoreOnMap } = useMapDataLayers({
    map: mapInstance,
    layers,
    ready: mapReady,
    interactionOptions: { onViewDetail: handleViewDetail },
  });

  useMapFeatureInteractions({
    map: mapInstance,
  });

  mapViewRef.current = {
    ...mapView,
    center: normalizeMapCenter(mapView.center),
  };
  boundaryRef.current = boundary;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = getMapboxAccessToken();
    const provider: MapProvider = token ? "mapbox" : "fallback";
    const initialMapView = mapViewRef.current;
    const initialBoundary = boundaryRef.current;

    if (token) {
      setUsingMapbox(true);
      setMapError(null);
    } else {
      setUsingMapbox(false);
      setMapError(
        "Chưa có NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN — đang dùng nền OpenStreetMap.",
      );
    }

    providerRef.current = provider;
    basemapRef.current = DEFAULT_BASEMAP;

    const style =
      provider === "mapbox" && token
        ? createMapboxBasemapStyle(token, DEFAULT_BASEMAP)
        : createBasemapStyle(DEFAULT_BASEMAP);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: toMapLibreCenter(initialMapView.center),
      zoom: initialMapView.zoom,
      minZoom: initialMapView.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: initialMapView.maxZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    map.on("load", () => {
      if (initialBoundary?.features.length) {
        upsertWardBoundaryLayer(map, initialBoundary);
      }
      applyInitialView(map, initialMapView, initialBoundary);
      map.setMaxBounds(resolvePanBounds(initialMapView, initialBoundary));
      setMapInstance(map);
      setIsLoading(false);
    });

    map.on("error", (e) => {
      const message = e.error?.message ?? "";
      if (
        message.includes("Failed to fetch") ||
        message.includes("AJAXError")
      ) {
        setMapError(
          "Không tải được tile bản đồ — kiểm tra token hoặc kết nối mạng.",
        );
        setIsLoading(false);
      }
    });

    mapRef.current = map;

    return () => {
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    const nextMapView = mapViewRef.current;
    const nextBoundary = boundaryRef.current;

    if (nextBoundary?.features.length) {
      upsertWardBoundaryLayer(map, nextBoundary);
    } else {
      removeWardBoundaryLayer(map);
    }

    applyInitialView(map, nextMapView, nextBoundary);
    map.setMaxBounds(resolvePanBounds(nextMapView, nextBoundary));
  }, [
    mapView.center.lat,
    mapView.center.lng,
    mapView.zoom,
    mapView.bounds,
    boundary,
    isLoading,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading || basemap === basemapRef.current) return;

    basemapRef.current = basemap;
    const currentBoundary = boundaryRef.current;

    const restoreBoundary = () => {
      if (currentBoundary?.features.length) {
        upsertWardBoundaryLayer(map, currentBoundary);
      }
    };

    if (providerRef.current === "mapbox") {
      setMapboxBasemapVisibility(map, basemap);
      restoreBoundary();
      void restoreOnMap(map);
      return;
    }

    const view = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };

    map.setStyle(createBasemapStyle(basemap));
    map.once("style.load", () => {
      restoreBoundary();
      void restoreOnMap(map);
      map.jumpTo(view);
      map.setMaxBounds(resolvePanBounds(mapViewRef.current, currentBoundary));
    });
  }, [basemap, isLoading, restoreOnMap]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || isLoading) return;

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoading]);

  const mapClassName =
    className ??
    (fullscreen
      ? "h-full w-full"
      : "h-[calc(100vh-12rem)] min-h-[400px] w-full rounded-xl");

  return (
    <div className={fullscreen ? "relative h-full w-full" : "relative"}>
      <BasemapSwitcher value={basemap} onChange={setBasemap} />
      {mapError && (
        <div className="absolute bottom-3 left-3 right-14 z-10 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-sm">
          {mapError}
          {!usingMapbox && (
            <span className="mt-0.5 block text-amber-800">
              Thêm token Mapbox vào{" "}
              <code className="font-mono">.env.local</code>
            </span>
          )}
        </div>
      )}
      {dataLayersError && (
        <div className="absolute bottom-14 left-3 right-14 z-10 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-sm">
          {dataLayersError}
        </div>
      )}
      {isLoading && (
        <div
          className={
            fullscreen
              ? "absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-muted"
              : "absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-100/80 text-sm text-muted"
          }
        >
          Đang tải bản đồ...
        </div>
      )}
      <div ref={containerRef} className={mapClassName} />
      <RecordDetailModal
        data={detailData}
        loading={detailLoading}
        error={detailError}
        onClose={() => {
          setDetailData(null);
          setDetailError(null);
          setDetailLoading(false);
        }}
      />
    </div>
  );
}
