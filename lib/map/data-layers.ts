import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import { extractStyleFromLayer } from "@/lib/layers/style";
import { buildColorMatchExpression } from "@/lib/layers/dynamic-style";

const SOURCE_PREFIX = "data-layer-";
const POINT_ICON_SIZE = 0.07;
const POINT_CIRCLE_RADIUS = 6;
const POINT_HIT_RADIUS = 20;
const registeredLayerImages = new WeakMap<
  MapLibreMap,
  Map<string, Set<string>>
>();

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
  return ensureMapImage(map, layerId, imageId, iconUrl);
}

async function ensureMapImage(
  map: MapLibreMap,
  layerId: string,
  imageId: string,
  iconUrl: string,
): Promise<string | null> {
  if (map.hasImage(imageId)) return imageId;

  try {
    const response = await map.loadImage(iconUrl);
    if (!map.hasImage(imageId)) map.addImage(imageId, response.data);
    let layers = registeredLayerImages.get(map);
    if (!layers) {
      layers = new Map();
      registeredLayerImages.set(map, layers);
    }
    const imageIds = layers.get(layerId) ?? new Set<string>();
    imageIds.add(imageId);
    layers.set(layerId, imageIds);
    return imageId;
  } catch {
    return null;
  }
}

function removeRegisteredLayerImages(map: MapLibreMap, layerId: string) {
  const layers = registeredLayerImages.get(map);
  for (const imageId of layers?.get(layerId) ?? []) {
    if (map.hasImage(imageId)) map.removeImage(imageId);
  }
  layers?.delete(layerId);
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
  removeRegisteredLayerImages(map, layerId);
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
  const style = extractStyleFromLayer(entry.layer);
  const iconUrl = getLayerIconUrl(entry.layer);
  const singleIconImageId = iconUrl
    ? await ensureLayerIcon(map, entry.layer.id, iconUrl)
    : null;
  const dynamicIcon = await buildDynamicIconExpression(
    map,
    entry.layer.id,
    style,
    singleIconImageId,
  );
  const iconImage = dynamicIcon ?? singleIconImageId;

  const circleLayerId = `${sourceId}-circle`;
  const symbolLayerId = `${sourceId}-symbol`;
  const hitLayerId = `${sourceId}-hit`;

  if (iconImage) {
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
          "icon-image": iconImage,
          "icon-size": POINT_ICON_SIZE,
          "icon-allow-overlap": true,
          "icon-anchor": "bottom",
        },
      });
    } else {
      map.setLayoutProperty(symbolLayerId, "icon-image", iconImage);
      map.setLayoutProperty(symbolLayerId, "icon-size", POINT_ICON_SIZE);
    }
  } else {
    if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId);
    const imageId = getIconImageId(entry.layer.id);
    if (map.hasImage(imageId)) map.removeImage(imageId);
  }

  if (!map.getLayer(circleLayerId) && !iconImage) {
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
        "circle-color": buildColorMatchExpression(
          style,
          "fill",
          entry.layer.color,
        ),
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  } else if (map.getLayer(circleLayerId) && !iconImage) {
    map.setPaintProperty(
      circleLayerId,
      "circle-color",
      buildColorMatchExpression(style, "fill", entry.layer.color),
    );
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

async function buildDynamicIconExpression(
  map: MapLibreMap,
  layerId: string,
  style: ReturnType<typeof extractStyleFromLayer>,
  singleIconImageId: string | null,
): Promise<ExpressionSpecification | string | null> {
  if (style.styleMode !== "icon_by_value" || !style.styleField) return null;

  const fallbackUrl = style.fallbackIcon?.url
    ? resolvePublicAssetUrl(style.fallbackIcon.url)
    : null;
  const fallbackImageId = fallbackUrl
    ? await ensureMapImage(
        map,
        layerId,
        dynamicImageId(
          layerId,
          `fallback:${style.fallbackIcon?.attachmentId ?? fallbackUrl}`,
        ),
        fallbackUrl,
      )
    : singleIconImageId;
  const matches: Array<string | number | ExpressionSpecification> = [];
  let firstRuleImageId: string | null = null;
  const stringifyValues = (style.iconRules ?? []).some(
    (rule) => typeof rule.value === "boolean",
  );

  for (const rule of style.iconRules ?? []) {
    if (!rule.url) continue;
    const imageId = await ensureMapImage(
      map,
      layerId,
      dynamicImageId(
        layerId,
        `${String(rule.value)}:${rule.attachmentId ?? rule.url}`,
      ),
      resolvePublicAssetUrl(rule.url),
    );
    if (!imageId) continue;
    firstRuleImageId ??= imageId;
    const matchValue: string | number =
      stringifyValues || typeof rule.value === "boolean"
        ? String(rule.value)
        : rule.value;
    matches.push(matchValue, imageId);
  }

  const fallback = fallbackImageId ?? firstRuleImageId;
  if (!fallback) return null;
  if (matches.length === 0) return fallback;
  const input: ExpressionSpecification = stringifyValues
    ? ["to-string", ["get", style.styleField]]
    : ["get", style.styleField];
  return ["match", input, ...matches, fallback] as ExpressionSpecification;
}

function dynamicImageId(layerId: string, value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `layer-icon-${layerId}-${(hash >>> 0).toString(36)}`;
}

async function upsertPolygonLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
) {
  const style = extractStyleFromLayer(entry.layer);
  const fillColor = buildColorMatchExpression(
    style,
    "fill",
    style.fillColor ?? entry.layer.color,
  );
  const strokeColor = buildColorMatchExpression(
    style,
    "stroke",
    style.strokeColor ?? "#15803d",
  );
  const fillLayerId = `${sourceId}-fill`;
  const lineLayerId = `${sourceId}-line`;

  if (!map.getLayer(fillLayerId)) {
    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": fillColor,
        "fill-opacity": 0.35,
      },
    });
  } else {
    map.setPaintProperty(fillLayerId, "fill-color", fillColor);
  }

  if (!map.getLayer(lineLayerId)) {
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": strokeColor,
        "line-width": 2,
      },
    });
  } else {
    map.setPaintProperty(lineLayerId, "line-color", strokeColor);
  }
}

