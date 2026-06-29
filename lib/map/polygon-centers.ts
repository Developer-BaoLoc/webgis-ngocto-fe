import type {
  Coordinate,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from "@/types/gis.types";

const centerCache = new WeakMap<object, Coordinate | null>();

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

function ringCentroid(ring: number[][]): Coordinate | null {
  let crossSum = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    const cross = current[0] * next[1] - next[0] * current[1];
    crossSum += cross;
    x += (current[0] + next[0]) * cross;
    y += (current[1] + next[1]) * cross;
  }
  if (Math.abs(crossSum) < Number.EPSILON) return null;
  return [x / (3 * crossSum), y / (3 * crossSum)];
}

function pointOnSegment(point: Coordinate, start: number[], end: number[]) {
  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > 1e-10) return false;
  return (
    point[0] >= Math.min(start[0], end[0]) - 1e-10 &&
    point[0] <= Math.max(start[0], end[0]) + 1e-10 &&
    point[1] >= Math.min(start[1], end[1]) - 1e-10 &&
    point[1] <= Math.max(start[1], end[1]) + 1e-10
  );
}

function pointInRing(point: Coordinate, ring: number[][]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (pointOnSegment(point, previousPoint, currentPoint)) return true;
    const crosses =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) *
          (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Coordinate, polygon: number[][][]): boolean {
  if (!polygon[0] || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function polygonCenter(polygon: number[][][]): Coordinate | null {
  const outer = polygon[0];
  if (!outer?.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const coordinate of outer) {
    minX = Math.min(minX, coordinate[0]);
    minY = Math.min(minY, coordinate[1]);
    maxX = Math.max(maxX, coordinate[0]);
    maxY = Math.max(maxY, coordinate[1]);
    sumX += coordinate[0];
    sumY += coordinate[1];
  }

  const bboxCenter: Coordinate = [(minX + maxX) / 2, (minY + maxY) / 2];
  const average: Coordinate = [sumX / outer.length, sumY / outer.length];
  const massCenter = ringCentroid(outer);
  const candidates = [massCenter, bboxCenter, average].filter(
    (candidate): candidate is Coordinate => Boolean(candidate),
  );
  for (const candidate of candidates) {
    if (pointInPolygon(candidate, polygon)) return candidate;
  }

  for (const coordinate of outer) {
    for (const ratio of [0.25, 0.5, 0.75]) {
      const candidate: Coordinate = [
        coordinate[0] + (bboxCenter[0] - coordinate[0]) * ratio,
        coordinate[1] + (bboxCenter[1] - coordinate[1]) * ratio,
      ];
      if (pointInPolygon(candidate, polygon)) return candidate;
    }
  }

  return [outer[0][0], outer[0][1]];
}

function featureCenter(feature: GeoJsonFeature): Coordinate | null {
  if (centerCache.has(feature)) return centerCache.get(feature) ?? null;

  const geometry = feature.geometry;
  let polygons: number[][][][];
  if (geometry.type === "Polygon") {
    polygons = [geometry.coordinates as number[][][]];
  } else if (geometry.type === "MultiPolygon") {
    polygons = geometry.coordinates as number[][][][];
  } else {
    centerCache.set(feature, null);
    return null;
  }

  const largest = polygons.reduce<number[][][] | null>((selected, polygon) => {
    if (!selected) return polygon;
    return Math.abs(ringArea(polygon[0] ?? [])) >
      Math.abs(ringArea(selected[0] ?? []))
      ? polygon
      : selected;
  }, null);
  const center = largest ? polygonCenter(largest) : null;
  centerCache.set(feature, center);
  return center;
}

export function withPolygonCenterFeatures(
  collection: GeoJsonFeatureCollection,
  enabled: boolean,
): GeoJsonFeatureCollection {
  if (!enabled) return collection;
  const centers: GeoJsonFeature[] = [];
  for (const feature of collection.features) {
    const center = featureCenter(feature);
    if (!center) continue;
    centers.push({
      type: "Feature",
      id: feature.id === undefined ? undefined : `${feature.id}-center`,
      geometry: { type: "Point", coordinates: center },
      properties: {
        ...feature.properties,
        __onegisPolygonCenter: true,
      },
    });
  }
  return {
    ...collection,
    features: [...collection.features, ...centers],
  };
}
