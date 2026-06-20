import { wardConfig } from "@/config/ward.config";

/** Trung tâm Xã Ngọc Tố, Huyện Mỹ Xuyên, Cần Thơ */
export const WARD_DEFAULT_CENTER = wardConfig.center;

/** Giới hạn pan — ĐBSCL / Cần Thơ (tránh kéo ra nước ngoài) */
export const CAN_THO_BOUNDS: [[number, number], [number, number]] = [
  [105.45, 9.35],
  [106.15, 10.45],
];

export interface MapCenter {
  lat: number;
  lng: number;
}

/** Chuẩn hóa tọa độ — sửa lat/lng bị đảo hoặc nằm ngoài VN */
export function normalizeMapCenter(center: MapCenter): MapCenter {
  let lat = Number(center.lat);
  let lng = Number(center.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return WARD_DEFAULT_CENTER;
  }

  // Lat/lng bị đảo (lat > 90)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
  }

  // Ngoài phạm vi Việt Nam → fallback Ngọc Tố
  if (lng < 102 || lng > 110 || lat < 8 || lat > 24) {
    return WARD_DEFAULT_CENTER;
  }

  return { lat, lng };
}

export function toMapLibreCenter(center: MapCenter): [number, number] {
  const { lat, lng } = normalizeMapCenter(center);
  return [lng, lat];
}
