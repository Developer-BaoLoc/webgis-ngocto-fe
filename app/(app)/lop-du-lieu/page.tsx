import { LayerList } from "@/components/layers/layer-list";
import { PageHeader } from "@/components/layout/page-header";

export default function LayersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Lớp dữ liệu"
        description="Xem và quản lý bản ghi theo từng lớp GIS — điểm, đường hoặc vùng trên bản đồ phường."
      />
      <LayerList />
    </div>
  );
}
