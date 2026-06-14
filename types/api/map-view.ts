export interface MapViewCenter {
  lat: number;
  lng: number;
}

/** [[west, south], [east, north]] — WGS84 (MapLibre) */
export type MapViewBounds = [[number, number], [number, number]];

/** BE gửi [west, south, east, north] (GeoJSON bbox) */
export type MapViewBoundsInput = MapViewBounds | [number, number, number, number];

export interface MapViewConfig {
  center: MapViewCenter;
  zoom: number;
  /** Vùng fit khi mở bản đồ (zoom tới phường) */
  bounds?: MapViewBounds;
  /** Giới hạn kéo bản đồ — rộng hơn bounds */
  panBounds?: MapViewBounds;
  minZoom?: number;
  maxZoom?: number;
}

/** API mapView có thể dùng defaultZoom thay vì zoom */
export interface MapViewConfigInput
  extends Omit<Partial<MapViewConfig>, "bounds" | "panBounds"> {
  defaultZoom?: number;
  bounds?: MapViewBoundsInput;
  panBounds?: MapViewBoundsInput;
}
