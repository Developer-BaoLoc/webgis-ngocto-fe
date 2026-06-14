"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { AdminSubNav } from "@/components/admin/admin-sub-nav";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { inputClass } from "@/components/form/field-wrapper";
import { createDashboard, getDashboards } from "@/lib/api/dashboards";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActionLink,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";
import type { DashboardListItem } from "@/types/api/dashboard";

const SCOPE_LABELS: Record<string, string> = {
  private: "Riêng tư",
  organization: "Tổ chức",
  public: "Công khai",
};

export function DashboardAdminPage() {
  const router = useRouter();
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
    void load();
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
      router.push(`/quan-tri/dashboard/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo dashboard thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminSubNav />

      <PageHeader
        title="Dashboard"
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo dashboard
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : dashboards.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có dashboard nào. Tạo dashboard đầu tiên để hiển thị trên
              trang Tổng quan.
            </p>
          ) : (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Tên</DataTableHeaderCell>
                  <DataTableHeaderCell>Phạm vi</DataTableHeaderCell>
                  <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">
                    Thao tác
                  </DataTableHeaderCell>
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
                        {dashboard.hasPublished !== false && (
                          <TableBadge variant="success">Đã xuất bản</TableBadge>
                        )}
                        {dashboard.hasDraft && (
                          <TableBadge variant="warning">Có bản nháp</TableBadge>
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
                        <TableActionLink href="/" variant="neutral">
                          Xem
                        </TableActionLink>
                      </TableActions>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <Modal title="Tạo dashboard" onClose={() => setShowCreate(false)}>
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
