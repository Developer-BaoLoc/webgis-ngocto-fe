export interface LatLngValue {
  lat: number;
  lng: number;
}

export interface AreaPolygonValue {
  coordinates: LatLngValue[];
}

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

export function isAreaPolygonValue(value: unknown): value is AreaPolygonValue {
  if (typeof value !== "object" || value === null) return false;
  const coordinates = (value as AreaPolygonValue).coordinates;
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 3 &&
    coordinates.every(isLatLngValue)
  );
}

export function formatAreaPolygon(value: unknown): string {
  if (!isAreaPolygonValue(value)) return "—";
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
): AreaPolygonValue | null | undefined {
  if (value === null || value === undefined) return null;
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

  if (!isAreaPolygonValue(value)) {
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
