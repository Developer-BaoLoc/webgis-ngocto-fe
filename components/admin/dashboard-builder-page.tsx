"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { previewAnalytics } from "@/lib/api/analytics";
import { advancedQueryToDataSourceConfig } from "@/lib/dashboard/advanced-query";
import {
  isVirtualDatasetId,
  previewVirtualDatasetAnalytics,
  setVirtualDataset,
  virtualDatasetSnapshotToDataset,
} from "@/lib/dashboard/virtual-datasets";
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
import { DashboardAiAssistant } from "@/components/admin/dashboard-ai-assistant";
import { DashboardTemplateWizard } from "@/components/admin/dashboard-template-wizard";
import { DashboardTemplateManager } from "@/components/admin/dashboard-template-manager";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
  dashboardTemplates,
  type DashboardTemplate,
  type DashboardTemplatePlaceholderValues,
} from "@/lib/dashboard/templates";
import { loadCustomDashboardTemplates } from "@/lib/dashboard/templates/custom-templates";
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
  DataSourceConfig,
} from "@/types/api/dashboard";
import type { SavedView } from "@/types/api/saved-view";
import type { Dataset } from "@/types/api/dataset";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";
import { getFieldLabel, getOptionLabel } from "@/lib/fields/field-label";
import { useMessage } from "@/providers/message-provider";
import { pushUndoAction, undoLastAction } from "@/lib/undo/undo-manager";
import { logAuditAction } from "@/lib/audit/audit-log";

interface DashboardBuilderPageProps {
  dashboardId: string;
}

