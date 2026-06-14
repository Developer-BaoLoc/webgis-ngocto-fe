import { wardConfig } from "@/config/ward.config";

/** Trung tâm Phường Long Bình, Quận Cái Răng, Cần Thơ */
export const LONG_BINH_CENTER = wardConfig.center;

/** Giới hạn pan — ĐBSCL / Cần Thơ (tránh kéo ra nước ngoài) */
export const CAN_THO_BOUNDS: [[number, number], [number, number]] = [
  [105.45, 9.85],
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
    return LONG_BINH_CENTER;
  }

  // Lat/lng bị đảo (lat > 90)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
  }

  // Ngoài phạm vi Việt Nam → fallback Long Bình
  if (lng < 102 || lng > 110 || lat < 8 || lat > 24) {
    return LONG_BINH_CENTER;
  }

  return { lat, lng };
}

export function toMapLibreCenter(center: MapCenter): [number, number] {
  const { lat, lng } = normalizeMapCenter(center);
  return [lng, lat];
}
