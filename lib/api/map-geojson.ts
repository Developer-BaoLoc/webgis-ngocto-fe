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
  const mapLayers = layers
    .filter((layer) => hasMapGeometry(layer.geometryKind))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const results = await Promise.allSettled(
    mapLayers.map(async (layer) => {
      const geojson = await getLayerGeoJson(layer.id);
      return { layer, geojson };
    }),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<LayerGeoJsonEntry> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((entry) => entry.geojson.features.length > 0);
}
