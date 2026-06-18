"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Modal } from "@/components/ui/modal";
import {
  getAdministrativeBoundary,
  resolveMapView,
} from "@/lib/api/map-view";
import type { AreaPolygonValue, LatLngValue } from "@/lib/fields/area-polygon";
import { areaPolygonToLatLngPoints } from "@/lib/fields/area-polygon";
import { DEFAULT_BASEMAP } from "@/lib/map/basemaps";
import { padBounds } from "@/lib/map/bounds";
import {
  createMapboxTransformRequest,
  getMapboxAccessToken,
  resolveMapBasemapStyle,
} from "@/lib/map/mapbox-basemap";
import { upsertWardBoundaryLayer } from "@/lib/map/ward-boundary-layer";
import { toMapLibreCenter } from "@/lib/map/vietnam";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import type { FeatureCollection } from "geojson";

const PICKER_MIN_ZOOM = 11;
const PICKER_FIT_PADDING = 80;
const PICKER_MAX_ZOOM = 17;

const DRAFT_SOURCE_ID = "area-polygon-picker";
const DRAFT_FILL_LAYER_ID = "area-polygon-picker-fill";
const DRAFT_LINE_LAYER_ID = "area-polygon-picker-line";
const DRAFT_CLOSE_LAYER_ID = "area-polygon-picker-close";
const DRAFT_POINT_LAYER_ID = "area-polygon-picker-points";

interface AreaPolygonMapPickerProps {
  open: boolean;
  initialValue?: unknown;
  onClose: () => void;
  onConfirm: (value: AreaPolygonValue) => void;
}

function formatCoord(value: number): string {
  return value.toFixed(6);
}

function resolvePickerBounds(
  mapView: MapViewConfig,
  boundary: GeoJsonFeatureCollection | null,
) {
  if (mapView.bounds) {
    return padBounds(mapView.bounds, 1) ?? mapView.bounds;
  }
  const { lat, lng } = mapView.center;
  return [
    [lng - 0.02, lat - 0.02],
    [lng + 0.02, lat + 0.02],
  ] as [[number, number], [number, number]];
}

function toPositions(coordinates: LatLngValue[]): [number, number][] {
  return coordinates.map((point) => [point.lng, point.lat]);
}

