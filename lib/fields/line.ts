import type { GeoJsonGeometry } from "@/types/gis.types";

export interface LatLngValue {
  lat: number;
  lng: number;
}

export interface LineStringValue {
  type: "LineString";
  coordinates: [number, number][];
}

export interface MultiLineStringValue {
  type: "MultiLineString";
  coordinates: [number, number][][];
}

export type LineGeometryValue = LineStringValue | MultiLineStringValue;

const MIN_LINE_POINTS = 2;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function isLngLatPosition(value: unknown): value is [number, number] {
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

export function isLineGeometryValue(value: unknown): value is LineGeometryValue {
  if (typeof value !== "object" || value === null) return false;
  const geometry = value as GeoJsonGeometry;
  if (geometry.type === "LineString") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length >= MIN_LINE_POINTS &&
      geometry.coordinates.every(isLngLatPosition)
    );
  }

  if (geometry.type === "MultiLineString") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 &&
      geometry.coordinates.every(
        (line) =>
          Array.isArray(line) &&
          line.length >= MIN_LINE_POINTS &&
          line.every(isLngLatPosition),
      )
    );
  }

  return false;
}

export function lineVertexCount(value: unknown): number {
  if (!isLineGeometryValue(value)) return 0;
  if (value.type === "MultiLineString") {
    return value.coordinates.reduce((total, line) => total + line.length, 0);
  }
  return value.coordinates.length;
}

export function formatLineGeometry(value: unknown): string {
  if (!isLineGeometryValue(value)) return "Chưa có đường";
  const count = lineVertexCount(value);
  return `${value.type} - ${count} đỉnh`;
}

export function lineToLatLngPoints(value: unknown): LatLngValue[] {
  if (!isLineGeometryValue(value)) return [];
  const coordinates =
    value.type === "MultiLineString" ? value.coordinates[0] : value.coordinates;
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function buildLineGeometryValue(
  points: Array<{ lat: string; lng: string } | LatLngValue>,
): LineStringValue | null {
  const coordinates = points
    .map((point) => {
      const lat = typeof point.lat === "number" ? point.lat : Number(point.lat.trim());
      const lng = typeof point.lng === "number" ? point.lng : Number(point.lng.trim());
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return [roundCoordinate(lng), roundCoordinate(lat)] as [number, number];
    })
    .filter((item): item is [number, number] => item !== null);

  return coordinates.length >= MIN_LINE_POINTS
    ? { type: "LineString", coordinates }
    : null;
}

export function emptyLinePoints(): Array<{ lat: string; lng: string }> {
  return [
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ];
}

export function parseLineInput(value: unknown): Array<{ lat: string; lng: string }> {
  const points = lineToLatLngPoints(value).map((point) => ({
    lat: String(point.lat),
    lng: String(point.lng),
  }));
  while (points.length < MIN_LINE_POINTS) {
    points.push({ lat: "", lng: "" });
  }
  return points.length > 0 ? points : emptyLinePoints();
}

export function normalizeLineProperty(
  value: unknown,
): LineGeometryValue | null | undefined {
  if (value === null || value === undefined) return null;
  if (isLineGeometryValue(value)) return value;
  return null;
}

export function validateLineProperty(
  value: unknown,
  required: boolean,
): string | null {
  if (!required && (value === null || value === undefined || value === "")) {
    return null;
  }

  if (!isLineGeometryValue(value)) {
    return "Vẽ đường LineString/MultiLineString với ít nhất 2 điểm";
  }

  return null;
}
