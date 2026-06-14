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
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxzoom: 20,
  },
  terrain: {
    id: "terrain",
    label: "Bản đồ đường",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap",
    maxzoom: 20,
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