async function upsertLineLayer(
  map: MapLibreMap,
  entry: LayerGeoJsonEntry,
  sourceId: string,
  geojson: FeatureCollection,
) {
  const style = extractStyleFromLayer(entry.layer);
  const lineColor = buildColorMatchExpression(
    style,
    "line",
    style.lineColor ?? entry.layer.color,
  );
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
        "line-color": lineColor,
        "line-width": Number(style.lineWidth ?? 3),
      },
    });
  } else {
    map.setPaintProperty(lineLayerId, "line-color", lineColor);
  }
}

async function upsertDataLayer(map: MapLibreMap, entry: LayerGeoJsonEntry) {
  const { sourceId, layerIds } = getDataLayerIds(
    entry.layer.id,
    entry.layer.geometryType,
  );
  const geojson = entry.geojson as FeatureCollection;
  const source = map.getSource(sourceId);
  const hasAllLayers = hasRequiredDataLayers(
    map,
    layerIds,
    entry.layer.geometryType,
  );
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

function hasRequiredDataLayers(
  map: MapLibreMap,
  layerIds: string[],
  geometryType: string,
) {
  if (!["point", "multipoint"].includes(geometryType.toLowerCase())) {
    return layerIds.every((id) => Boolean(map.getLayer(id)));
  }
  const hit = layerIds.find((id) => id.endsWith("-hit"));
  const visual = layerIds.filter(
    (id) => id.endsWith("-symbol") || id.endsWith("-circle"),
  );
  return Boolean(
    hit && map.getLayer(hit) && visual.some((id) => map.getLayer(id)),
  );
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
