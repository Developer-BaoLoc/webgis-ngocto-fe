import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
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
        layerIds: [`${sourceId}-fill`, `${sourceId}-line`],
      };
    case "line":
    case "linestring":
      return { sourceId, layerIds: [`${sourceId}-line`] };
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

function getPointIconUrl(layer: LayerGeoJsonEntry["layer"]): string | null {
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

async function ensurePointIcon(
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
  return entries.find(
    (entry) => getDataLayerSourceId(entry.layer.id) === sourceId,
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

async function upsertPointLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
) {
  const iconUrl = getPointIconUrl(entry.layer);
  const iconImageId = iconUrl
    ? await ensurePointIcon(map, entry.layer.id, iconUrl)
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

function upsertPolygonLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
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
}

function upsertLineLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
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
}

async function upsertDataLayer(map: MapLibreMap, entry: LayerGeoJsonEntry) {
  const { sourceId } = getDataLayerIds(
    entry.layer.id,
    entry.layer.geometryType,
  );
  const geojson = entry.geojson as FeatureCollection;
  const source = map.getSource(sourceId);

  if (source && source.type === "geojson") {
    (source as GeoJSONSource).setData(geojson);
  } else {
    removeDataLayerById(map, entry.layer.id, entry.layer.geometryType);
    map.addSource(sourceId, { type: "geojson", data: geojson });
  }

  switch (entry.layer.geometryType) {
    case "polygon":
      upsertPolygonLayer(map, entry, sourceId);
      break;
    case "line":
    case "linestring":
      upsertLineLayer(map, entry, sourceId);
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