function mergeById<T extends { id: string }>(current: T[], incoming?: T[]) {
  if (!incoming?.length) return current;
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
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
  const message = useMessage();
  const [draft, setDraft] = useState<DashboardDetail | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceLayer[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [virtualDatasets, setVirtualDatasets] = useState<Dataset[]>([]);
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
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiGeneratedTemplate, setAiGeneratedTemplate] =
    useState<DashboardTemplate | null>(null);
  const [templateWizardInitialCode, setTemplateWizardInitialCode] =
    useState<string | undefined>(undefined);
  const [templateWizardInitialValues, setTemplateWizardInitialValues] =
    useState<DashboardTemplatePlaceholderValues>({});
  const [templateManagerInitialTab, setTemplateManagerInitialTab] =
    useState<"save" | "export" | "import" | "custom">("save");
  const [customTemplates, setCustomTemplates] = useState<DashboardTemplate[]>([]);

  function restoreVirtualDatasetsFromWidgets(widgets: DashboardWidget[]) {
    const restored = widgets
      .map((widget) => widget.dataSourceConfig?.virtualDataset)
      .filter(
        (dataset): dataset is NonNullable<DataSourceConfig["virtualDataset"]> =>
          Boolean(dataset),
      )
      .map((snapshot) => {
        const dataset = virtualDatasetSnapshotToDataset(snapshot);
        if (dataset.virtualDataset) setVirtualDataset(dataset.virtualDataset);
        return dataset;
      });
    setVirtualDatasets((current) => mergeById(current, restored));
  }

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
      restoreVirtualDatasetsFromWidgets(normalizedWidgets);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-local custom templates
    setCustomTemplates(loadCustomDashboardTemplates());
  }, []);

  function openTemplateManager(tab: "save" | "export" | "import" | "custom") {
    setTemplateManagerInitialTab(tab);
    setShowTemplateManager(true);
  }

  function handleAiTemplateGenerated(
    template: DashboardTemplate,
    prepared?: {
      savedViews?: SavedView[];
      datasets?: Dataset[];
      templateValues?: DashboardTemplatePlaceholderValues;
    },
  ) {
    logAuditAction({
      action: "dashboard.ai_generate",
      objectType: "dashboard",
      objectName: template.name,
      metadata: { widgets: template.widgets.length },
    });
    if (prepared?.savedViews?.length) {
      setSavedViews((current) => mergeById(current, prepared.savedViews));
    }
    if (prepared?.datasets?.length) {
      const virtual = prepared.datasets.filter((dataset) =>
        isVirtualDatasetId(dataset.id),
      );
      const persistent = prepared.datasets.filter(
        (dataset) => !isVirtualDatasetId(dataset.id),
      );
      if (persistent.length) {
        setDatasets((current) => mergeById(current, persistent));
      }
      if (virtual.length) {
        setVirtualDatasets((current) => mergeById(current, virtual));
      }
    }
    setAiGeneratedTemplate(template);
    setTemplateWizardInitialCode(template.code);
    setTemplateWizardInitialValues(prepared?.templateValues ?? {});
    setShowAiAssistant(false);
    setShowTemplateWizard(true);
  }

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
      logAuditAction({
        action: "dashboard.update",
        objectType: "dashboard",
        objectName: updated.name,
        metadata: { dashboardId, widgets: updated.widgets.length },
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
    const allDatasets = [...datasets, ...virtualDatasets];
    const dataset = allDatasets.find(
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
    if (
      process.env.NODE_ENV === "development" &&
      isVirtualDatasetId(widget.dataSourceConfig?.datasetId) &&
      !widget.dataSourceConfig?.virtualDataset
    ) {
      console.warn("[DashboardWidgetForm] Missing embedded virtualDataset", {
        widgetId: widget.id,
        datasetId: widget.dataSourceConfig?.datasetId,
        dataSourceConfig: widget.dataSourceConfig,
      });
    }
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
      const action = editingIndex !== null ? "widget.update" : "widget.add";
      logAuditAction({ action, objectType: "widget", objectName: widget.title, metadata: { dashboardId } });
      message.success(editingIndex !== null ? "Đã cập nhật widget." : "Đã thêm widget.");
      setLayoutDirty(false);
      closeWidgetModal();
    }
  }

  async function handleDeleteWidget(index: number) {
    if (!draft) return;
    const confirmed = await message.confirm({
      title: "Xóa widget?",
      description: "Tiện ích sẽ bị xóa khỏi bản nháp bảng điều khiển. Bạn có thể hoàn tác ngay sau khi xóa.",
      confirmLabel: "Xóa widget",
      danger: true,
    });
    if (!confirmed) return;
    const previousWidgets = [...draft.widgets];
    const removed = draft.widgets[index];
    const widgets = draft.widgets.filter((_, i) => i !== index);
    if (await saveDraft({ widgets })) {
      setLayoutDirty(false);
      logAuditAction({ action: "widget.remove", objectType: "widget", objectName: removed.title, metadata: { dashboardId } });
      const undoId = pushUndoAction({
        label: `Khôi phục ${removed.title}`,
        undo: async () => {
          if (await saveDraft({ widgets: previousWidgets })) {
            message.success(`Đã khôi phục widget “${removed.title}”.`);
          } else {
            throw new Error("Không khôi phục được widget.");
          }
        },
      });
      message.success(`Đã xóa widget “${removed.title}”.`, {
        duration: 12000,
        actionLabel: "Hoàn tác",
        onAction: async () => {
          try {
            const restored = await undoLastAction(undoId);
            if (!restored) message.warning("Thời gian hoàn tác đã hết.");
          } catch (error) {
            message.error(error instanceof Error ? error.message : "Không hoàn tác được widget.");
          }
        },
      });
    }
  }

  async function handleApplyTemplate(
    templateWidgets: DashboardWidget[],
    mode: "append" | "replace",
  ) {
    if (!draft) return;
    const minTemplateY = Math.min(
      ...templateWidgets.map((widget) => widget.layoutConfig.y),
      0,
    );
    const existingBottom = draft.widgets.reduce(
      (bottom, widget) =>
        Math.max(bottom, widget.layoutConfig.y + widget.layoutConfig.h),
      0,
    );
    const widgets =
      mode === "replace"
        ? templateWidgets
        : [
            ...draft.widgets,
            ...templateWidgets.map((widget) => ({
              ...widget,
              layoutConfig: {
                ...widget.layoutConfig,
                y: widget.layoutConfig.y - minTemplateY + existingBottom,
              },
            })),
          ];

    if (await saveDraft({ widgets })) {
      logAuditAction({ action: "dashboard.update", objectType: "dashboard", objectName: draft.name, metadata: { templateWidgets: templateWidgets.length, mode } });
      message.success(`Đã ${mode === "replace" ? "thay thế" : "thêm"} ${templateWidgets.length} widget từ mẫu.`);
      setLayoutDirty(false);
      setShowTemplateWizard(false);
    }
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
      const result = isVirtualDatasetId(dataSourceConfig.datasetId)
        ? await previewVirtualDatasetAnalytics(dataSourceConfig)
        : await previewAnalytics({
            dataSourceConfig,
          });
      if (!result) {
        setPreviewText("Bộ dữ liệu tạm không còn trong phiên thiết kế.");
        return;
      }
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
      setPreviewText(err instanceof Error ? err.message : "Xem trước thất bại");
    } finally {
      setIsPreviewingWidget(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    const confirmed = await message.confirm({
      title: "Xuất bản dashboard?",
      description: "Bản đang công khai tại /dashboards/:id sẽ được thay bằng draft hiện tại.",
      confirmLabel: "Xuất bản",
    });
    if (!confirmed) return;
    setIsSubmitting(true);
    try {
      if (layoutDirty) {
        const saved = await saveDraft({ widgets: draft.widgets });
        if (!saved) return;
        setLayoutDirty(false);
      }
      await publishDashboard(dashboardId);
      logAuditAction({ action: "dashboard.publish", objectType: "dashboard", objectName: draft.name, metadata: { dashboardId } });
      message.success("Đã xuất bản dashboard.");
      await load();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Xuất bản thất bại";
      setError(detail);
      message.error(detail);
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
        backLabel="Bảng điều khiển"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingIndicator />
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
                  onClick={() => {
                    setTemplateWizardInitialCode(undefined);
                    setShowTemplateWizard(true);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Tạo từ mẫu
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiAssistant(true)}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
                >
                  Tạo bằng AI
                </button>
                <button
                  type="button"
                  onClick={() => openTemplateManager("save")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Lưu thành mẫu
                </button>
                <button
                  type="button"
                  onClick={() => openTemplateManager("export")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Xuất mẫu
                </button>
                <button
                  type="button"
                  onClick={() => openTemplateManager("import")}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Nhập mẫu
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
              datasets={[...datasets, ...virtualDatasets]}
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

      {showTemplateWizard && draft && (
        <Modal
          title="Tạo bảng điều khiển từ mẫu"
          onClose={() => setShowTemplateWizard(false)}
          size="xl"
        >
          <DashboardTemplateWizard
            templates={[
              ...(aiGeneratedTemplate ? [aiGeneratedTemplate] : []),
              ...dashboardTemplates,
              ...customTemplates,
            ]}
            customTemplateIds={customTemplates.map((template) => template.id)}
            aiTemplateIds={
              aiGeneratedTemplate ? [aiGeneratedTemplate.id] : undefined
            }
            initialTemplateCode={templateWizardInitialCode}
            initialValues={templateWizardInitialValues}
            dataSources={dataSources}
            savedViews={savedViews}
            datasets={[...datasets, ...virtualDatasets]}
            existingWidgetCount={draft.widgets.length}
            onCancel={() => setShowTemplateWizard(false)}
            onApply={(widgets, mode) => void handleApplyTemplate(widgets, mode)}
          />
        </Modal>
      )}

      {showAiAssistant && (
        <Modal
          title="Tạo bảng điều khiển bằng AI"
          onClose={() => setShowAiAssistant(false)}
          size="lg"
        >
          <DashboardAiAssistant
            dataSources={dataSources}
            savedViews={savedViews}
            datasets={[...datasets, ...virtualDatasets]}
            onCancel={() => setShowAiAssistant(false)}
            onGenerated={handleAiTemplateGenerated}
          />
        </Modal>
      )}

      {showTemplateManager && draft && (
        <Modal
          title="Quản lý mẫu bảng điều khiển"
          onClose={() => setShowTemplateManager(false)}
          size="xl"
        >
          <DashboardTemplateManager
            dashboard={draft}
            customTemplates={customTemplates}
            initialTab={templateManagerInitialTab}
            onTemplatesChange={setCustomTemplates}
          />
        </Modal>
      )}
    </div>
  );
}
