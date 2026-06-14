"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { unbindMapFeatureInteractions } from "@/lib/map/feature-interactions";

interface UseMapFeatureInteractionsOptions {
  map: MapLibreMap | null;
}

/** Chỉ cleanup khi unmount — bind được gọi sau khi load layer xong */
export function useMapFeatureInteractions({
  map,
}: UseMapFeatureInteractionsOptions) {
  useEffect(() => {
    return () => {
      if (map) unbindMapFeatureInteractions(map);
    };
  }, [map]);
}
