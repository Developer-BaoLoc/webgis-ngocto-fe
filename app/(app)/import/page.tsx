import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export default function ImportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Import dữ liệu"
        description="Upload Excel → preview → execute (Phase 1–2)"
      />
      <ComingSoon
        title="Import wizard"
        description="Sẽ tích hợp POST /api/imports/upload khi backend Phase 1 sẵn sàng."
        backHref="/"
        backLabel="Về tổng quan"
      />
    </div>
  );
}
