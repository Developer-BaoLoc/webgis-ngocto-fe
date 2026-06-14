import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import { extractStyleFromLayer } from "@/lib/layers/style";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

const SOURCE_PREFIX = "data-layer-";
const POINT_ICON_SIZE = 0.07;
const POINT_CIRCLE_RADIUS = 6;
const POINT_HIT_RADIUS = 20;

export function getDataLayerSourceId(layerId: string) {
  return `${SOURCE_PREFIX}${layerId}`;
}

function getDataLayerIds(layerId: string, geometryType: string) {
  const sourceId = getDataLayerSourceId(layerId);
  switch (geometryType) {
    case "polygon":
      return {
        sourceId,
        layerIds: [
          `${sourceId}-fill`,
          `${sourceId}-line`,
          `${sourceId}-symbol`,
          `${sourceId}-hit`,
        ],
      };
    case "line":
    case "linestring":
      return {
        sourceId,
        layerIds: [
          `${sourceId}-line`,
          `${sourceId}-symbol`,
          `${sourceId}-hit`,
        ],
      };
    default:
      return {
        sourceId,
        layerIds: [
          `${sourceId}-symbol`,
          `${sourceId}-circle`,
          `${sourceId}-hit`,
        ],
      };
  }
}

function getLayerIconUrl(layer: LayerGeoJsonEntry["layer"]): string | null {
  const style = extractStyleFromLayer(layer);
  const icon = style.icon;
  if (icon && typeof icon === "object" && icon.url) {
    return resolvePublicAssetUrl(icon.url);
  }
  if (style.iconUrl) {
    return resolvePublicAssetUrl(style.iconUrl);
  }
  return null;
}

function getIconImageId(layerId: string) {
  return `layer-icon-${layerId}`;
}

async function ensureLayerIcon(
  map: MapLibreMap,
  layerId: string,
  iconUrl: string,
): Promise<string | null> {
  const imageId = getIconImageId(layerId);
  if (map.hasImage(imageId)) return imageId;

  try {
    const response = await map.loadImage(iconUrl);
    map.addImage(imageId, response.data);
    return imageId;
  } catch {
    return null;
  }
}

function removeDataLayerById(
  map: MapLibreMap,
  layerId: string,
  geometryType: string,
) {
  const { sourceId, layerIds } = getDataLayerIds(layerId, geometryType);

  for (const id of layerIds) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  const markerSourceId = getMarkerSourceId(sourceId);
  if (map.getSource(markerSourceId)) map.removeSource(markerSourceId);

  const imageId = getIconImageId(layerId);
  if (map.hasImage(imageId)) map.removeImage(imageId);
}

export function getInteractiveLayerIds(entries: LayerGeoJsonEntry[]): string[] {
  return entries.flatMap(
    (entry) =>
      getDataLayerIds(entry.layer.id, entry.layer.geometryType).layerIds,
  );
}

export function findLayerEntryBySourceId(
  entries: LayerGeoJsonEntry[],
  sourceId: string,
): LayerGeoJsonEntry | undefined {
  const normalized = sourceId.endsWith("-markers")
    ? sourceId.slice(0, -"-markers".length)
    : sourceId;

  return entries.find(
    (entry) => getDataLayerSourceId(entry.layer.id) === normalized,
  );
}

export function removeAllDataLayers(
  map: MapLibreMap,
  entries: LayerGeoJsonEntry[],
) {
  for (const entry of entries) {
    removeDataLayerById(map, entry.layer.id, entry.layer.geometryType);
  }
}

function collectPositions(geometry: Geometry, positions: Position[] = []): Position[] {
  switch (geometry.type) {
    case "Point":
      positions.push(geometry.coordinates);
      break;
    case "MultiPoint":
      positions.push(...geometry.coordinates);
      break;
    case "LineString":
      positions.push(...geometry.coordinates);
      break;
    case "MultiLineString":
      for (const line of geometry.coordinates) {
        positions.push(...line);
      }
      break;
    case "Polygon":
      for (const ring of geometry.coordinates) {
        positions.push(...ring);
      }
      break;
    case "MultiPolygon":
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          positions.push(...ring);
        }
      }
      break;
    case "GeometryCollection":
      for (const part of geometry.geometries) {
        collectPositions(part, positions);
      }
      break;
  }
  return positions;
}

