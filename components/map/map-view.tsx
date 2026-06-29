"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BasemapSwitcher } from "@/components/map/basemap-switcher";
import { RecordDetailModal } from "@/components/map/record-detail-modal";
import { getRecordDisplay } from "@/lib/api/records";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/map/basemaps";
import {
  createMapboxTransformRequest,
  getMapboxAccessToken,
  resolveMapBasemapStyle,
  setGoogleBasemapVisibility,
} from "@/lib/map/mapbox-basemap";
import {
  getGeoJsonBounds,
  isValidMapViewBounds,
  normalizeMapViewBounds,
  padBounds,
  ensureBoundsSpan,
} from "@/lib/map/bounds";
import {
  upsertWardBoundaryLayer,
  removeWardBoundaryLayer,
} from "@/lib/map/ward-boundary-layer";
import { useMapDataLayers } from "@/components/map/use-map-data-layers";
import { useMapFeatureInteractions } from "@/components/map/use-map-feature-interactions";
import { MapLayerFilterChips } from "@/components/map/map-layer-filter-chips";
import { DynamicStyleLegend } from "@/components/map/dynamic-style-legend";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import { isMapVisibleLayer } from "@/lib/layers/adapter";
import {
  countActiveLayerFilters,
  type LayerFilters,
  type LayerFilterState,
} from "@/lib/map/layer-filters";
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
  embedded?: boolean;
  showAllLayers?: boolean;
}

type MapProvider = "google" | "fallback";

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
  if (mapView.panBounds && isValidMapViewBounds(mapView.panBounds)) {
    return mapView.panBounds;
  }

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

  const normalized = normalizeMapViewBounds(raw);
  if (!normalized) return null;

  const padded =
    padBounds(normalized, FIT_BOUNDS_GEO_PADDING_RATIO) ?? normalized;
  if (!isValidMapViewBounds(padded)) return null;

  return ensureBoundsSpan(padded);
}

function resolveFitPadding(
  map: maplibregl.Map,
  preferred = FIT_BOUNDS_PADDING,
): number {
  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (width <= 0 || height <= 0) return 0;

  const maxAllowed = Math.floor(Math.min(width, height) / 2) - 12;
  if (maxAllowed <= 0) return 0;

  return Math.min(preferred, Math.max(12, maxAllowed));
}

function jumpToMapView(map: maplibregl.Map, mapView: MapViewConfig) {
  map.jumpTo({
    center: toMapLibreCenter(mapView.center),
    zoom: mapView.zoom,
  });
}

function applyInitialView(
  map: maplibregl.Map,
  mapView: MapViewConfig,
  boundary?: GeoJsonFeatureCollection | null,
  options?: { embedded?: boolean },
): boolean {
  map.resize();

  const bounds = resolveFitBounds(mapView, boundary);
  const preferredPadding = options?.embedded ? 24 : FIT_BOUNDS_PADDING;
  const padding = resolveFitPadding(map, preferredPadding);

  if (bounds && isValidMapViewBounds(bounds) && padding > 0) {
    try {
      map.fitBounds(bounds, {
        padding,
        maxZoom: FIT_BOUNDS_MAX_ZOOM,
        duration: 0,
      });
      return true;
    } catch {
      jumpToMapView(map, mapView);
      return false;
    }
  }

  jumpToMapView(map, mapView);
  return padding > 0;
}

function applyPanBounds(
  map: maplibregl.Map,
  mapView: MapViewConfig,
  boundary?: GeoJsonFeatureCollection | null,
) {
  const panBounds = resolvePanBounds(mapView, boundary);
  if (isValidMapViewBounds(panBounds)) {
    map.setMaxBounds(panBounds);
    return;
  }
  map.setMaxBounds(null);
}

