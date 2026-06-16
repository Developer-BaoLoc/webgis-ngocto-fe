import { getLayerGeoJson } from "@/lib/api/layers";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import type { Layer } from "@/types/layer.types";
import { hasMapGeometry } from "@/lib/layers/adapter";

export interface LayerGeoJsonEntry {
  layer: Layer;
  geojson: GeoJsonFeatureCollection;
}

/** Không gửi bbox lần đầu — tránh 0 feature do bbox sai (theo tài liệu BE) */
export async function loadLayerGeoJsonEntries(
  layers: Layer[],
): Promise<LayerGeoJsonEntry[]> {
  const duongInput = layers.find((layer) => layer.code === "duong");
  console.log("[duong-render-trace][frontend:loadLayerGeoJsonEntries:input]", {
    found: Boolean(duongInput),
    layer: duongInput,
    inputCount: layers.length,
  });

  const mapLayers = layers
    .filter((layer) => {
      const accepted = hasMapGeometry(layer.geometryKind);
      if (layer.code === "duong") {
        console.log(
          "[duong-render-trace][frontend:loadLayerGeoJsonEntries:hasMapGeometry]",
          {
            geometryKind: layer.geometryKind,
            geometryType: layer.geometryType,
            accepted,
          },
        );
      }
      return accepted;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const results = await Promise.allSettled(
    mapLayers.map(async (layer) => {
      if (layer.code === "duong") {
        console.log("[duong-render-trace][frontend:geojson-fetch:start]", {
          layerId: layer.id,
          endpoint: layer.endpoint,
          geometryKind: layer.geometryKind,
          geometryType: layer.geometryType,
        });
      }
      const geojson = await getLayerGeoJson(layer.id);
      if (layer.code === "duong") {
        console.log("[duong-render-trace][frontend:geojson-fetch:done]", {
          layerId: layer.id,
          featureCount: geojson.features.length,
          firstGeometryType: geojson.features[0]?.geometry?.type ?? null,
        });
      }
      return { layer, geojson };
    }),
  );

  const entries = results
    .filter(
      (result): result is PromiseFulfilledResult<LayerGeoJsonEntry> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((entry) => {
      const accepted = entry.geojson.features.length > 0;
      if (entry.layer.code === "duong") {
        console.log(
          "[duong-render-trace][frontend:loadLayerGeoJsonEntries:featuresLength]",
          {
            featureCount: entry.geojson.features.length,
            accepted,
          },
        );
      }
      return accepted;
    });

  console.log("[duong-render-trace][frontend:loadLayerGeoJsonEntries:return]", {
    hasDuongEntry: entries.some((entry) => entry.layer.code === "duong"),
    entryCount: entries.length,
  });

  return entries;
}
