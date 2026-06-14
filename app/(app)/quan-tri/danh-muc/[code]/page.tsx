import { DictionaryDetailPage } from "@/components/admin/dictionary-detail-page";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function AdminDictionaryDetailPage({ params }: PageProps) {
  const { code } = await params;
  return <DictionaryDetailPage code={code} />;
}
