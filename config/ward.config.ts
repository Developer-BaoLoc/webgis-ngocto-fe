export const wardConfig = {
  id: "long-binh",
  name: "Demo Phường Xã",
  locationLabel: "Demo Phường Xã",
  district: "Quận Cái Răng",
  city: "Thành phố Cần Thơ",
  cityShort: "TP. Cần Thơ",
  country: "Việt Nam",
  /** Fallback — ưu tiên lấy từ GET /api/layers → project.center */
  center: { lat: 10.3489, lng: 105.8342 },
  defaultZoom: 15,
} as const;
