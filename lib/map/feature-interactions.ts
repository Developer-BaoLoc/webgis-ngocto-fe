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

type PopupMode = "hover" | "click";

let sharedPopup: maplibregl.Popup | null = null;
let detailButtonHandler: ((event: Event) => void) | null = null;
let activePopupMode: PopupMode | null = null;

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

function isIconHoverLayer(layerId: string): boolean {
  return layerId.endsWith("-hit");
}

function isShapeClickLayer(layerId: string): boolean {
  return layerId.endsWith("-fill") || layerId.endsWith("-line");
}

function resolveFeatureCoordinates(
  feature: GeoJSONFeature,
  lngLat: maplibregl.LngLatLike,
): maplibregl.LngLatLike {
  if (feature.geometry.type === "Point") {
    return feature.geometry.coordinates as [number, number];
  }
  return lngLat;
}

function resolveFeatureContext(
  event: MapLayerMouseEvent,
  entries: LayerGeoJsonEntry[],
) {
  const feature = event.features?.[0];
  const source = feature?.layer?.source ?? feature?.source;
  if (!feature || !source) return null;

  const entry = findLayerEntryBySourceId(entries, String(source));
  if (!entry) return null;

  return {
    feature,
    entry,
    coordinates: resolveFeatureCoordinates(feature, event.lngLat),
  };
}

function setPopupCloseButtonVisible(popup: maplibregl.Popup, visible: boolean) {
  const closeButton = popup
    .getElement()
    ?.querySelector(".maplibregl-popup-close-button") as HTMLElement | null;
  if (closeButton) {
    closeButton.style.display = visible ? "" : "none";
  }
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
  mode: PopupMode = "click",
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

  activePopupMode = mode;
  setPopupCloseButtonVisible(popup, mode === "click");

  const popupRoot = popup.getElement();
  if (popupRoot) {
    initMapPopupCarousel(popupRoot);
  }

  attachDetailButtonListener(popup, options?.onViewDetail);
}

function hideHoverPopup(popup: maplibregl.Popup) {
  if (activePopupMode !== "hover") return;
  popup.remove();
  activePopupMode = null;
}

type LayerHandler = {
  layerId: string;
  onClick?: (event: MapLayerMouseEvent) => void;
  onEnter: (event: MapLayerMouseEvent) => void;
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
    if (isIconHoverLayer(layerId)) {
      const onEnter = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const context = resolveFeatureContext(event, entries);
        if (!context) return;

        showFeaturePopup(
          map,
          context.feature,
          context.entry,
          context.coordinates,
          options,
          "hover",
        );
      };

      const onLeave = () => {
        map.getCanvas().style.cursor = "";
        hideHoverPopup(popup);
      };

      map.on("mouseenter", layerId, onEnter);
      map.on("mouseleave", layerId, onLeave);
      handlers.push({ layerId, onEnter, onLeave });
      continue;
    }

    if (!isShapeClickLayer(layerId)) continue;

    const onClick = (event: MapLayerMouseEvent) => {
      const context = resolveFeatureContext(event, entries);
      if (!context) return;

      event.originalEvent.stopPropagation();
      showFeaturePopup(
        map,
        context.feature,
        context.entry,
        context.coordinates,
        options,
        "click",
      );
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
      if (onClick) map.off("click", layerId, onClick);
      map.off("mouseenter", layerId, onEnter);
      map.off("mouseleave", layerId, onLeave);
    }
    popup.remove();
    activePopupMode = null;
    map.getCanvas().style.cursor = "";
  });
}

export function unbindMapFeatureInteractions(map: MapLibreMap) {
  cleanups.get(map)?.();
  cleanups.delete(map);
}
