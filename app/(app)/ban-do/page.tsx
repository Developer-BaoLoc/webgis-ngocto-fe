import { MapPageContent } from "@/components/map/map-page-content";
import {
  getAdministrativeBoundary,
  resolveMapView,
} from "@/lib/api/map-view";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [mapViewResult, boundaryResult] = await Promise.allSettled([
    resolveMapView(),
    getAdministrativeBoundary(),
  ]);

  const mapView =
    mapViewResult.status === "fulfilled" ? mapViewResult.value : null;
  const boundary =
    boundaryResult.status === "fulfilled" ? boundaryResult.value : null;
  const boundaryError =
    boundaryResult.status === "rejected"
      ? boundaryResult.reason instanceof Error
        ? boundaryResult.reason.message
        : "Không tải được ranh giới phường"
      : null;

  return (
    <MapPageContent
      mapView={mapView}
      boundary={boundary}
      boundaryError={boundaryError}
      fullscreen
    />
  );
}
