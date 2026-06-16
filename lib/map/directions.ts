import type { LngLatLike } from "maplibre-gl";

export interface MapLatLng {
  lat: number;
  lng: number;
}

export function parseLngLatLike(value: LngLatLike): MapLatLng | null {
  if (Array.isArray(value)) {
    const [lng, lat] = value;
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return { lng, lat };
    }
    return null;
  }

  if (typeof value === "object" && value !== null) {
    const point = value as { lng?: number; lat?: number };
    if (Number.isFinite(point.lng) && Number.isFinite(point.lat)) {
      return { lng: point.lng!, lat: point.lat! };
    }
  }

  return null;
}

export function buildDirectionsUrl(destination: MapLatLng): string {
  const { lat, lng } = destination;
  return `https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${lat},${lng}&travelmode=driving`;
}

export function openDirections(destination: MapLatLng): void {
  window.open(buildDirectionsUrl(destination), "_blank", "noopener,noreferrer");
}
