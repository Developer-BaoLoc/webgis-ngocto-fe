"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { previewAnalytics } from "@/lib/api/analytics";
import {
  createDashboardDraftFromPublished,
  getDashboardDataSources,
  getDashboardDraft,
  getPublishedDashboard,
  publishDashboard,
  updateDashboardDraft,
} from "@/lib/api/dashboards";
import { DynamicDashboardView } from "@/components/dashboard/dynamic-dashboard-view";
import {
  WIDGET_TYPE_LABELS,
  sortWidgets,
} from "@/lib/dashboard/utils";
import {
  WidgetFormFields,
  emptyWidgetForm,
  formToWidget,
  widgetToForm,
  type WidgetFormState,
} from "@/components/admin/dashboard-widget-form";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";
import { isGroupedAnalyticsResult } from "@/types/api/dashboard";
import type { DashboardDetail, DataSourceLayer } from "@/types/api/dashboard";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";

interface DashboardBuilderPageProps {
  dashboardId: string;
}

async function resolveDraft(dashboardId: string): Promise<DashboardDetail> {
  try {
    return await getDashboardDraft(dashboardId);
  } catch {
    try {
      await getPublishedDashboard(dashboardId);
      return await createDashboardDraftFromPublished(dashboardId);
    } catch {
      return getDashboardDraft(dashboardId);
    }
  }
}

