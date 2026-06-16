import {
  getAdministrativeBoundary,
  resolveMapView,
} from "@/lib/api/map-view";
import { AgriIocDashboard } from "@/components/dashboard/ioc/agri-ioc-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <AgriIocDashboard
        mapView={mapView}
        boundary={boundary}
        boundaryError={boundaryError}
      />
    </div>
  );
}
