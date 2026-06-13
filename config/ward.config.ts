export const wardConfig = {
  id: "long-binh",
  name: "Phường Long Bình",
  district: "Quận Cái Răng",
  city: "Thành phố Cần Thơ",
  country: "Việt Nam",
  /** Fallback — ưu tiên lấy từ GET /api/layers → project.center */
  center: { lat: 10.0125, lng: 105.785 },
  defaultZoom: 14,
} as const;
