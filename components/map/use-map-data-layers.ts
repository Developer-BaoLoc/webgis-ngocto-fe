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
}

export function useMapDataLayers({
  map,
  layers,
  ready,
  interactionOptions,
}: UseMapDataLayersOptions) {
  const entriesRef = useRef<LayerGeoJsonEntry[]>([]);
  const [entries, setEntries] = useState<LayerGeoJsonEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { hiddenLayerIds } = useMapLayerVisibility();

  const layerKey = layers.map((layer) => layer.id).join(",");
  const hiddenKey = [...hiddenLayerIds].sort().join(",");

  const interactionOptionsRef = useRef(interactionOptions);
  interactionOptionsRef.current = interactionOptions;

  useEffect(() => {
    if (!map || !ready) return;

    let cancelled = false;

    setLoaded(false);
    setError(null);

    loadLayerGeoJsonEntries(layers)
      .then(async (entries) => {
        if (cancelled) return;
        entriesRef.current = entries;
        await restoreDataLayers(map, entries);
        applyLayersVisibility(map, entries, hiddenLayerIds);
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
  }, [map, ready, layerKey, layers]);

  useEffect(() => {
    if (!map || !loaded || !entriesRef.current.length) return;
    applyLayersVisibility(map, entriesRef.current, hiddenLayerIds);
  }, [map, loaded, hiddenKey, hiddenLayerIds]);

  const restoreOnMap = useCallback(
    async (targetMap: MapLibreMap) => {
      if (!entriesRef.current.length) return;
      await restoreDataLayers(targetMap, entriesRef.current);
      applyLayersVisibility(targetMap, entriesRef.current, hiddenLayerIds);
      bindMapFeatureInteractions(
        targetMap,
        entriesRef.current,
        interactionOptionsRef.current,
      );
    },
    [hiddenLayerIds],
  );

  return { error, loaded, restoreOnMap, entriesRef, entries };
}
