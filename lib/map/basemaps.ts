import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "satellite" | "terrain";

export interface BasemapConfig {
  id: BasemapId;
  label: string;
  tiles: string[];
  attribution: string;
  maxzoom?: number;
}

export const BASEMAPS: Record<BasemapId, BasemapConfig> = {
  satellite: {
    id: "satellite",
    label: "Vệ tinh + nhãn",
    tiles: [
      "https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}",
    ],
    attribution: "© Google",
    maxzoom: 22,
  },
  terrain: {
    id: "terrain",
    label: "Bản đồ đường",
    tiles: [
      "https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
    ],
    attribution: "© Google",
    maxzoom: 22,
  },
};

export const DEFAULT_BASEMAP: BasemapId = "satellite";

export function createBasemapStyle(id: BasemapId): StyleSpecification {
  const basemap = BASEMAPS[id];
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: basemap.tiles,
        tileSize: 256,
        attribution: basemap.attribution,
        maxzoom: basemap.maxzoom,
      },
    },
    layers: [
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
      },
    ],
  };
}