function getFeatureMarkerPoint(geometry: Geometry): Position | null {
  if (geometry.type === "Point") {
    return geometry.coordinates;
  }
  if (geometry.type === "MultiPoint" && geometry.coordinates.length > 0) {
    return geometry.coordinates[0];
  }

  const positions = collectPositions(geometry);
  if (!positions.length) return null;

  let minLng = positions[0][0];
  let maxLng = positions[0][0];
  let minLat = positions[0][1];
  let maxLat = positions[0][1];

  for (const [lng, lat] of positions) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

function buildMarkerGeoJson(geojson: FeatureCollection): FeatureCollection {
  const features: Feature[] = [];

  for (const feature of geojson.features) {
    if (!feature.geometry) continue;
    const coordinates = getFeatureMarkerPoint(feature.geometry);
    if (!coordinates) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: feature.properties ?? {},
      id: feature.id,
    });
  }

  return { type: "FeatureCollection", features };
}

function getMarkerSourceId(sourceId: string) {
  return `${sourceId}-markers`;
}

async function upsertLayerIconMarkers(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
  geojson: FeatureCollection,
) {
  const iconUrl = getLayerIconUrl(entry.layer);
  const markerSourceId = getMarkerSourceId(sourceId);
  const symbolLayerId = `${sourceId}-symbol`;
  const hitLayerId = `${sourceId}-hit`;

  if (!iconUrl) {
    if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId);
    if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
    if (map.getSource(markerSourceId)) map.removeSource(markerSourceId);
    return;
  }

  const iconImageId = await ensureLayerIcon(map, entry.layer.id, iconUrl);
  if (!iconImageId) return;

  const markerGeojson = buildMarkerGeoJson(geojson);
  const markerSource = map.getSource(markerSourceId);

  if (markerSource && markerSource.type === "geojson") {
    (markerSource as GeoJSONSource).setData(markerGeojson);
  } else {
    if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId);
    if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
    if (map.getSource(markerSourceId)) map.removeSource(markerSourceId);
    map.addSource(markerSourceId, { type: "geojson", data: markerGeojson });
  }

  if (!map.getLayer(symbolLayerId)) {
    map.addLayer({
      id: symbolLayerId,
      type: "symbol",
      source: markerSourceId,
      layout: {
        "icon-image": iconImageId,
        "icon-size": POINT_ICON_SIZE,
        "icon-allow-overlap": true,
        "icon-anchor": "bottom",
      },
    });
  } else {
    map.setLayoutProperty(symbolLayerId, "icon-size", POINT_ICON_SIZE);
  }

  if (!map.getLayer(hitLayerId)) {
    map.addLayer({
      id: hitLayerId,
      type: "circle",
      source: markerSourceId,
      paint: {
        "circle-radius": POINT_HIT_RADIUS,
        "circle-opacity": 0.01,
        "circle-stroke-width": 0,
      },
    });
  }
}

