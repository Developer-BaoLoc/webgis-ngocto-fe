"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  loadLayerGeoJsonEntries,
  type LayerGeoJsonEntry,
} from "@/lib/api/map-geojson";
import {
  applyLayersVisibility,
  restoreDataLayers,
  updateDataLayerSourceData,
} from "@/lib/map/data-layers";
import { bindMapFeatureInteractions } from "@/lib/map/feature-interactions";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import {
  applyLayerFiltersToEntries,
  type LayerFilters,
} from "@/lib/map/layer-filters";
import type { Layer } from "@/types/layer.types";

import type { MapFeatureInteractionOptions } from "@/lib/map/feature-interactions";

interface UseMapDataLayersOptions {
  map: MapLibreMap | null;
  layers: Layer[];
  ready: boolean;
  interactionOptions?: MapFeatureInteractionOptions;
  /** Dashboard: hiển thị mọi lớp, bỏ qua trạng thái ẩn trên /ban-do */
  showAllLayers?: boolean;
  layerFilters?: LayerFilters;
}

const EMPTY_HIDDEN = new Set<string>();

export function useMapDataLayers({
  map,
  layers,
  ready,
  interactionOptions,
  showAllLayers = false,
  layerFilters = {},
}: UseMapDataLayersOptions) {
  const entriesRef = useRef<LayerGeoJsonEntry[]>([]);
  const renderedEntriesRef = useRef<LayerGeoJsonEntry[]>([]);
  const layerFiltersRef = useRef(layerFilters);
  const [entries, setEntries] = useState<LayerGeoJsonEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { hiddenLayerIds } = useMapLayerVisibility();
  const effectiveHidden = showAllLayers ? EMPTY_HIDDEN : hiddenLayerIds;
  const effectiveHiddenRef = useRef(effectiveHidden);

  const layerKey = layers.map((layer) => layer.id).join(",");
  const hiddenKey = [...effectiveHidden].sort().join(",");

  const interactionOptionsRef = useRef(interactionOptions);
  interactionOptionsRef.current = interactionOptions;

  useEffect(() => {
    layerFiltersRef.current = layerFilters;
  }, [layerFilters]);

  useEffect(() => {
    effectiveHiddenRef.current = effectiveHidden;
  }, [effectiveHidden]);

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
        const renderedEntries = applyLayerFiltersToEntries(
          entries,
          layerFiltersRef.current,
        );
        renderedEntriesRef.current = renderedEntries;
        await restoreDataLayers(map, renderedEntries);
        applyLayersVisibility(map, entries, effectiveHiddenRef.current);
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
  }, [map, ready, layerKey, layers, showAllLayers]);

  useEffect(() => {
    if (!map || !loaded || !entriesRef.current.length) return;
    applyLayersVisibility(map, entriesRef.current, effectiveHidden);
  }, [map, loaded, hiddenKey, effectiveHidden]);

  useEffect(() => {
    if (!map || !loaded || !entriesRef.current.length) return;
    const renderedEntries = applyLayerFiltersToEntries(
      entriesRef.current,
      layerFilters,
    );
    renderedEntriesRef.current = renderedEntries;
    for (const entry of renderedEntries) {
      updateDataLayerSourceData(map, entry);
    }
  }, [map, loaded, layerFilters]);

  const restoreOnMap = useCallback(async (targetMap: MapLibreMap) => {
    if (!entriesRef.current.length) return;
    const renderedEntries = renderedEntriesRef.current.length
      ? renderedEntriesRef.current
      : entriesRef.current;
    await restoreDataLayers(targetMap, renderedEntries);
    applyLayersVisibility(
      targetMap,
      entriesRef.current,
      effectiveHiddenRef.current,
    );
    bindMapFeatureInteractions(
      targetMap,
      entriesRef.current,
      interactionOptionsRef.current,
    );
  }, []);

  return { error, loaded, restoreOnMap, entriesRef, entries };
}
