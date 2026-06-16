/** GeoJSON types tối giản cho dự án */
export type Coordinate = [number, number];
export type Coordinate3D = [number, number, number];

export type GeoJsonGeometryType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon";

export interface GeoJsonGeometry {
  type: GeoJsonGeometryType;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJsonFeature<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> {
  type: "Feature";
  id?: string | number;
  geometry: GeoJsonGeometry;
  properties: TProperties;
}

export interface GeoJsonFeatureCollection<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> {
  type: "FeatureCollection";
  features: GeoJsonFeature<TProperties>[];
}

export interface MapViewport {
  center: Coordinate;
  zoom: number;
}
