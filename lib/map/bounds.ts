import type { GeoJsonFeatureCollection, GeoJsonGeometry } from "@/types/gis.types";
import type { MapViewBounds, MapViewBoundsInput } from "@/types/api/map-view";

type LngLat = [number, number];
type NestedCoordinates = number[] | NestedCoordinates[];

export function isValidMapViewBounds(
  bounds: MapViewBounds | null | undefined,
): bounds is MapViewBounds {
  if (!bounds || !Array.isArray(bounds) || bounds.length !== 2) return false;
  if (!Array.isArray(bounds[0]) || !Array.isArray(bounds[1])) return false;

  const [[west, south], [east, north]] = bounds;
  if (![west, south, east, north].every(Number.isFinite)) return false;

  return east > west && north > south;
}

/** Đảm bảo bbox có diện tích tối thiểu — tránh fitBounds lỗi với điểm suy biến */
export function ensureBoundsSpan(
  bounds: MapViewBounds,
  minLngSpan = 0.002,
  minLatSpan = 0.002,
): MapViewBounds {
  const [[west, south], [east, north]] = bounds;
  const lngSpan = east - west;
  const latSpan = north - south;

  if (lngSpan >= minLngSpan && latSpan >= minLatSpan) {
    return bounds;
  }

  const lngPad = Math.max((minLngSpan - lngSpan) / 2, 0);
  const latPad = Math.max((minLatSpan - latSpan) / 2, 0);

  return [
    [west - lngPad, south - latPad],
    [east + lngPad, north + latPad],
  ];
}

function extendBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  coord: LngLat,
) {
  const [lng, lat] = coord;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

  bounds.minLng = Math.min(bounds.minLng, lng);
  bounds.minLat = Math.min(bounds.minLat, lat);
  bounds.maxLng = Math.max(bounds.maxLng, lng);
  bounds.maxLat = Math.max(bounds.maxLat, lat);
}

function walkCoordinates(
  coords: NestedCoordinates,
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
) {
  if (typeof coords[0] === "number") {
    extendBounds(bounds, coords as LngLat);
    return;
  }

  for (const item of coords as NestedCoordinates[]) {
    walkCoordinates(item, bounds);
  }
}

function geometryBounds(geometry: GeoJsonGeometry | null) {
  if (!geometry) return null;

  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };

  walkCoordinates(geometry.coordinates, bounds);

  if (
    ![
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
    ].every(Number.isFinite)
  ) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ] as MapViewBounds;
}

export function getGeoJsonBounds(
  geojson: GeoJsonFeatureCollection,
): MapViewBounds | null {
  let result: MapViewBounds | null = null;

  for (const feature of geojson.features) {
    const featureBounds = geometryBounds(feature.geometry);
    if (!featureBounds) continue;

    if (!result) {
      result = featureBounds;
      continue;
    }

    result = [
      [
        Math.min(result[0][0], featureBounds[0][0]),
        Math.min(result[0][1], featureBounds[0][1]),
      ],
      [
        Math.max(result[1][0], featureBounds[1][0]),
        Math.max(result[1][1], featureBounds[1][1]),
      ],
    ];
  }

  return result && isValidMapViewBounds(result) ? result : null;
}

/** Chuẩn hóa bbox từ BE: [west,south,east,north] hoặc [[west,south],[east,north]] */
export function normalizeMapViewBounds(
  bounds: MapViewBoundsInput | unknown,
): MapViewBounds | null {
  if (!Array.isArray(bounds)) return null;

  // MapLibre / GeoJSON helper: [[west, south], [east, north]]
  if (
    bounds.length === 2 &&
    Array.isArray(bounds[0]) &&
    Array.isArray(bounds[1])
  ) {
    const [west, south] = bounds[0] as [number, number];
    const [east, north] = bounds[1] as [number, number];
    if (![west, south, east, north].every((value) => Number.isFinite(value))) {
      return null;
    }
    return [
      [west, south],
      [east, north],
    ];
  }

  // BE bbox: [west, south, east, north]
  if (bounds.length >= 4 && typeof bounds[0] === "number") {
    const [west, south, east, north] = bounds as [
      number,
      number,
      number,
      number,
    ];
    if (![west, south, east, north].every((value) => Number.isFinite(value))) {
      return null;
    }
    return [
      [west, south],
      [east, north],
    ];
  }

  return null;
}

/** Mở rộng bbox — cho phép zoom/pan ra ngoài ranh phường một chút */
export function padBounds(
  bounds: MapViewBoundsInput | unknown,
  ratio = 0.35,
): MapViewBounds | null {
  const normalized = normalizeMapViewBounds(bounds);
  if (!normalized) return null;

  const [[west, south], [east, north]] = normalized;
  const lngPad = (east - west) * ratio;
  const latPad = (north - south) * ratio;

  const padded: MapViewBounds = [
    [west - lngPad, south - latPad],
    [east + lngPad, north + latPad],
  ];

  return isValidMapViewBounds(padded) ? padded : null;
}