function buildDraftGeoJson(coordinates: LatLngValue[]): FeatureCollection {
  const positions = toPositions(coordinates);
  const features: FeatureCollection["features"] = [];

  if (positions.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "path" },
      geometry: {
        type: "LineString",
        coordinates: positions,
      },
    });
  }

  if (positions.length >= 3) {
    features.push({
      type: "Feature",
      properties: { kind: "fill" },
      geometry: {
        type: "Polygon",
        coordinates: [[...positions, positions[0]]],
      },
    });
    features.push({
      type: "Feature",
      properties: { kind: "close" },
      geometry: {
        type: "LineString",
        coordinates: [positions[positions.length - 1], positions[0]],
      },
    });
  }

  if (positions.length >= 1) {
    features.push({
      type: "Feature",
      properties: { kind: "vertices" },
      geometry: {
        type: "MultiPoint",
        coordinates: positions,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function ensureDraftLayers(map: maplibregl.Map) {
  if (map.getSource(DRAFT_SOURCE_ID)) return;

  map.addSource(DRAFT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: DRAFT_FILL_LAYER_ID,
    type: "fill",
    source: DRAFT_SOURCE_ID,
    filter: ["==", ["get", "kind"], "fill"],
    paint: {
      "fill-color": "#2563eb",
      "fill-opacity": 0.18,
    },
  });

  map.addLayer({
    id: DRAFT_LINE_LAYER_ID,
    type: "line",
    source: DRAFT_SOURCE_ID,
    filter: ["==", ["get", "kind"], "path"],
    paint: {
      "line-color": "#1d4ed8",
      "line-width": 2.5,
    },
  });

  map.addLayer({
    id: DRAFT_CLOSE_LAYER_ID,
    type: "line",
    source: DRAFT_SOURCE_ID,
    filter: ["==", ["get", "kind"], "close"],
    paint: {
      "line-color": "#1d4ed8",
      "line-width": 2,
      "line-dasharray": [2, 2],
      "line-opacity": 0.75,
    },
  });

  map.addLayer({
    id: DRAFT_POINT_LAYER_ID,
    type: "circle",
    source: DRAFT_SOURCE_ID,
    filter: ["==", ["get", "kind"], "vertices"],
    paint: {
      "circle-radius": 6,
      "circle-color": "#ef4444",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
}

function updateDraftOnMap(map: maplibregl.Map, coordinates: LatLngValue[]) {
  ensureDraftLayers(map);
  const source = map.getSource(DRAFT_SOURCE_ID);
  if (!source || source.type !== "geojson") return;
  (source as GeoJSONSource).setData(buildDraftGeoJson(coordinates));
}

function removeDraftLayers(map: maplibregl.Map) {
  for (const layerId of [
    DRAFT_POINT_LAYER_ID,
    DRAFT_CLOSE_LAYER_ID,
    DRAFT_LINE_LAYER_ID,
    DRAFT_FILL_LAYER_ID,
  ]) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(DRAFT_SOURCE_ID)) map.removeSource(DRAFT_SOURCE_ID);
}

export function AreaPolygonMapPicker({
  open,
  initialValue,
  onClose,
  onConfirm,
}: AreaPolygonMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);

  const [mapMeta, setMapMeta] = useState<{
    mapView: MapViewConfig;
    boundary: GeoJsonFeatureCollection | null;
  } | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [draft, setDraft] = useState<LatLngValue[]>(() =>
    areaPolygonToLatLngPoints(initialValue),
  );

  const syncDraftToMap = useCallback((coordinates: LatLngValue[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    updateDraftOnMap(map, coordinates);
  }, []);

  useEffect(() => {
    if (!open) return;
    const initial = areaPolygonToLatLngPoints(initialValue);
    setDraft(initial);
    setMetaError(null);
    setMapMeta(null);
    setMapLoading(true);
    mapReadyRef.current = false;

    let cancelled = false;

    Promise.all([resolveMapView(), getAdministrativeBoundary()])
      .then(([mapView, boundary]) => {
        if (cancelled) return;
        setMapMeta({ mapView, boundary });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMetaError(
          error instanceof Error
            ? error.message
            : "Không tải được cấu hình bản đồ",
        );
        setMapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialValue]);

  useEffect(() => {
    if (!open || !mapMeta || !containerRef.current) return;

    const initial = areaPolygonToLatLngPoints(initialValue);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveMapBasemapStyle(DEFAULT_BASEMAP).style,
      center: toMapLibreCenter(mapMeta.mapView.center),
      zoom: mapMeta.mapView.zoom,
      minZoom: mapMeta.mapView.minZoom ?? PICKER_MIN_ZOOM,
      maxZoom: mapMeta.mapView.maxZoom ?? PICKER_MAX_ZOOM,
      attributionControl: false,
      transformRequest: getMapboxAccessToken()
        ? createMapboxTransformRequest()
        : undefined,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      const { lat, lng } = event.lngLat;
      setDraft((prev) => {
        const next = [...prev, { lat, lng }];
        updateDraftOnMap(map, next);
        return next;
      });
    };

    map.on("load", () => {
      if (mapMeta.boundary?.features.length) {
        upsertWardBoundaryLayer(map, mapMeta.boundary);
      }

      mapReadyRef.current = true;
      updateDraftOnMap(map, initial);

      const positions = toPositions(initial);
      if (positions.length > 0) {
        const bounds = positions.reduce(
          (acc, coord) => acc.extend(coord),
          new maplibregl.LngLatBounds(positions[0], positions[0]),
        );
        map.fitBounds(bounds, {
          padding: PICKER_FIT_PADDING,
          maxZoom: PICKER_MAX_ZOOM,
          duration: 0,
        });
      } else {
        map.fitBounds(resolvePickerBounds(mapMeta.mapView, mapMeta.boundary), {
          padding: PICKER_FIT_PADDING,
          maxZoom: PICKER_MAX_ZOOM,
          duration: 0,
        });
      }

      map.getCanvas().style.cursor = "crosshair";
      setMapLoading(false);
    });

    map.on("click", handleClick);
    mapRef.current = map;

    return () => {
      map.off("click", handleClick);
      removeDraftLayers(map);
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
      setMapLoading(true);
    };
  }, [open, mapMeta, initialValue]);

  useEffect(() => {
    syncDraftToMap(draft);
  }, [draft, syncDraftToMap, mapLoading]);

  if (!open) return null;

  return (
    <Modal
      title="Vẽ vùng trên bản đồ"
      size="xl"
      padding={false}
      onClose={onClose}
    >
      <div className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Vẽ vùng trên bản đồ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted">
            Nhấn từng điểm theo thứ tự viền vùng (ít nhất 3 điểm). Đường nét đứt
            là cạnh đóng khi lưu — hệ thống tự nối điểm cuối về điểm đầu.
          </p>

          {metaError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {metaError}
            </p>
          )}

          <div className="relative overflow-hidden rounded-xl border border-border">
            {(mapLoading || !mapMeta) && !metaError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-muted">
                Đang tải bản đồ...
              </div>
            )}
            <div
              ref={containerRef}
              className="h-[min(38vh,360px)] w-full"
            />
          </div>

          <div className="rounded-lg border border-border bg-slate-50 px-4 py-3 text-sm">
            {draft.length > 0 ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {draft.length} điểm đã chọn
                </p>
                <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted">
                  {draft.map((point, index) => (
                    <li key={`${index}-${point.lat}-${point.lng}`}>
                      {index + 1}. {formatCoord(point.lat)},{" "}
                      {formatCoord(point.lng)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted">
                Chưa có điểm nào — nhấn bản đồ để thêm.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border bg-surface px-5 py-4">
          <button
            type="button"
            disabled={draft.length < 3}
            onClick={() => onConfirm({ coordinates: draft })}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dùng vùng này
          </button>
          <button
            type="button"
            disabled={draft.length === 0}
            onClick={() => {
              setDraft((prev) => {
                const next = prev.slice(0, -1);
                syncDraftToMap(next);
                return next;
              });
            }}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hoàn tác điểm cuối
          </button>
          <button
            type="button"
            disabled={draft.length === 0}
            onClick={() => {
              setDraft([]);
              syncDraftToMap([]);
            }}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa hết
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
          >
            Hủy
          </button>
        </div>
      </div>
    </Modal>
  );
}
