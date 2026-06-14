"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "onegis-map-hidden-layers";

interface MapLayerVisibilityContextValue {
  hiddenLayerIds: ReadonlySet<string>;
  isLayerVisible: (layerId: string) => boolean;
  setLayerVisible: (layerId: string, visible: boolean) => void;
  toggleLayerVisibility: (layerId: string) => void;
}

const MapLayerVisibilityContext =
  createContext<MapLayerVisibilityContextValue | null>(null);

function readHiddenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function persistHiddenIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function MapLayerVisibilityProvider({ children }: { children: ReactNode }) {
  const [hiddenLayerIds, setHiddenLayerIds] = useState(readHiddenIds);

  const isLayerVisible = useCallback(
    (layerId: string) => !hiddenLayerIds.has(layerId),
    [hiddenLayerIds],
  );

  const setLayerVisible = useCallback((layerId: string, visible: boolean) => {
    setHiddenLayerIds((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      persistHiddenIds(next);
      return next;
    });
  }, []);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setHiddenLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      persistHiddenIds(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      hiddenLayerIds,
      isLayerVisible,
      setLayerVisible,
      toggleLayerVisibility,
    }),
    [hiddenLayerIds, isLayerVisible, setLayerVisible, toggleLayerVisibility],
  );

  return (
    <MapLayerVisibilityContext.Provider value={value}>
      {children}
    </MapLayerVisibilityContext.Provider>
  );
}

export function useMapLayerVisibility() {
  const ctx = useContext(MapLayerVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useMapLayerVisibility must be used within MapLayerVisibilityProvider",
    );
  }
  return ctx;
}