export function MapView({
  mapView,
  boundary,
  layers = [],
  className,
  fullscreen = false,
  embedded = false,
  showAllLayers = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const needsInitialFitRef = useRef(true);
  const embeddedRef = useRef(embedded);
  const providerRef = useRef<MapProvider>("google");
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
  const [detailDestination, setDetailDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activeFilterLayerId, setActiveFilterLayerId] = useState<string | null>(
    null,
  );
  const [layerFilters, setLayerFilters] = useState<LayerFilters>({});
  const { hiddenLayerIds } = useMapLayerVisibility();

  const handleViewDetail = useCallback(
    async (
      layerId: string,
      recordId: string,
      destination?: { lat: number; lng: number },
    ) => {
      setDetailLoading(true);
      setDetailError(null);
      setDetailData(null);
      setDetailDestination(destination ?? null);

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

  const {
    error: dataLayersError,
    loaded: dataLayersLoaded,
    restoreOnMap,
    entries: dataLayerEntries,
  } = useMapDataLayers({
    map: mapInstance,
    layers,
    ready: mapReady,
    interactionOptions: { onViewDetail: handleViewDetail },
    showAllLayers,
    layerFilters,
  });

  useMapFeatureInteractions({
    map: mapInstance,
  });

  const visibleFilterLayers = useMemo(
    () =>
      embedded || showAllLayers
        ? []
        : layers.filter(
            (layer) =>
              isMapVisibleLayer(layer) && !hiddenLayerIds.has(layer.id),
          ),
    [embedded, hiddenLayerIds, layers, showAllLayers],
  );
  const resolvedActiveFilterLayerId = visibleFilterLayers.some(
    (layer) => layer.id === activeFilterLayerId,
  )
    ? activeFilterLayerId
    : null;
  const visibleFilterLayerKey = visibleFilterLayers
    .map((layer) => layer.id)
    .join(",");

  useEffect(() => {
    const nextLayerIds = new Set(
      visibleFilterLayerKey ? visibleFilterLayerKey.split(",") : [],
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep active filter layer aligned with sidebar visibility
    setActiveFilterLayerId((current) => {
      if (current === null || nextLayerIds.has(current)) return current;
      return visibleFilterLayerKey.split(",").filter(Boolean)[0] ?? null;
    });
  }, [visibleFilterLayerKey]);

  const handleLayerFiltersChange = useCallback(
    (layerId: string, filter: LayerFilterState) => {
      setLayerFilters((current) => {
        const next = { ...current };
        if (countActiveLayerFilters(filter) > 0) {
          next[layerId] = filter;
        } else {
          delete next[layerId];
        }
        return next;
      });
    },
    [],
  );

  mapViewRef.current = {
    ...mapView,
    center: normalizeMapCenter(mapView.center),
  };
  boundaryRef.current = boundary;
  embeddedRef.current = embedded;

  const runInitialViewRef = useRef<(map: maplibregl.Map) => void>(() => {});

  runInitialViewRef.current = (map: maplibregl.Map) => {
    const fitted = applyInitialView(
      map,
      mapViewRef.current,
      boundaryRef.current,
      { embedded: embeddedRef.current },
    );
    if (fitted) {
      needsInitialFitRef.current = false;
    }
    applyPanBounds(map, mapViewRef.current, boundaryRef.current);
  };

  const boundsKey = mapView.bounds ? JSON.stringify(mapView.bounds) : "";

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const { style, provider } = resolveMapBasemapStyle(DEFAULT_BASEMAP);
    const initialMapView = mapViewRef.current;
    const initialBoundary = boundaryRef.current;

    if (getMapboxAccessToken()) {
      setUsingMapbox(true);
      setMapError(null);
    } else {
      setUsingMapbox(false);
      setMapError(
        "Chưa có NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN — nền Google vẫn hiển thị, nhưng font/glyph Mapbox có thể không dùng được.",
      );
    }

    providerRef.current = provider;
    basemapRef.current = DEFAULT_BASEMAP;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: toMapLibreCenter(initialMapView.center),
      zoom: initialMapView.zoom,
      minZoom: initialMapView.minZoom ?? DEFAULT_MIN_ZOOM,
      maxZoom: initialMapView.maxZoom,
      attributionControl: false,
      transformRequest: getMapboxAccessToken()
        ? createMapboxTransformRequest()
        : undefined,
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
      needsInitialFitRef.current = true;
      runInitialViewRef.current(map);
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

    const nextBoundary = boundaryRef.current;

    if (nextBoundary?.features.length) {
      upsertWardBoundaryLayer(map, nextBoundary);
    } else {
      removeWardBoundaryLayer(map);
    }

    needsInitialFitRef.current = true;
    runInitialViewRef.current(map);
  }, [
    mapView.center.lat,
    mapView.center.lng,
    mapView.zoom,
    boundsKey,
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

    if (providerRef.current === "google") {
      setGoogleBasemapVisibility(map, basemap);
      return;
    }

    const view = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };

    const { style } = resolveMapBasemapStyle(basemap);
    map.setStyle(style);
    map.once("style.load", async () => {
      restoreBoundary();
      await restoreOnMap(map);
      map.jumpTo(view);
      applyPanBounds(map, mapViewRef.current, currentBoundary);
    });
  }, [basemap, isLoading, restoreOnMap]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || isLoading) return;

    const observer = new ResizeObserver(() => {
      map.resize();
      if (needsInitialFitRef.current) {
        runInitialViewRef.current(map);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoading]);

  const mapClassName =
    className ??
    (fullscreen || embedded
      ? "h-full w-full"
      : "h-[calc(100vh-12rem)] min-h-[400px] w-full rounded-xl");

  const wrapperClass =
    fullscreen || embedded ? "relative h-full w-full" : "relative";

  return (
    <div className={wrapperClass}>
      <MapLayerFilterChips
        key={resolvedActiveFilterLayerId ?? "no-active-filter-layer"}
        visibleLayers={visibleFilterLayers}
        entries={dataLayerEntries}
        loaded={dataLayersLoaded}
        activeLayerId={resolvedActiveFilterLayerId}
        layerFilters={layerFilters}
        onActiveLayerChange={setActiveFilterLayerId}
        onLayerFiltersChange={handleLayerFiltersChange}
      />
      <BasemapSwitcher
        value={basemap}
        onChange={setBasemap}
        compact={embedded}
      />
      <DynamicStyleLegend layers={visibleFilterLayers} />
      {mapError && (
        <div className="absolute bottom-3 left-3 right-14 z-10 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-sm">
          {mapError}
          {!usingMapbox && (
            <span className="mt-0.5 block text-amber-800">
              Thêm{" "}
              <code className="font-mono">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>{" "}
              vào <code className="font-mono">.env.local</code> để dùng glyph
              Mapbox.
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
            fullscreen || embedded
              ? "absolute inset-0 z-10 flex items-center justify-center bg-white/75 text-sm text-muted"
              : "absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-100/80 text-sm text-muted"
          }
        >
          Đang tải bản đồ...
        </div>
      )}
      <div ref={containerRef} className={mapClassName} />
      <RecordDetailModal
        data={detailData}
        layer={layers.find((layer) => layer.id === detailData?.layerId)}
        loading={detailLoading}
        error={detailError}
        destination={detailDestination}
        onClose={() => {
          setDetailData(null);
          setDetailError(null);
          setDetailLoading(false);
          setDetailDestination(null);
        }}
      />
    </div>
  );
}
