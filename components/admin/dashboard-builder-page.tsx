"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { previewAnalytics } from "@/lib/api/analytics";
import { advancedQueryToDataSourceConfig } from "@/lib/dashboard/advanced-query";
import { getSavedViews } from "@/lib/api/saved-views";
import { getDatasets } from "@/lib/api/datasets";
import {
  createDashboardDraftFromPublished,
  getDashboardDataSources,
  getDashboardDraft,
  getPublishedDashboard,
  publishDashboard,
  updateDashboardDraft,
} from "@/lib/api/dashboards";
import { sortWidgets } from "@/lib/dashboard/utils";
import {
  DashboardGridEditor,
  type DashboardGridItemLayout,
} from "@/components/admin/dashboard-grid-editor";
import { dashboardWidgetGridId } from "@/lib/dashboard/responsive-grid";
import {
  ensureDashboardWidgetLayouts,
  placeWidgetInNextSlot,
  widgetLayoutsChanged,
} from "@/lib/dashboard/grid-layout";
import {
  WidgetFormFields,
  emptyWidgetForm,
  formToWidget,
  validateSpatialWidgetForm,
  widgetToForm,
  type WidgetFormState,
} from "@/components/admin/dashboard-widget-form";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  isTopAnalyticsResult,
} from "@/types/api/dashboard";
import type {
  DashboardDetail,
  DashboardWidget,
  AnalyticsResult,
  DataSourceLayer,
} from "@/types/api/dashboard";
import type { SavedView } from "@/types/api/saved-view";
import type { Dataset } from "@/types/api/dataset";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";
import { getFieldLabel, getOptionLabel } from "@/lib/fields/field-label";

interface DashboardBuilderPageProps {
  dashboardId: string;
}

