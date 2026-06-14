import type { StyleSpecification } from "maplibre-gl";
import type maplibregl from "maplibre-gl";
import type { BasemapId } from "./basemaps";

/**
 * Raster tiles Mapbox — ảnh ghép sẵn nhãn đường/địa danh (OSM tại VN).
 * satellite-streets: vệ tinh + nhãn (giống Google Hybrid)
 * streets-v12: bản đồ đường phố VN
 */
function mapboxStyleRasterTiles(styleSlug: string, token: string): string {
  return `https://api.mapbox.com/styles/v1/${styleSlug}/tiles/256/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`;
}

const MAPBOX_RASTER_STYLES: Record<BasemapId, string> = {
  satellite: "mapbox/satellite-streets-v12",
  terrain: "mapbox/streets-v12",
};

export function getMapboxAccessToken(): string | undefined {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || undefined;
}

export function isMapboxBasemapEnabled(): boolean {
  return Boolean(getMapboxAccessToken());
}

export function createMapboxBasemapStyle(
  token: string,
  active: BasemapId = "satellite",
): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [mapboxStyleRasterTiles(MAPBOX_RASTER_STYLES.satellite, token)],
        tileSize: 512,
        attribution: "© Mapbox © OpenStreetMap",
      },
      terrain: {
        type: "raster",
        tiles: [mapboxStyleRasterTiles(MAPBOX_RASTER_STYLES.terrain, token)],
        tileSize: 512,
        attribution: "© Mapbox © OpenStreetMap",
      },
    },
    layers: [
      {
        id: "mapbox-satellite",
        type: "raster",
        source: "satellite",
        layout: {
          visibility: active === "satellite" ? "visible" : "none",
        },
      },
      {
        id: "mapbox-terrain",
        type: "raster",
        source: "terrain",
        layout: {
          visibility: active === "terrain" ? "visible" : "none",
        },
      },
    ],
  };
}

export function setMapboxBasemapVisibility(
  map: maplibregl.Map,
  id: BasemapId,
): void {
  map.setLayoutProperty(
    "mapbox-satellite",
    "visibility",
    id === "satellite" ? "visible" : "none",
  );
  map.setLayoutProperty(
    "mapbox-terrain",
    "visibility",
    id === "terrain" ? "visible" : "none",
  );
}
