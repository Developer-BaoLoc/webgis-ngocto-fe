import { LayerDetailView } from "@/components/layers/layer-detail-view";

interface LayerDetailPageProps {
  params: Promise<{ code: string }>;
}

export default async function LayerDetailPage({ params }: LayerDetailPageProps) {
  const { code } = await params;
  return <LayerDetailView key={code} code={code} />;
}