async function upsertPointLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
) {
  const iconUrl = getLayerIconUrl(entry.layer);
  const iconImageId = iconUrl
    ? await ensureLayerIcon(map, entry.layer.id, iconUrl)
    : null;

  const circleLayerId = `${sourceId}-circle`;
  const symbolLayerId = `${sourceId}-symbol`;
  const hitLayerId = `${sourceId}-hit`;

  if (iconImageId && !map.getLayer(symbolLayerId)) {
    map.addLayer({
      id: symbolLayerId,
      type: "symbol",
      source: sourceId,
      filter: [
        "any",
        ["==", ["geometry-type"], "Point"],
        ["==", ["geometry-type"], "MultiPoint"],
      ],
      layout: {
        "icon-image": iconImageId,
        "icon-size": POINT_ICON_SIZE,
        "icon-allow-overlap": true,
        "icon-anchor": "bottom",
      },
    });
  } else if (iconImageId && map.getLayer(symbolLayerId)) {
    map.setLayoutProperty(symbolLayerId, "icon-size", POINT_ICON_SIZE);
  }

  if (!map.getLayer(circleLayerId) && !iconImageId) {
    map.addLayer({
      id: circleLayerId,
      type: "circle",
      source: sourceId,
      filter: [
        "any",
        ["==", ["geometry-type"], "Point"],
        ["==", ["geometry-type"], "MultiPoint"],
      ],
      paint: {
        "circle-radius": POINT_CIRCLE_RADIUS,
        "circle-color": entry.layer.color,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  if (!map.getLayer(hitLayerId)) {
    map.addLayer({
      id: hitLayerId,
      type: "circle",
      source: sourceId,
      filter: [
        "any",
        ["==", ["geometry-type"], "Point"],
        ["==", ["geometry-type"], "MultiPoint"],
      ],
      paint: {
        "circle-radius": POINT_HIT_RADIUS,
        "circle-opacity": 0.01,
        "circle-stroke-width": 0,
      },
    });
  }
}

async function upsertPolygonLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
  geojson: FeatureCollection,
) {
  const style = extractStyleFromLayer(entry.layer);
  const fillLayerId = `${sourceId}-fill`;
  const lineLayerId = `${sourceId}-line`;

  if (!map.getLayer(fillLayerId)) {
    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": style.fillColor ?? entry.layer.color,
        "fill-opacity": 0.35,
      },
    });
  }

  if (!map.getLayer(lineLayerId)) {
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": style.strokeColor ?? "#15803d",
        "line-width": 2,
      },
    });
  }

  await upsertLayerIconMarkers(map, entry, sourceId, geojson);
}

async function upsertLineLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
  geojson: FeatureCollection,
) {
  const style = extractStyleFromLayer(entry.layer);
  const lineLayerId = `${sourceId}-line`;

  if (!map.getLayer(lineLayerId)) {
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": style.lineColor ?? entry.layer.color,
        "line-width": Number(style.lineWidth ?? 3),
      },
    });
  }

  await upsertLayerIconMarkers(map, entry, sourceId, geojson);
}

async function upsertDataLayer(map: MapLibreMap, entry: LayerGeoJsonEntry) {
  const { sourceId, layerIds } = getDataLayerIds(
    entry.layer.id,
    entry.layer.geometryType,
  );
  const geojson = entry.geojson as FeatureCollection;
  const source = map.getSource(sourceId);
  const hasAllLayers = layerIds.every((id) => Boolean(map.getLayer(id)));

  if (source && source.type === "geojson" && hasAllLayers) {
    (source as GeoJSONSource).setData(geojson);
  } else {
    removeDataLayerById(map, entry.layer.id, entry.layer.geometryType);
    map.addSource(sourceId, { type: "geojson", data: geojson });
  }

  switch (entry.layer.geometryType) {
    case "polygon":
      await upsertPolygonLayer(map, entry, sourceId, geojson);
      break;
    case "line":
    case "linestring":
      await upsertLineLayer(map, entry, sourceId, geojson);
      break;
    default:
      await upsertPointLayer(map, entry, sourceId);
  }
}

export async function syncDataLayers(
  map: MapLibreMap,
  entries: LayerGeoJsonEntry[],
) {
  for (const entry of entries) {
    await upsertDataLayer(map, entry);
  }
}

export async function restoreDataLayers(
  map: MapLibreMap,
  entries: LayerGeoJsonEntry[],
) {
  if (!entries.length) return;
  await syncDataLayers(map, entries);
}

export function setDataLayerVisibility(
  map: MapLibreMap,
  layerId: string,
  geometryType: string,
  visible: boolean,
) {
  const { layerIds } = getDataLayerIds(layerId, geometryType);
  const visibility = visible ? "visible" : "none";

  for (const id of layerIds) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visibility);
    }
  }
}

export function applyLayersVisibility(
  map: MapLibreMap,
  entries: LayerGeoJsonEntry[],
  hiddenLayerIds: ReadonlySet<string>,
) {
  for (const entry of entries) {
    setDataLayerVisibility(
      map,
      entry.layer.id,
      entry.layer.geometryType,
      !hiddenLayerIds.has(entry.layer.id),
    );
  }
}
