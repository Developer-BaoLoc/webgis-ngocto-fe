import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

export const WARD_BOUNDARY_SOURCE_ID = "ward-boundary";
export const WARD_BOUNDARY_FILL_LAYER_ID = "ward-boundary-fill";
export const WARD_BOUNDARY_LINE_LAYER_ID = "ward-boundary-line";

const WARD_BOUNDARY_STYLE = {
  fillColor: "#2563eb",
  fillOpacity: 0.12,
  lineColor: "#1d4ed8",
  lineWidth: 2.5,
} as const;

export function upsertWardBoundaryLayer(
  map: MapLibreMap,
  geojson: GeoJsonFeatureCollection,
) {
  const source = map.getSource(WARD_BOUNDARY_SOURCE_ID);

  if (source && source.type === "geojson") {
    (source as GeoJSONSource).setData(geojson as FeatureCollection);
    return;
  }

  map.addSource(WARD_BOUNDARY_SOURCE_ID, {
    type: "geojson",
    data: geojson as FeatureCollection,
  });

  map.addLayer({
    id: WARD_BOUNDARY_FILL_LAYER_ID,
    type: "fill",
    source: WARD_BOUNDARY_SOURCE_ID,
    paint: {
      "fill-color": WARD_BOUNDARY_STYLE.fillColor,
      "fill-opacity": WARD_BOUNDARY_STYLE.fillOpacity,
    },
  });

  map.addLayer({
    id: WARD_BOUNDARY_LINE_LAYER_ID,
    type: "line",
    source: WARD_BOUNDARY_SOURCE_ID,
    paint: {
      "line-color": WARD_BOUNDARY_STYLE.lineColor,
      "line-width": WARD_BOUNDARY_STYLE.lineWidth,
    },
  });
}

export function removeWardBoundaryLayer(map: MapLibreMap) {
  if (map.getLayer(WARD_BOUNDARY_LINE_LAYER_ID)) {
    map.removeLayer(WARD_BOUNDARY_LINE_LAYER_ID);
  }
  if (map.getLayer(WARD_BOUNDARY_FILL_LAYER_ID)) {
    map.removeLayer(WARD_BOUNDARY_FILL_LAYER_ID);
  }
  if (map.getSource(WARD_BOUNDARY_SOURCE_ID)) {
    map.removeSource(WARD_BOUNDARY_SOURCE_ID);
  }
}
