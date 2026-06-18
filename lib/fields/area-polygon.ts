export interface LatLngValue {
  lat: number;
  lng: number;
}

export interface AreaPolygonValue {
  coordinates: LatLngValue[];
}

type LngLatPosition = [number, number];

export interface PolygonValue {
  type: "Polygon";
  coordinates: LngLatPosition[][];
}

export interface MultiPolygonValue {
  type: "MultiPolygon";
  coordinates: LngLatPosition[][][];
}

export type AreaPolygonGeometryValue = PolygonValue | MultiPolygonValue;

export function isLatLngValue(value: unknown): value is LatLngValue {
  if (typeof value !== "object" || value === null) return false;
  const v = value as LatLngValue;
  return (
    typeof v.lat === "number" &&
    !Number.isNaN(v.lat) &&
    typeof v.lng === "number" &&
    !Number.isNaN(v.lng)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function isLngLatPosition(value: unknown): value is LngLatPosition {
  if (!Array.isArray(value) || value.length < 2) return false;
  const [lng, lat] = value;
  return (
    isFiniteNumber(lng) &&
    isFiniteNumber(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function samePosition(a: LngLatPosition, b: LngLatPosition): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function normalizeRing(value: unknown): LngLatPosition[] | null {
  if (!Array.isArray(value)) return null;
  const ring = value
    .map((position) => {
      if (!isLngLatPosition(position)) return null;
      const [lng, lat] = position;
      return [roundCoordinate(lng), roundCoordinate(lat)] as LngLatPosition;
    })
    .filter((item): item is LngLatPosition => item !== null);

  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return null;
  if (samePosition(first, last)) return ring.length >= 4 ? ring : null;
  return [...ring, first];
}

function normalizePolygonRings(value: unknown): LngLatPosition[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rings = value
    .map((ring) => normalizeRing(ring))
    .filter((ring): ring is LngLatPosition[] => ring !== null);
  return rings.length === value.length && rings.length > 0 ? rings : null;
}

export function normalizeAreaPolygonGeometry(
  value: unknown,
): AreaPolygonGeometryValue | null {
  if (typeof value !== "object" || value === null) return null;
  const geometry = value as { type?: unknown; coordinates?: unknown };

  if (geometry.type === "Polygon") {
    const coordinates = normalizePolygonRings(geometry.coordinates);
    return coordinates ? { type: "Polygon", coordinates } : null;
  }

  if (geometry.type === "MultiPolygon") {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      return null;
    }
    const polygons = geometry.coordinates
      .map((polygon) => normalizePolygonRings(polygon))
      .filter((polygon): polygon is LngLatPosition[][] => polygon !== null);
    return polygons.length === geometry.coordinates.length && polygons.length > 0
      ? { type: "MultiPolygon", coordinates: polygons }
      : null;
  }

  return null;
}

export function isAreaPolygonGeometryValue(
  value: unknown,
): value is AreaPolygonGeometryValue {
  return normalizeAreaPolygonGeometry(value) !== null;
}

export function isAreaPolygonValue(value: unknown): value is AreaPolygonValue {
  if (typeof value !== "object" || value === null) return false;
  const coordinates = (value as AreaPolygonValue).coordinates;
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 3 &&
    coordinates.every(isLatLngValue)
  );
}

export function areaPolygonVertexCount(value: unknown): number {
  const geometry = normalizeAreaPolygonGeometry(value);
  if (geometry?.type === "Polygon") {
    return geometry.coordinates.reduce((total, ring) => total + ring.length, 0);
  }
  if (geometry?.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (total, polygon) =>
        total +
        polygon.reduce((ringTotal, ring) => ringTotal + ring.length, 0),
      0,
    );
  }
  if (isAreaPolygonValue(value)) return value.coordinates.length;
  return 0;
}

export function formatAreaPolygon(value: unknown): string {
  const geometry = normalizeAreaPolygonGeometry(value);
  if (geometry) return `${geometry.type} - ${areaPolygonVertexCount(geometry)} đỉnh`;
  if (!isAreaPolygonValue(value)) return "Chưa có vùng";
  return `${value.coordinates.length} điểm`;
}

export function emptyAreaPolygonPoints(): Array<{ lat: string; lng: string }> {
  return [
    { lat: "", lng: "" },
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ];
}

export function parseAreaPolygonInput(value: unknown): Array<{ lat: string; lng: string }> {
  const points = areaPolygonToLatLngPoints(value).map((point) => ({
    lat: String(point.lat),
    lng: String(point.lng),
  }));
  if (points.length > 0) {
    while (points.length < 3) {
      points.push({ lat: "", lng: "" });
    }
    return points;
  }

  if (typeof value === "object" && value !== null) {
    const coordinates = (value as AreaPolygonValue).coordinates;
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      const points = coordinates.map((point) => ({
        lat: isLatLngValue(point) ? String(point.lat) : "",
        lng: isLatLngValue(point) ? String(point.lng) : "",
      }));
      while (points.length < 3) {
        points.push({ lat: "", lng: "" });
      }
      return points;
    }
  }
  return emptyAreaPolygonPoints();
}

export function normalizeAreaPolygonProperty(
  value: unknown,
): AreaPolygonValue | AreaPolygonGeometryValue | null | undefined {
  if (value === null || value === undefined) return null;
  const geometry = normalizeAreaPolygonGeometry(value);
  if (geometry) return geometry;
  if (isAreaPolygonValue(value)) return value;
  return null;
}

export function validateAreaPolygonProperty(
  value: unknown,
  required: boolean,
): string | null {
  if (!required) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "object" &&
        Array.isArray((value as AreaPolygonValue).coordinates) &&
        (value as AreaPolygonValue).coordinates.length === 0)
    ) {
      return null;
    }
  }

  if (!isAreaPolygonValue(value) && !normalizeAreaPolygonGeometry(value)) {
    return "Nhập ít nhất 3 điểm lat/lng để tạo vùng";
  }

  return null;
}

