import maplibregl from "maplibre-gl";
import type {
  GeoJSONFeature,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import {
  buildFeaturePopupHtml,
  extractRecordIds,
} from "@/lib/map/feature-popup";
import { initMapPopupCarousel } from "@/lib/map/popup-carousel";
import {
  findLayerEntryBySourceId,
  getInteractiveLayerIds,
} from "@/lib/map/data-layers";

export interface MapFeatureInteractionOptions {
  onViewDetail?: (layerId: string, recordId: string) => void;
}

let sharedPopup: maplibregl.Popup | null = null;
let detailButtonHandler: ((event: Event) => void) | null = null;

function getPopup(): maplibregl.Popup {
  if (!sharedPopup) {
    sharedPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "320px",
      offset: 14,
      className: "gis-map-popup",
    });
  }
  return sharedPopup;
}

function attachDetailButtonListener(
  popup: maplibregl.Popup,
  onViewDetail?: (layerId: string, recordId: string) => void,
) {
  if (detailButtonHandler) {
    const prev = popup.getElement()?.querySelector(".map-popup-detail-btn");
    prev?.removeEventListener("click", detailButtonHandler);
    detailButtonHandler = null;
  }

  if (!onViewDetail) return;

  const button = popup.getElement()?.querySelector(
    ".map-popup-detail-btn",
  ) as HTMLButtonElement | null;

  if (!button) return;

  detailButtonHandler = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const layerId = button.dataset.layerId;
    const recordId = button.dataset.recordId;
    if (layerId && recordId) onViewDetail(layerId, recordId);
  };

  button.addEventListener("click", detailButtonHandler);
}

function showFeaturePopup(
  map: MapLibreMap,
  feature: GeoJSONFeature,
  entry: LayerGeoJsonEntry,
  lngLat: maplibregl.LngLatLike,
  options?: MapFeatureInteractionOptions,
) {
  const properties = { ...(feature.properties ?? {}) } as Record<string, unknown>;
  const { recordId, layerId } = extractRecordIds(properties);

  const popup = getPopup();
  popup
    .setLngLat(lngLat)
    .setHTML(
      buildFeaturePopupHtml({
        layerName: entry.layer.name,
        layerCode: entry.layer.code,
        layerId: layerId ?? entry.layer.id,
        recordId:
          recordId ??
          (typeof feature.id === "string" ? feature.id : undefined),
        properties,
      }),
    )
    .addTo(map);

  const popupRoot = popup.getElement();
  if (popupRoot) {
    initMapPopupCarousel(popupRoot);
  }

  attachDetailButtonListener(popup, options?.onViewDetail);
}

type LayerHandler = {
  layerId: string;
  onClick: (event: MapLayerMouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
};

const cleanups = new WeakMap<MapLibreMap, () => void>();

export function bindMapFeatureInteractions(
  map: MapLibreMap,
  entries: LayerGeoJsonEntry[],
  options?: MapFeatureInteractionOptions,
) {
  unbindMapFeatureInteractions(map);

  const interactiveLayerIds = getInteractiveLayerIds(entries).filter((layerId) =>
    map.getLayer(layerId),
  );

  if (!interactiveLayerIds.length) return;

  const popup = getPopup();
  const handlers: LayerHandler[] = [];

  for (const layerId of interactiveLayerIds) {
    const onClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const source = feature?.layer?.source ?? feature?.source;
      if (!feature || !source) return;

      event.originalEvent.stopPropagation();

      const entry = findLayerEntryBySourceId(entries, String(source));
      if (!entry) return;

      const coordinates =
        feature.geometry.type === "Point"
          ? (feature.geometry.coordinates as [number, number])
          : event.lngLat;

      showFeaturePopup(map, feature, entry, coordinates, options);
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", layerId, onClick);
    map.on("mouseenter", layerId, onEnter);
    map.on("mouseleave", layerId, onLeave);
    handlers.push({ layerId, onClick, onEnter, onLeave });
  }

  cleanups.set(map, () => {
    for (const { layerId, onClick, onEnter, onLeave } of handlers) {
      map.off("click", layerId, onClick);
      map.off("mouseenter", layerId, onEnter);
      map.off("mouseleave", layerId, onLeave);
    }
    popup.remove();
    map.getCanvas().style.cursor = "";
  });
}

export function unbindMapFeatureInteractions(map: MapLibreMap) {
  cleanups.get(map)?.();
  cleanups.delete(map);
}
