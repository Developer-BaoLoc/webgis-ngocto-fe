import type {
  Map as MapLibreMap,
  RequestTransformFunction,
  StyleSpecification,
} from "maplibre-gl";
import type { BasemapId } from "./basemaps";

/**
 * Google Maps raster tiles (hl=vi).
 * - m: bản đồ đường
 * - y: hybrid — vệ tinh + nhãn (mặc định project tham chiếu)
 */
const GOOGLE_LYRS: Record<BasemapId, string> = {
  terrain: "m",
  satellite: "y",
};

const BASEMAP_LAYER_IDS: Record<BasemapId, string> = {
  terrain: "simple-tiles-terrain",
  satellite: "simple-tiles-satellite",
};

export type MapBasemapProvider = "google" | "fallback";

export function getMapboxAccessToken(): string | undefined {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || undefined;
}

export function buildGoogleRasterUrl(lyrs: string): string {
  return `https://mt1.google.com/vt/lyrs=${lyrs}&hl=vi&x={x}&y={y}&z={z}`;
}

function buildRasterStyle(
  active: BasemapId,
  token?: string,
): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {
      "raster-tiles-terrain": {
        type: "raster",
        tiles: [buildGoogleRasterUrl(GOOGLE_LYRS.terrain)],
        tileSize: 256,
      },
      "raster-tiles-satellite": {
        type: "raster",
        tiles: [buildGoogleRasterUrl(GOOGLE_LYRS.satellite)],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: BASEMAP_LAYER_IDS.satellite,
        type: "raster",
        source: "raster-tiles-satellite",
        minzoom: 0,
        maxzoom: 22,
        layout: {
          visibility: active === "satellite" ? "visible" : "none",
        },
      },
      {
        id: BASEMAP_LAYER_IDS.terrain,
        type: "raster",
        source: "raster-tiles-terrain",
        minzoom: 0,
        maxzoom: 22,
        layout: {
          visibility: active === "terrain" ? "visible" : "none",
        },
      },
    ],
  };

  if (token) {
    style.glyphs =
      "mapbox://fonts/mapbox/{fontstack}/{range}.pbf?access_token=" + token;
  }

  return style;
}

/** Style raster Google — preload cả hai lớp, đổi bằng visibility (không setStyle). */
export function createGoogleRasterStyle(
  active: BasemapId = "satellite",
  token?: string,
): StyleSpecification {
  return buildRasterStyle(active, token ?? getMapboxAccessToken());
}

export function setGoogleBasemapVisibility(
  map: MapLibreMap,
  id: BasemapId,
): void {
  for (const basemapId of Object.keys(BASEMAP_LAYER_IDS) as BasemapId[]) {
    const layerId = BASEMAP_LAYER_IDS[basemapId];
    if (!map.getLayer(layerId)) continue;
    map.setLayoutProperty(
      layerId,
      "visibility",
      basemapId === id ? "visible" : "none",
    );
  }
}

/** @deprecated Dùng setGoogleBasemapVisibility */
export const setMapboxBasemapVisibility = setGoogleBasemapVisibility;

/** MapLibre cần transform mapbox:// → https://api.mapbox.com (glyphs) */
export function createMapboxTransformRequest(): RequestTransformFunction {
  return (url: string) => {
    if (!url.startsWith("mapbox://")) {
      return { url };
    }

    const rest = url.slice("mapbox://".length);
    const queryIndex = rest.indexOf("?");
    const path = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest;
    const query = queryIndex >= 0 ? rest.slice(queryIndex + 1) : "";

    if (path.startsWith("fonts/")) {
      const httpsUrl = `https://api.mapbox.com/fonts/v1/${path.slice("fonts/".length)}`;
      return { url: query ? `${httpsUrl}?${query}` : httpsUrl };
    }

    return { url };
  };
}

export function resolveMapBasemapStyle(basemapId: BasemapId): {
  style: StyleSpecification;
  provider: MapBasemapProvider;
} {
  const token = getMapboxAccessToken();
  return {
    style: createGoogleRasterStyle(basemapId, token),
    provider: "google",
  };
}
