"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Modal } from "@/components/ui/modal";
import {
  getAdministrativeBoundary,
  resolveMapView,
} from "@/lib/api/map-view";
import { DEFAULT_BASEMAP } from "@/lib/map/basemaps";
import { padBounds } from "@/lib/map/bounds";
import {
  createMapboxTransformRequest,
  getMapboxAccessToken,
  resolveMapBasemapStyle,
} from "@/lib/map/mapbox-basemap";
import { upsertWardBoundaryLayer } from "@/lib/map/ward-boundary-layer";
import { toMapLibreCenter } from "@/lib/map/vietnam";
import type { LatLngValue } from "@/lib/fields/lat-lng";
import { isLatLngValue } from "@/lib/fields/lat-lng";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

const PICKER_MIN_ZOOM = 11;
const PICKER_FIT_PADDING = 80;
const PICKER_MAX_ZOOM = 17;

interface LatLngMapPickerProps {
  open: boolean;
  initialValue?: unknown;
  onClose: () => void;
  onConfirm: (value: LatLngValue) => void;
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

export function LatLngMapPicker({
  open,
  initialValue,
  onClose,
  onConfirm,
}: LatLngMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [mapMeta, setMapMeta] = useState<{
    mapView: MapViewConfig;
    boundary: GeoJsonFeatureCollection | null;
  } | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [draft, setDraft] = useState<LatLngValue | null>(() =>
    isLatLngValue(initialValue) ? initialValue : null,
  );

  useEffect(() => {
    if (!open) return;
    setDraft(isLatLngValue(initialValue) ? initialValue : null);
    setMetaError(null);
    setMapMeta(null);
    setMapLoading(true);

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

    const { style } = resolveMapBasemapStyle(DEFAULT_BASEMAP);

    const initial = isLatLngValue(initialValue) ? initialValue : null;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: initial
        ? [initial.lng, initial.lat]
        : toMapLibreCenter(mapMeta.mapView.center),
      zoom: initial ? Math.max(mapMeta.mapView.zoom, 15) : mapMeta.mapView.zoom,
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

    function placeMarker(lat: number, lng: number) {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({
          color: "#ef4444",
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLngLat();
          if (!position) return;
          setDraft({ lat: position.lat, lng: position.lng });
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    }

    map.on("load", () => {
      if (mapMeta.boundary?.features.length) {
        upsertWardBoundaryLayer(map, mapMeta.boundary);
      }

      const bounds = resolvePickerBounds(mapMeta.mapView, mapMeta.boundary);
      if (!initial) {
        map.fitBounds(bounds, {
          padding: PICKER_FIT_PADDING,
          maxZoom: PICKER_MAX_ZOOM,
          duration: 0,
        });
      } else {
        placeMarker(initial.lat, initial.lng);
        map.flyTo({
          center: [initial.lng, initial.lat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 0,
        });
      }

      map.getCanvas().style.cursor = "crosshair";
      setMapLoading(false);
    });

    map.on("click", (event) => {
      const { lat, lng } = event.lngLat;
      placeMarker(lat, lng);
      setDraft({ lat, lng });
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapLoading(true);
    };
  }, [open, mapMeta, initialValue]);

  if (!open) return null;

  return (
    <Modal
      title="Chọn toạ độ trên bản đồ"
      size="xl"
      padding={false}
      onClose={onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-muted">
          Nhấn vào bản đồ để chọn vị trí. Có thể kéo ghim để chỉnh lại.
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
            className="h-[min(60vh,480px)] w-full"
          />
        </div>

        <div className="rounded-lg border border-border bg-slate-50 px-4 py-3 text-sm">
          {draft ? (
            <p className="text-foreground">
              Vĩ độ: <strong>{formatCoord(draft.lat)}</strong>
              <span className="mx-2 text-muted">·</span>
              Kinh độ: <strong>{formatCoord(draft.lng)}</strong>
            </p>
          ) : (
            <p className="text-muted">Chưa chọn toạ độ trên bản đồ.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!draft}
            onClick={() => {
              if (draft) onConfirm(draft);
            }}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dùng toạ độ này
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
