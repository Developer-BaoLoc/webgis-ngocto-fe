const fallbackCenter = { lat: 9.4466, lng: 105.9342 };
const fallbackPanBounds: [[number, number], [number, number]] = [
  [105.45, 9.35],
  [106.15, 10.45],
];

function readString(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readMapCenter(value: string | undefined) {
  if (!value) return fallbackCenter;
  const [lat, lng] = value.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fallbackCenter;
  return { lat, lng };
}

function readPanBounds(value: string | undefined) {
  if (!value) return fallbackPanBounds;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return fallbackPanBounds;
  }
  return [
    [parts[0], parts[1]],
    [parts[2], parts[3]],
  ] as [[number, number], [number, number]];
}

const wardId = readString(process.env.NEXT_PUBLIC_DEFAULT_WARD_ID, "ngoc-to");
const wardName = readString(
  process.env.NEXT_PUBLIC_DEFAULT_WARD_NAME,
  "Ngọc Tố",
);

export const wardConfig = {
  id: wardId,
  name: wardName,
  locationLabel: readString(
    process.env.NEXT_PUBLIC_DEFAULT_WARD_LABEL,
    `Xã ${wardName}`,
  ),
  district: readString(
    process.env.NEXT_PUBLIC_DEFAULT_DISTRICT_NAME,
    "Huyện Mỹ Xuyên",
  ),
  city: readString(
    process.env.NEXT_PUBLIC_DEFAULT_PROVINCE_NAME,
    "Thành phố Cần Thơ",
  ),
  cityShort: readString(
    process.env.NEXT_PUBLIC_DEFAULT_PROVINCE_SHORT,
    "TP. Cần Thơ",
  ),
  country: readString(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_NAME, "Việt Nam"),
  /** Fallback — ưu tiên lấy từ GET /api/layers → project.center */
  center: readMapCenter(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER),
  defaultZoom: readNumber(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM, 15),
  panBounds: readPanBounds(process.env.NEXT_PUBLIC_DEFAULT_PAN_BOUNDS),
  storageNamespace: readString(
    process.env.NEXT_PUBLIC_STORAGE_NAMESPACE,
    wardId,
  ),
} as const;
