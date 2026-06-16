"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { loadLayerGeoJsonEntries, type LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import {
  applyLayersVisibility,
  restoreDataLayers,
} from "@/lib/map/data-layers";
import { bindMapFeatureInteractions } from "@/lib/map/feature-interactions";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import type { Layer } from "@/types/layer.types";

import type { MapFeatureInteractionOptions } from "@/lib/map/feature-interactions";

interface UseMapDataLayersOptions {
  map: MapLibreMap | null;
  layers: Layer[];
  ready: boolean;
  interactionOptions?: MapFeatureInteractionOptions;
  /** Dashboard: hiển thị mọi lớp, bỏ qua trạng thái ẩn trên /ban-do */
  showAllLayers?: boolean;
}

const EMPTY_HIDDEN = new Set<string>();

export function useMapDataLayers({
  map,
  layers,
  ready,
  interactionOptions,
  showAllLayers = false,
}: UseMapDataLayersOptions) {
  const entriesRef = useRef<LayerGeoJsonEntry[]>([]);
  const [entries, setEntries] = useState<LayerGeoJsonEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { hiddenLayerIds } = useMapLayerVisibility();
  const effectiveHidden = showAllLayers ? EMPTY_HIDDEN : hiddenLayerIds;

  const layerKey = layers.map((layer) => layer.id).join(",");
  const hiddenKey = [...effectiveHidden].sort().join(",");

  const interactionOptionsRef = useRef(interactionOptions);
  interactionOptionsRef.current = interactionOptions;

  useEffect(() => {
    if (!map || !ready) return;

    let cancelled = false;
    const duongLayer = layers.find((layer) => layer.code === "duong");
    console.log("[duong-render-trace][frontend:useMapDataLayers:start]", {
      ready,
      hasMap: Boolean(map),
      found: Boolean(duongLayer),
      layer: duongLayer,
      layerKey,
    });

    setLoaded(false);
    setError(null);

    loadLayerGeoJsonEntries(layers)
      .then(async (entries) => {
        if (cancelled) return;
        console.log("[duong-render-trace][frontend:useMapDataLayers:entries]", {
          hasDuongEntry: entries.some((entry) => entry.layer.code === "duong"),
          entries: entries
            .filter((entry) => entry.layer.code === "duong")
            .map((entry) => ({
              layerId: entry.layer.id,
              geometryKind: entry.layer.geometryKind,
              geometryType: entry.layer.geometryType,
              featureCount: entry.geojson.features.length,
            })),
        });
        entriesRef.current = entries;
        await restoreDataLayers(map, entries);
        applyLayersVisibility(map, entries, effectiveHidden);
        bindMapFeatureInteractions(map, entries, interactionOptionsRef.current);
        setEntries(entries);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được dữ liệu lớp trên bản đồ",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [map, ready, layerKey, layers, effectiveHidden, showAllLayers]);

  useEffect(() => {
    if (!map || !loaded || !entriesRef.current.length) return;
    applyLayersVisibility(map, entriesRef.current, effectiveHidden);
  }, [map, loaded, hiddenKey, effectiveHidden]);

  const restoreOnMap = useCallback(
    async (targetMap: MapLibreMap) => {
      if (!entriesRef.current.length) return;
      await restoreDataLayers(targetMap, entriesRef.current);
      applyLayersVisibility(targetMap, entriesRef.current, effectiveHidden);
      bindMapFeatureInteractions(
        targetMap,
        entriesRef.current,
        interactionOptionsRef.current,
      );
    },
    [effectiveHidden],
  );

  return { error, loaded, restoreOnMap, entriesRef, entries };
}
