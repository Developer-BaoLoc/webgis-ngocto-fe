"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { AdminListPanel } from "@/components/ui/admin-list-panel";
import { inputClass } from "@/components/form/field-wrapper";
import { createDashboard, getDashboards } from "@/lib/api/dashboards";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionLink,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";
import type { DashboardListItem } from "@/types/api/dashboard";
import { useMessage } from "@/providers/message-provider";
import { logAuditAction } from "@/lib/audit/audit-log";

const SCOPE_LABELS: Record<string, string> = {
  private: "Riêng tư",
  organization: "Tổ chức",
  public: "Công khai",
};

export function DashboardAdminPage() {
  const router = useRouter();
  const message = useMessage();
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDashboards(await getDashboards());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createDashboard({
        name,
        description: description || null,
        scope: "private",
      });
      setShowCreate(false);
      setName("");
      setDescription("");
      logAuditAction({ action: "dashboard.create", objectType: "dashboard", objectName: created.name, metadata: { dashboardId: created.id } });
      message.success(`Đã tạo dashboard “${created.name}”.`);
      router.push(`/quan-tri/dashboard/${created.id}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Tạo dashboard thất bại";
      setError(detail);
      message.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển"
        backHref="/quan-tri"
        backLabel="Quản trị"
        action={
          <div className="flex gap-2">
            <Link
              href="/quan-tri/saved-views"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary"
            >
              Saved Views
            </Link>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              + Tạo dashboard
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <AdminListPanel
        title="Danh sách bảng điều khiển"
        description="Thiết kế tiện ích và xuất bản tại đường dẫn bảng điều khiển riêng."
        isLoading={isLoading}
        isEmpty={!isLoading && dashboards.length === 0}
        emptyTitle="Chưa có dashboard"
        emptyDescription="Tạo dashboard đầu tiên để tổng hợp số liệu từ các lớp dữ liệu."
        emptyAction={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo dashboard
          </button>
        }
      >
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Tên</DataTableHeaderCell>
              <DataTableHeaderCell>Phạm vi</DataTableHeaderCell>
              <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Thao tác</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {dashboards.map((dashboard) => (
              <DataTableRow key={dashboard.id}>
                <DataTableCell variant="primary">
                  {dashboard.name}
                </DataTableCell>
                <DataTableCell>
                  <TableBadge variant="muted">
                    {SCOPE_LABELS[dashboard.scope] ?? dashboard.scope}
                  </TableBadge>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.hasPublished ? (
                      <TableBadge variant="success">Đã xuất bản</TableBadge>
                    ) : (
                      <TableBadge variant="warning">Bản nháp</TableBadge>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell variant="actions" align="right">
                  <TableActions>
                    <TableActionLink
                      href={`/quan-tri/dashboard/${dashboard.id}`}
                    >
                      Thiết kế
                    </TableActionLink>
                    <TableActionLink
                      href={`/dashboards/${dashboard.id}`}
                      variant="neutral"
                    >
                      Xem
                    </TableActionLink>
                  </TableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </AdminListPanel>

      {showCreate && (
        <Modal title="Tạo bảng điều khiển" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Tên dashboard</label>
              <input
                className={inputClass}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tổng quan HTX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Mô tả</label>
              <textarea
                className={inputClass}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Đang tạo..." : "Tạo và thiết kế"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
