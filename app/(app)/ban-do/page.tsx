import { PageHeader } from "@/components/layout/page-header";
import { MapPageContent } from "@/components/map/map-page-content";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bản đồ"
        description="Bản đồ GIS phường Long Bình — center và zoom từ GET /api/layers"
      />
      <MapPageContent />
    </div>
  );
}
