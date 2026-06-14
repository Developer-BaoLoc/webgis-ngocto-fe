import { SchemaDesigner } from "@/components/admin/schema-designer";

interface SchemaPageProps {
  params: Promise<{ id: string }>;
}

export default async function SchemaPage({ params }: SchemaPageProps) {
  const { id } = await params;
  return <SchemaDesigner layerId={id} />;
}
