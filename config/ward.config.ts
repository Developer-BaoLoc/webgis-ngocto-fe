export const wardConfig = {
  id: "ngoc-to",
  name: "Ngọc Tố",
  locationLabel: "Xã Ngọc Tố",
  district: "Huyện Mỹ Xuyên",
  city: "Thành phố Cần Thơ",
  cityShort: "TP. Cần Thơ",
  country: "Việt Nam",
  /** Fallback — ưu tiên lấy từ GET /api/layers → project.center */
  center: { lat: 9.4466, lng: 105.9342 },
  defaultZoom: 15,
} as const;