export function parseAreaPolygonImportText(raw: string): AreaPolygonValue | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isAreaPolygonValue(parsed)) return parsed;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { coordinates?: unknown }).coordinates)
      ) {
        const built = buildAreaPolygonValue(
          ((parsed as { coordinates: Array<{ lat?: number; lng?: number }> })
            .coordinates ?? []
          ).map((point) => ({
            lat: point.lat === undefined ? "" : String(point.lat),
            lng: point.lng === undefined ? "" : String(point.lng),
          })),
        );
        return built;
      }
    } catch {
      return null;
    }
  }

  const pairs = trimmed.split(";").map((part) => part.trim()).filter(Boolean);
  const points = pairs.map((pair) => {
    const [lat, lng] = pair.split(",").map((item) => item.trim());
    return { lat: lat ?? "", lng: lng ?? "" };
  });

  return buildAreaPolygonValue(points);
}

export function areaPolygonToLatLngPoints(value: unknown): LatLngValue[] {
  const geometry = normalizeAreaPolygonGeometry(value);
  if (geometry?.type === "Polygon") {
    const ring = geometry.coordinates[0] ?? [];
    const openRing =
      ring.length > 1 && samePosition(ring[0], ring[ring.length - 1])
        ? ring.slice(0, -1)
        : ring;
    return openRing.map(([lng, lat]) => ({ lat, lng }));
  }

  if (geometry?.type === "MultiPolygon") {
    const ring = geometry.coordinates[0]?.[0] ?? [];
    const openRing =
      ring.length > 1 && samePosition(ring[0], ring[ring.length - 1])
        ? ring.slice(0, -1)
        : ring;
    return openRing.map(([lng, lat]) => ({ lat, lng }));
  }

  return isAreaPolygonValue(value) ? value.coordinates : [];
}

export function buildAreaPolygonValue(
  coordinates: Array<{ lat: string; lng: string }>,
): AreaPolygonValue | null {
  const parsed = coordinates
    .map(({ lat, lng }) => {
      const latNum = Number(lat.trim());
      const lngNum = Number(lng.trim());
      if (!lat.trim() || !lng.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        return null;
      }
      return { lat: latNum, lng: lngNum };
    })
    .filter((item): item is LatLngValue => item !== null);

  return parsed.length >= 3 ? { coordinates: parsed } : null;
}
