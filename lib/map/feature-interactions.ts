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
import { openDirections, parseLngLatLike } from "@/lib/map/directions";
import { initMapPopupCarousel } from "@/lib/map/popup-carousel";
import {
  findLayerEntryBySourceId,
  getInteractiveLayerIds,
} from "@/lib/map/data-layers";

export interface MapFeatureInteractionOptions {
  onViewDetail?: (
    layerId: string,
    recordId: string,
    destination?: { lat: number; lng: number },
  ) => void;
}

type PopupMode = "hover" | "click";

let sharedPopup: maplibregl.Popup | null = null;
let detailButtonHandler: ((event: Event) => void) | null = null;
let directionsButtonHandler: ((event: Event) => void) | null = null;
let activePopupMode: PopupMode | null = null;
let hoverHideTimer: ReturnType<typeof setTimeout> | null = null;
let isPointerOverPopup = false;
let popupHoverListeners: {
  element: HTMLElement;
  onEnter: () => void;
  onLeave: () => void;
} | null = null;

function cancelScheduledHoverHide() {
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
    hoverHideTimer = null;
  }
}

function detachPopupHoverListeners() {
  if (!popupHoverListeners) return;
  const { element, onEnter, onLeave } = popupHoverListeners;
  element.removeEventListener("mouseenter", onEnter);
  element.removeEventListener("mouseleave", onLeave);
  popupHoverListeners = null;
}

function attachPopupHoverListeners(popup: maplibregl.Popup) {
  detachPopupHoverListeners();

  const element = popup.getElement();
  if (!element) return;

  const onEnter = () => {
    isPointerOverPopup = true;
    cancelScheduledHoverHide();
  };

  const onLeave = () => {
    isPointerOverPopup = false;
    scheduleHideHoverPopup(popup);
  };

  element.addEventListener("mouseenter", onEnter);
  element.addEventListener("mouseleave", onLeave);
  popupHoverListeners = { element, onEnter, onLeave };
}

function scheduleHideHoverPopup(popup: maplibregl.Popup) {
  cancelScheduledHoverHide();
  hoverHideTimer = setTimeout(() => {
    hoverHideTimer = null;
    if (!isPointerOverPopup) {
      hideHoverPopup(popup);
    }
  }, 180);
}

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
  return (
    layerId.endsWith("-hit") ||
    layerId.endsWith("-center-symbol") ||
    layerId.endsWith("-center-circle")
  );
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
    closeButton.setAttribute("aria-label", "Đóng popup");
    closeButton.setAttribute("title", "Đóng popup");
  }
}

function attachDetailButtonListener(
  popup: maplibregl.Popup,
  destination: { lat: number; lng: number } | null,
  onViewDetail?: (
    layerId: string,
    recordId: string,
    coords?: { lat: number; lng: number },
  ) => void,
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
    if (layerId && recordId) {
      onViewDetail(
        layerId,
        recordId,
        destination ?? undefined,
      );
    }
  };

  button.addEventListener("click", detailButtonHandler);
}

function attachDirectionsButtonListener(
  popup: maplibregl.Popup,
  destination: { lat: number; lng: number } | null,
) {
  if (directionsButtonHandler) {
    const prev = popup
      .getElement()
      ?.querySelector(".map-popup-directions-btn");
    prev?.removeEventListener("click", directionsButtonHandler);
    directionsButtonHandler = null;
  }

  if (!destination) return;

  const button = popup.getElement()?.querySelector(
    ".map-popup-directions-btn",
  ) as HTMLButtonElement | null;

  if (!button) return;

  directionsButtonHandler = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    openDirections(destination);
  };

  button.addEventListener("click", directionsButtonHandler);
}

function attachPopupIconFallback(root: ParentNode) {
  const icons = root.querySelectorAll<HTMLImageElement>(
    ".map-popup-layer-mark--image img",
  );
  icons.forEach((icon) => {
    icon.addEventListener(
      "error",
      () => {
        icon.parentElement?.classList.add("is-fallback");
        icon.remove();
      },
      { once: true },
    );
  });
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
  delete properties.__onegisPolygonCenter;
  const { recordId, layerId } = extractRecordIds(properties);
  const destination = parseLngLatLike(lngLat);

  const popup = getPopup();
  popup
    .setLngLat(lngLat)
    .setHTML(
      buildFeaturePopupHtml({
        layerName: entry.layer.name,
        layerCode: entry.layer.code,
        layerId: layerId ?? entry.layer.id,
        layerColor: entry.layer.color,
        layerRole: entry.layer.layerRole,
        geometryKind: entry.layer.geometryKind ?? entry.layer.geometryType,
        style: entry.layer.style,
        recordId:
          recordId ??
          (typeof feature.id === "string" ? feature.id : undefined),
        properties,
        destination: destination ?? undefined,
      }),
    )
    .addTo(map);

  activePopupMode = mode;
  setPopupCloseButtonVisible(popup, mode === "click");

  const popupRoot = popup.getElement();
  if (popupRoot) {
    initMapPopupCarousel(popupRoot);
    attachPopupIconFallback(popupRoot);
  }

  attachDirectionsButtonListener(popup, destination);
  attachDetailButtonListener(popup, destination, options?.onViewDetail);

  if (mode === "hover") {
    attachPopupHoverListeners(popup);
  } else {
    detachPopupHoverListeners();
    isPointerOverPopup = false;
    cancelScheduledHoverHide();
  }
}

function hideHoverPopup(popup: maplibregl.Popup) {
  if (activePopupMode !== "hover") return;
  cancelScheduledHoverHide();
  detachPopupHoverListeners();
  isPointerOverPopup = false;
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
        cancelScheduledHoverHide();
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
        scheduleHideHoverPopup(popup);
      };

      const onClick = (event: MapLayerMouseEvent) => {
        const context = resolveFeatureContext(event, entries);
        if (!context) return;

        event.originalEvent.stopPropagation();
        cancelScheduledHoverHide();
        showFeaturePopup(
          map,
          context.feature,
          context.entry,
          context.coordinates,
          options,
          "click",
        );
      };

      map.on("mouseenter", layerId, onEnter);
      map.on("mouseleave", layerId, onLeave);
      map.on("click", layerId, onClick);
      handlers.push({ layerId, onClick, onEnter, onLeave });
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
    cancelScheduledHoverHide();
    detachPopupHoverListeners();
    isPointerOverPopup = false;
    popup.remove();
    activePopupMode = null;
    map.getCanvas().style.cursor = "";
  });
}

export function unbindMapFeatureInteractions(map: MapLibreMap) {
  cleanups.get(map)?.();
  cleanups.delete(map);
}
