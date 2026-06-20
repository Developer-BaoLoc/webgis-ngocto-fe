import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import { extractStyleFromLayer } from "@/lib/layers/style";

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
    case "multipolygon":
      return {
        sourceId,
        layerIds: [`${sourceId}-fill`, `${sourceId}-line`],
      };
    case "line":
    case "linestring":
    case "multilinestring":
      return {
        sourceId,
        layerIds: [`${sourceId}-line`],
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
  if (layer.geometryType !== "point" && layer.geometryKind !== "point") {
    return null;
  }

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

  if (iconImageId) {
    if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
    if (!map.getLayer(symbolLayerId)) {
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
    } else {
      map.setLayoutProperty(symbolLayerId, "icon-size", POINT_ICON_SIZE);
    }
  } else {
    if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId);
    const imageId = getIconImageId(entry.layer.id);
    if (map.hasImage(imageId)) map.removeImage(imageId);
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

async function upsertLineLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
  geojson: FeatureCollection,
) {
  const style = extractStyleFromLayer(entry.layer);
  const lineLayerId = `${sourceId}-line`;
  if (entry.layer.code === "duong") {
    console.log("[duong-render-trace][frontend:upsertLineLayer:start]", {
      sourceId,
      lineLayerId,
      hasLineLayer: Boolean(map.getLayer(lineLayerId)),
      featureCount: geojson.features.length,
      style,
    });
  }

  if (!map.getLayer(lineLayerId)) {
    if (entry.layer.code === "duong") {
      console.log("[duong-render-trace][frontend:add-line-layer]", {
        lineLayerId,
        sourceId,
        lineColor: style.lineColor ?? entry.layer.color,
        lineWidth: Number(style.lineWidth ?? 3),
      });
    }
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
  const { sourceId, layerIds } = getDataLayerIds(
    entry.layer.id,
    entry.layer.geometryType,
  );
  const geojson = entry.geojson as FeatureCollection;
  const source = map.getSource(sourceId);
  const hasAllLayers = layerIds.every((id) => Boolean(map.getLayer(id)));
  if (entry.layer.code === "duong") {
    console.log("[duong-render-trace][frontend:upsertDataLayer:start]", {
      layerId: entry.layer.id,
      geometryKind: entry.layer.geometryKind,
      geometryType: entry.layer.geometryType,
      sourceId,
      layerIds,
      hasSource: Boolean(source),
      hasAllLayers,
      featureCount: geojson.features.length,
    });
  }

  if (source && source.type === "geojson" && hasAllLayers) {
    if (entry.layer.code === "duong") {
      console.log("[duong-render-trace][frontend:upsertDataLayer:setData]", {
        sourceId,
      });
    }
    (source as GeoJSONSource).setData(geojson);
  } else {
    if (entry.layer.code === "duong") {
      console.log("[duong-render-trace][frontend:add-source]", {
        sourceId,
        reason: source ? "missing-some-layers" : "missing-source",
      });
    }
    removeDataLayerById(map, entry.layer.id, entry.layer.geometryType);
    map.addSource(sourceId, { type: "geojson", data: geojson });
  }

  if (entry.layer.code === "duong") {
    console.log("[duong-render-trace][frontend:upsertDataLayer:switch]", {
      geometryType: entry.layer.geometryType,
    });
  }
  switch (entry.layer.geometryType) {
    case "polygon":
    case "multipolygon":
      await upsertPolygonLayer(map, entry, sourceId);
      break;
    case "line":
    case "linestring":
    case "multilinestring":
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

export function updateDataLayerSourceData(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
) {
  const sourceId = getDataLayerSourceId(entry.layer.id);
  const source = map.getSource(sourceId);
  if (!source || source.type !== "geojson") return false;
  (source as GeoJSONSource).setData(entry.geojson as FeatureCollection);
  return true;
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
    if (entry.layer.code === "duong") {
      console.log("[duong-render-trace][frontend:applyLayersVisibility]", {
        layerId: entry.layer.id,
        geometryType: entry.layer.geometryType,
        hidden: hiddenLayerIds.has(entry.layer.id),
      });
    }
    setDataLayerVisibility(
      map,
      entry.layer.id,
      entry.layer.geometryType,
      !hiddenLayerIds.has(entry.layer.id),
    );
  }
}
