import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/layout/page-header";
import { LayerBadge } from "@/components/ui/badge";
import { getLayerByCode } from "@/lib/api/layers";
import { layerStatusLabels } from "@/types/layer.types";

interface LayerDetailPageProps {
  params: Promise<{ code: string }>;
}

export default async function LayerDetailPage({ params }: LayerDetailPageProps) {
  const { code } = await params;
  const layer = await getLayerByCode(code).catch(() => null);

  if (!layer) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={layer.name}
        description={layer.description}
        action={
          <div className="flex flex-wrap gap-2">
            <LayerBadge
              label={layerStatusLabels[layer.status]}
              status={layer.status}
            />
            <LayerBadge label={layer.geometryType} color={layer.color} />
          </div>
        }
      />
      <ComingSoon
        title={`Lớp "${layer.name}"`}
        description={`Code: ${layer.code} · Endpoint: ${layer.endpoint}. Bảng động và schema sẽ có ở Phase 1.`}
        backHref="/lop-du-lieu"
        backLabel="Quay lại danh sách lớp"
      />
    </div>
  );
}
