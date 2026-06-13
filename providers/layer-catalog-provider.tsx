"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LayerCatalogResponse } from "@/types/api/layer-catalog";
import type { Layer } from "@/types/layer.types";
import { toLayer } from "@/lib/layers/adapter";

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
  const layers = catalog?.layers.map(toLayer) ?? [];

  return (
    <LayerCatalogContext.Provider value={{ catalog, layers, error }}>
      {children}
    </LayerCatalogContext.Provider>
  );
}

export function useLayerCatalog() {
  return useContext(LayerCatalogContext);
}