function spatialResultIsEmpty(result: AnalyticsResult) {
  if (isTopAnalyticsResult(result) || isRecordsAnalyticsResult(result)) {
    return (
      result.records.length === 0 ||
      result.records.every((record) => Number(record.value ?? 0) <= 0)
    );
  }
  if (isGroupedAnalyticsResult(result)) {
    return (
      result.rows.length === 0 ||
      result.rows.every((row) => Number(row.value ?? 0) <= 0)
    );
  }
  return false;
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

export function DashboardBuilderPage({
  dashboardId,
}: DashboardBuilderPageProps) {
  const [draft, setDraft] = useState<DashboardDetail | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceLayer[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [widgetForm, setWidgetForm] =
    useState<WidgetFormState>(emptyWidgetForm());
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isPreviewingWidget, setIsPreviewingWidget] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [draftData, sources, views, datasetRows] = await Promise.all([
        resolveDraft(dashboardId),
        getDashboardDataSources().catch(() => []),
        getSavedViews().catch(() => []),
        getDatasets().catch(() => []),
      ]);
      const normalizedWidgets = ensureDashboardWidgetLayouts(draftData.widgets);
      setDraft({
        ...draftData,
        widgets: sortWidgets(normalizedWidgets),
      });
      setDataSources(sources);
      setSavedViews(views);
      setDatasets(datasetRows);
      setLayoutDirty(
        widgetLayoutsChanged(draftData.widgets, normalizedWidgets),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side API load
    void load();
  }, [load]);

  async function saveDraft(nextDraft: Partial<DashboardDetail>) {
    if (!draft) return false;
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
      return false;
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

  function fieldLabelsForWidget(widget: DashboardWidget) {
    const dataset = datasets.find(
      (item) => item.id === widget.dataSourceConfig?.datasetId,
    );
    const view = savedViews.find(
      (item) => item.id === widget.dataSourceConfig?.viewId,
    );
    const layerId = view?.layerId ?? widget.dataSourceConfig?.layerId;
    const fields = dataset
      ? dataset.config.fields.map((field) => ({
          code: field.key,
          label: getFieldLabel(field.key, { label: field.label }),
        }))
      : (dataSources.find((source) => source.layerId === layerId)?.fields ??
        []);
    return Object.fromEntries(
      fields.map((field) => [field.code, getFieldLabel(field.code, field)]),
    );
  }

  function openEditWidget(index: number) {
    if (!draft) return;
    const widget = draft.widgets[index];
    const initialForm = widgetToForm(widget);
    setEditingIndex(index);
    setWidgetForm({
      ...initialForm,
      fieldLabels: {
        ...initialForm.fieldLabels,
        ...fieldLabelsForWidget(widget),
      },
    });
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

    let widget = formToWidget(
      widgetForm,
      editingIndex ?? draft.widgets.length,
      editingIndex !== null ? draft.widgets[editingIndex]?.id : undefined,
    );

    const widgets = [...draft.widgets];
    if (editingIndex !== null) {
      widgets[editingIndex] = widget;
    } else {
      widget = placeWidgetInNextSlot(widget, widgets);
      widgets.push(widget);
    }

    if (await saveDraft({ widgets })) {
      setLayoutDirty(false);
      closeWidgetModal();
    }
  }

  async function handleDeleteWidget(index: number) {
    if (!draft || !confirm("Xóa widget này?")) return;
    const widgets = draft.widgets.filter((_, i) => i !== index);
    if (await saveDraft({ widgets })) setLayoutDirty(false);
  }

  function handleGridLayoutChange(layout: DashboardGridItemLayout[]) {
    setDraft((current) => {
      if (!current) return current;
      const byId = new Map(layout.map((item) => [item.id, item]));
      return {
        ...current,
        widgets: current.widgets.map((widget, index) => {
          const next = byId.get(dashboardWidgetGridId(widget, index));
          if (!next) return widget;
          return {
            ...widget,
            layoutConfig: {
              ...widget.layoutConfig,
              x: next.x,
              y: next.y,
              w: next.w,
              h: next.h,
            },
          };
        }),
      };
    });
    setLayoutDirty(true);
  }

  async function handleSaveLayout() {
    if (!draft || !layoutDirty) return;
    if (await saveDraft({ widgets: draft.widgets })) setLayoutDirty(false);
  }

  async function handlePreviewWidget() {
    if (isPreviewingWidget) return;
    const spatialValidationError = validateSpatialWidgetForm(
      widgetForm,
      dataSources,
    );
    if (spatialValidationError) {
      setPreviewText(spatialValidationError);
      return;
    }
    const widget = formToWidget(widgetForm, 0);
    const dataSourceConfig = widget.dataSourceConfig
      ? advancedQueryToDataSourceConfig(widget.dataSourceConfig)
      : undefined;
    if (
      !dataSourceConfig?.datasetId &&
      !dataSourceConfig?.viewId &&
      !dataSourceConfig?.layerId
    ) {
      setPreviewText("Chọn nguồn dữ liệu để xem trước");
      return;
    }
    setIsPreviewingWidget(true);
    try {
      const result = await previewAnalytics({
        dataSourceConfig,
      });
      if (dataSourceConfig?.spatial && spatialResultIsEmpty(result)) {
        setPreviewText("Chưa có dữ liệu không gian phù hợp.");
        return;
      }
      if (isTopAnalyticsResult(result)) {
        setPreviewText(`${result.records.length} dòng xếp hạng`);
      } else if (isRecordsAnalyticsResult(result)) {
        setPreviewText(`${result.records.length} bản ghi nghiệp vụ`);
      } else if (isGroupedAnalyticsResult(result)) {
        setPreviewText(
          result.rows
            .slice(0, 5)
            .map(
              (row) =>
                `${
                  row.label && row.label !== row.rawLabel
                    ? row.label
                    : getOptionLabel(
                        widget.dataSourceConfig?.dimensionField ??
                          widget.dataSourceConfig?.groupByFieldCode ??
                          "",
                        row.rawLabel || row.label,
                      )
                }: ${formatAnalyticsNumber(row.value)}`,
            )
            .join(" · "),
        );
      } else {
        setPreviewText(formatAnalyticsNumber(result.value));
      }
    } catch (err) {
      setPreviewText(err instanceof Error ? err.message : "Preview thất bại");
    } finally {
      setIsPreviewingWidget(false);
    }
  }

  async function handlePublish() {
    if (
      !draft ||
      !confirm("Xuất bản dashboard? Route /dashboards/:id sẽ dùng bản mới.")
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (layoutDirty) {
        const saved = await saveDraft({ widgets: draft.widgets });
        if (!saved) return;
        setLayoutDirty(false);
      }
      await publishDashboard(dashboardId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất bản thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

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
                <h2 className="text-lg font-semibold">Bố cục widget</h2>
                <p className="text-sm text-muted">
                  Kéo thanh tiêu đề để đổi vị trí, kéo góc phải dưới để thay đổi
                  kích thước.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || !layoutDirty}
                  onClick={() => void handleSaveLayout()}
                  className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu bố cục"}
                </button>
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
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>Desktop 12 cột · Tablet 8 cột · Mobile 4 cột</span>
                    <span
                      className={
                        layoutDirty
                          ? "font-medium text-amber-700"
                          : "text-emerald-700"
                      }
                    >
                      {layoutDirty ? "Bố cục chưa lưu" : "Bố cục đã lưu"}
                    </span>
                  </div>
                  <DashboardGridEditor
                    widgets={draft.widgets}
                    disabled={isSubmitting}
                    onLayoutChange={handleGridLayoutChange}
                    onEdit={openEditWidget}
                    onDelete={(index) => void handleDeleteWidget(index)}
                  />
                </>
              )}
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
              savedViews={savedViews}
              datasets={datasets}
              onChange={setWidgetForm}
            />

            {widgetForm.widgetType !== "text" &&
              widgetForm.widgetType !== "map" && (
                <button
                  type="button"
                  disabled={isPreviewingWidget}
                  onClick={() => void handlePreviewWidget()}
                  className="ioc-preview-button"
                  data-loading={isPreviewingWidget ? "true" : undefined}
                >
                  {isPreviewingWidget ? "Đang xem trước..." : "Xem trước dữ liệu"}
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
