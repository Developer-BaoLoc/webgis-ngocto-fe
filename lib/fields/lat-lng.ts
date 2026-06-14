export interface LatLngValue {
  lat: number;
  lng: number;
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

export function formatLatLng(value: unknown): string {
  if (!isLatLngValue(value)) return "—";
  return `${value.lat}, ${value.lng}`;
}

export function parseLatLngInput(value: unknown): { lat: string; lng: string } {
  if (!isLatLngValue(value)) {
    return { lat: "", lng: "" };
  }
  return {
    lat: String(value.lat),
    lng: String(value.lng),
  };
}

/** Giá trị đang nhập — có thể chưa đủ cả lat và lng */
export function buildLatLngValue(
  latRaw: string,
  lngRaw: string,
): LatLngValue | null {
  const latStr = latRaw.trim();
  const lngStr = lngRaw.trim();
  if (!latStr || !lngStr) return null;
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function normalizeLatLngProperty(
  value: unknown,
): LatLngValue | null | undefined {
  if (value === null || value === undefined) return null;
  if (isLatLngValue(value)) return value;
  return null;
}
