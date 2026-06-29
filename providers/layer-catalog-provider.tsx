"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LayerCatalogResponse } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import { toLayer } from "@/lib/layers/adapter";
import {
  LOCAL_LAYER_ICONS_EVENT,
  mergeLocalLayerIcon,
} from "@/lib/layers/local-icons";

interface LayerCatalogContextValue {
  catalog: LayerCatalogResponse | null;
  layers: Layer[];
  error: string | null;
}

const LayerCatalogContext = createContext<LayerCatalogContextValue>({
  catalog: null,
  layers: [],
  error: null,
});

interface LayerCatalogProviderProps {
  catalog: LayerCatalogResponse | null;
  error?: string | null;
  children: ReactNode;
}

export function LayerCatalogProvider({
  catalog,
  error = null,
  children,
}: LayerCatalogProviderProps) {
  const [localIconVersion, setLocalIconVersion] = useState(0);
  const [localIconsReady, setLocalIconsReady] = useState(false);

  useEffect(() => {
    const refresh = () => setLocalIconVersion((version) => version + 1);
    const timer = window.setTimeout(() => setLocalIconsReady(true), 0);
    window.addEventListener(LOCAL_LAYER_ICONS_EVENT, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(LOCAL_LAYER_ICONS_EVENT, refresh);
    };
  }, []);

  const layers = useMemo(
    () =>
      catalog?.layers
        .map((layer) => (localIconsReady ? mergeLocalLayerIcon(layer) : layer))
        .map(toLayer)
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [catalog, localIconVersion, localIconsReady],
  );

  return (
    <LayerCatalogContext.Provider value={{ catalog, layers, error }}>
      {children}
    </LayerCatalogContext.Provider>
  );
}

export function useLayerCatalog() {
  return useContext(LayerCatalogContext);
}