export function DashboardBuilderPage({ dashboardId }: DashboardBuilderPageProps) {
  const [draft, setDraft] = useState<DashboardDetail | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceLayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [widgetForm, setWidgetForm] = useState<WidgetFormState>(emptyWidgetForm());
  const [previewText, setPreviewText] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [draftData, sources] = await Promise.all([
        resolveDraft(dashboardId),
        getDashboardDataSources().catch(() => []),
      ]);
      setDraft({
        ...draftData,
        widgets: sortWidgets(draftData.widgets),
      });
      setDataSources(sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDraft(nextDraft: Partial<DashboardDetail>) {
    if (!draft) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateDashboardDraft(dashboardId, {
        name: nextDraft.name ?? draft.name,
        description: nextDraft.description ?? draft.description,
        widgets: sortWidgets(nextDraft.widgets ?? draft.widgets),
        layoutConfig: nextDraft.layoutConfig ?? draft.layoutConfig,
      });
      setDraft({
        ...updated,
        widgets: sortWidgets(updated.widgets),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAddWidget() {
    setEditingIndex(null);
    setWidgetForm(emptyWidgetForm());
    setPreviewText(null);
    setShowWidgetModal(true);
  }

  function openEditWidget(index: number) {
    if (!draft) return;
    setEditingIndex(index);
    setWidgetForm(widgetToForm(draft.widgets[index]));
    setPreviewText(null);
    setShowWidgetModal(true);
  }

  function closeWidgetModal() {
    setShowWidgetModal(false);
    setEditingIndex(null);
    setWidgetForm(emptyWidgetForm());
    setPreviewText(null);
  }

  async function handleSaveWidget(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    const widget = formToWidget(
      widgetForm,
      editingIndex ?? draft.widgets.length,
      editingIndex !== null ? draft.widgets[editingIndex]?.id : undefined,
    );

    const widgets = [...draft.widgets];
    if (editingIndex !== null) {
      widgets[editingIndex] = widget;
    } else {
      widgets.push(widget);
    }

    await saveDraft({ widgets });
    closeWidgetModal();
  }

  async function handleDeleteWidget(index: number) {
    if (!draft || !confirm("Xóa widget này?")) return;
    const widgets = draft.widgets.filter((_, i) => i !== index);
    await saveDraft({ widgets });
  }

  function moveWidget(index: number, direction: "up" | "down") {
    if (!draft) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= draft.widgets.length) return;
    const widgets = [...draft.widgets];
    [widgets[index], widgets[target]] = [widgets[target], widgets[index]];
    void saveDraft({ widgets });
  }

  async function handlePreviewWidget() {
    const widget = formToWidget(widgetForm, 0);
    if (!widget.dataSourceConfig?.layerId) {
      setPreviewText("Chọn lớp dữ liệu để xem trước");
      return;
    }
    try {
      const result = await previewAnalytics({
        dataSourceConfig: widget.dataSourceConfig,
      });
      if (isGroupedAnalyticsResult(result)) {
        setPreviewText(
          result.rows
            .slice(0, 5)
            .map((row) => `${row.label}: ${formatAnalyticsNumber(row.value)}`)
            .join(" · "),
        );
      } else {
        setPreviewText(formatAnalyticsNumber(result.value));
      }
    } catch (err) {
      setPreviewText(err instanceof Error ? err.message : "Preview thất bại");
    }
  }

  async function handlePublish() {
    if (
      !draft ||
      !confirm("Xuất bản dashboard? Trang Tổng quan sẽ dùng bản mới.")
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      await publishDashboard(dashboardId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất bản thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  const widgets = draft?.widgets ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={draft ? `Thiết kế: ${draft.name}` : "Thiết kế dashboard"}
        description={
          draft
            ? `Bản nháp v${draft.version ?? 1} · ${draft.widgets.length} widget`
            : "Đang tải..."
        }
        backHref="/quan-tri/dashboard"
        backLabel="Dashboard"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Đang tải...</p>
      ) : draft ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Widget</h2>
                <p className="text-sm text-muted">
                  Thêm widget thống kê, biểu đồ hoặc bảng từ dữ liệu lớp
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openAddWidget}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  + Thêm widget
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || draft.widgets.length === 0}
                  onClick={() => void handlePublish()}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Xuất bản
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {draft.widgets.length === 0 ? (
                <p className="text-sm text-muted">
                  Chưa có widget. Thêm ít nhất 1 widget trước khi xuất bản.
                </p>
              ) : (
                <DataTable minWidth="640px">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="w-14">#</DataTableHeaderCell>
                      <DataTableHeaderCell>Tiêu đề</DataTableHeaderCell>
                      <DataTableHeaderCell>Kiểu</DataTableHeaderCell>
                      <DataTableHeaderCell>Kích thước</DataTableHeaderCell>
                      <DataTableHeaderCell align="right">Thao tác</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {widgets.map((widget, index) => (
                      <DataTableRow key={widget.id ?? `${widget.title}-${index}`}>
                        <DataTableCell variant="index">{index + 1}</DataTableCell>
                        <DataTableCell variant="primary">{widget.title}</DataTableCell>
                        <DataTableCell>
                          <TableBadge variant="default">
                            {WIDGET_TYPE_LABELS[widget.widgetType] ??
                              widget.widgetType}
                          </TableBadge>
                        </DataTableCell>
                        <DataTableCell variant="muted">
                          {widget.layoutConfig.w}×{widget.layoutConfig.h}
                        </DataTableCell>
                        <DataTableCell variant="actions" align="right">
                          <TableActions>
                            <TableActionButton
                              variant="neutral"
                              disabled={index === 0 || isSubmitting}
                              onClick={() => moveWidget(index, "up")}
                            >
                              ↑
                            </TableActionButton>
                            <TableActionButton
                              variant="neutral"
                              disabled={
                                index === widgets.length - 1 || isSubmitting
                              }
                              onClick={() => moveWidget(index, "down")}
                            >
                              ↓
                            </TableActionButton>
                            <TableActionButton
                              variant="primary"
                              onClick={() => openEditWidget(index)}
                            >
                              Sửa
                            </TableActionButton>
                            <TableActionButton
                              variant="danger"
                              onClick={() => void handleDeleteWidget(index)}
                            >
                              Xóa
                            </TableActionButton>
                          </TableActions>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Xem trước bản nháp</h2>
            </CardHeader>
            <CardContent>
              <DynamicDashboardView dashboard={draft} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {showWidgetModal && (
        <Modal
          title={editingIndex !== null ? "Sửa widget" : "Thêm widget"}
          onClose={closeWidgetModal}
        >
          <form onSubmit={handleSaveWidget} className="space-y-4">
            <WidgetFormFields
              form={widgetForm}
              dataSources={dataSources}
              onChange={setWidgetForm}
            />

            {widgetForm.widgetType !== "text" &&
              widgetForm.widgetType !== "map" && (
              <button
                type="button"
                onClick={() => void handlePreviewWidget()}
                className="text-sm text-primary hover:underline"
              >
                Xem trước dữ liệu
              </button>
            )}

            {previewText && (
              <p className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
                {previewText}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu widget"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
