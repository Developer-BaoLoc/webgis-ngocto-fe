"use client";

import { useState } from "react";
import { DashboardAiWidgetReview } from "@/components/admin/dashboard-ai-widget-review";
import {
  DashboardAiGenerationError,
  generateDashboardTemplate,
  type GenerateDashboardTemplateResult,
} from "@/lib/dashboard/ai/generate-dashboard";
import {
  applyDashboardAiDataPreparationPlan,
  hasDashboardAiPreparationPlan,
  type DashboardAiSuggestedMultiSourceMetricDataset,
  type DashboardAiMultiSourceMetricDatasetSourcePlan,
  type DashboardAiPreparationApplyResult,
} from "@/lib/dashboard/ai/data-preparation";
import {
  createVirtualDatasetWithRecords,
  setVirtualDataset,
  virtualDatasetFields,
  virtualDatasetId,
  virtualDatasetToDataset,
  type VirtualDataset,
  type VirtualDatasetBackedDataset,
  type VirtualDatasetSourceType,
} from "@/lib/dashboard/virtual-datasets";
import { dashboardAiPromptExamples } from "@/lib/dashboard/ai/prompt-examples";
import {
  collectTemplatePlaceholders,
  type DashboardTemplatePlaceholderValues,
  type DashboardTemplate,
  type DashboardTemplateWidget,
} from "@/lib/dashboard/templates";
import { buildTemplateAutoMapping } from "@/lib/dashboard/templates/auto-mapping";
import {
  profileRelevantDashboardSources,
  type DashboardAiDataProfile,
} from "@/lib/dashboard/ai/data-profiling";
import type { DataSourceLayer } from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import { logAuditAction } from "@/lib/audit/audit-log";

interface DashboardAiAssistantProps {
  dataSources: DataSourceLayer[];
  savedViews: SavedView[];
  datasets: Dataset[];
  onCancel: () => void;
  onGenerated: (
    template: DashboardTemplate,
    prepared?: {
      savedViews?: SavedView[];
      datasets?: Dataset[];
      templateValues?: DashboardTemplatePlaceholderValues;
    },
  ) => void;
}

function confidenceLabel(score?: number) {
  if (!score || score <= 0) return "Thấp";
  if (score >= 80) return "Cao";
  if (score >= 50) return "Trung bình";
  return "Thấp";
}

function confidenceClass(score?: number) {
  if (!score || score < 50) return "bg-red-50 text-red-700";
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function summarizeList(values?: string[]) {
  if (!values?.length) return "Không có";
  return values.slice(0, 4).join(", ") + (values.length > 4 ? "..." : "");
}

type VirtualSourceMapping = {
  sourceId: string;
  sourceType: VirtualDatasetSourceType | "";
  metricField: string;
  aggregation: "sum" | "avg" | "count";
};

type VirtualDatasetMappings = Record<string, Record<string, VirtualSourceMapping>>;

function isMultiSourceMetricDataset(
  dataset: GenerateDashboardTemplateResult["dataPreparationPlan"] extends infer Plan
    ? Plan extends { suggestedDatasets?: Array<infer Item> }
      ? Item
      : never
    : never,
): dataset is DashboardAiSuggestedMultiSourceMetricDataset {
  return Boolean(dataset && typeof dataset === "object" && "type" in dataset && dataset.type === "multiSourceMetricDataset");
}

function sourceSelectValue(type?: string, id?: string) {
  return type && id ? `${type}:${id}` : "";
}

function parseSourceSelectValue(value: string): {
  sourceType: VirtualDatasetSourceType | "";
  sourceId: string;
} {
  const [type, ...rest] = value.split(":");
  const id = rest.join(":");
  if (type === "layer" || type === "saved_view" || type === "dataset") {
    return { sourceType: type, sourceId: id };
  }
  return { sourceType: "", sourceId: "" };
}

function buildVirtualTemplateValues(
  template: DashboardTemplate,
  virtualDatasets: Dataset[],
): DashboardTemplatePlaceholderValues {
  const values: DashboardTemplatePlaceholderValues = {};
  if (virtualDatasets.length === 0) return values;
  const placeholders = collectTemplatePlaceholders(template);
  const datasetPlaceholders = placeholders.filter(
    (placeholder) => placeholder.kind === "dataset",
  );

  for (const placeholder of datasetPlaceholders) {
    const matched =
      virtualDatasets.find((dataset) =>
        `${dataset.id} ${dataset.code} ${dataset.name}`
          .toLowerCase()
          .includes(placeholder.key.toLowerCase()),
      ) ?? (virtualDatasets.length === 1 ? virtualDatasets[0] : undefined);
    if (matched) values[placeholder.key] = matched.id;
  }

  for (const placeholder of placeholders) {
    if (!placeholder.sourceKey || !values[placeholder.sourceKey]) continue;
    if (placeholder.kind === "metric_field") {
      values[placeholder.key] = "value";
      continue;
    }
    if (placeholder.kind === "dimension_field") {
      values[placeholder.key] = "category";
      continue;
    }
    const search = `${placeholder.key} ${placeholder.label}`.toLowerCase();
    if (search.includes("value") || search.includes("giá trị")) {
      values[placeholder.key] = "value";
    } else if (search.includes("source")) {
      values[placeholder.key] = "sourceLabel";
    } else if (search.includes("name") || search.includes("tên")) {
      values[placeholder.key] = "name";
    } else if (search.includes("category") || search.includes("nhóm")) {
      values[placeholder.key] = "category";
    }
  }

  return values;
}

export function DashboardAiAssistant({
  dataSources,
  savedViews,
  datasets,
  onCancel,
  onGenerated,
}: DashboardAiAssistantProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<"normal" | "compact" | "intentOnly" | "repair">("normal");
  const [result, setResult] = useState<GenerateDashboardTemplateResult | null>(
    null,
  );
  const [isApplyingPlan, setIsApplyingPlan] = useState(false);
  const [applyResult, setApplyResult] =
    useState<DashboardAiPreparationApplyResult | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [virtualMappings, setVirtualMappings] = useState<VirtualDatasetMappings>({});
  const [virtualDatasets, setVirtualDatasets] = useState<VirtualDatasetBackedDataset[]>([]);
  const [virtualDatasetErrors, setVirtualDatasetErrors] = useState<Record<string, string>>({});
  const [creatingVirtualDatasetId, setCreatingVirtualDatasetId] = useState<string | null>(null);
  const [reviewWidgets, setReviewWidgets] = useState<DashboardTemplateWidget[]>([]);
  const [enabledWidgetIds, setEnabledWidgetIds] = useState<Set<string>>(new Set());
  const [dataProfiles, setDataProfiles] = useState<DashboardAiDataProfile[]>([]);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  async function handleGenerate(
    mode: "normal" | "compact" | "intentOnly" | "repair" = "normal",
  ) {
    if (isGenerating) return;
    setError(null);
    setErrorDetails([]);
    setRawResponse(null);
    setErrorCode(null);
    setResult(null);
    setApplyResult(null);
    setApplyError(null);
    setVirtualDatasets([]);
    setVirtualMappings({});
    setVirtualDatasetErrors({});
    setReviewWidgets([]);
    setEnabledWidgetIds(new Set());
    if (mode !== "repair") {
      setDataProfiles([]);
      setProfileNotice(null);
    }
    setIsGenerating(true);
    setLastMode(mode);
    try {
      let profiles = dataProfiles;
      if (mode !== "repair") {
        try {
          profiles = await profileRelevantDashboardSources({
            prompt: description,
            mode,
            dataSources,
            savedViews,
            datasets,
          });
          setDataProfiles(profiles);
          setProfileNotice(
            profiles.length
              ? `Đã phân tích rút gọn ${profiles.length} nguồn dữ liệu liên quan.`
              : "Không lấy được data profile; đang dùng metadata và prompt.",
          );
        } catch {
          profiles = [];
          setDataProfiles([]);
          setProfileNotice("Không lấy được data profile; đang dùng metadata và prompt.");
        }
      }
      const generated = await generateDashboardTemplate({
        description,
        dataSources,
        savedViews,
        datasets,
        mode,
        rawResponse: mode === "repair" ? rawResponse ?? undefined : undefined,
        validationErrors: mode === "repair" ? errorDetails : undefined,
        dataProfiles: profiles,
      });
      setResult(generated);
      setApplyResult(null);
      setApplyError(null);
      setVirtualDatasets([]);
      setVirtualMappings({});
      setVirtualDatasetErrors({});
      setReviewWidgets(generated.template.widgets);
      setEnabledWidgetIds(
        new Set(generated.template.widgets.map((widget) => widget.templateWidgetId)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không sinh được mẫu dashboard.",
      );
      if (err instanceof DashboardAiGenerationError) {
        setErrorDetails(err.details ?? []);
        setRawResponse(err.rawResponse ?? null);
        setErrorCode(err.code ?? null);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const sourceOptions = [
    ...dataSources.map((source) => ({
      value: sourceSelectValue("layer", source.layerId),
      label: `Lớp dữ liệu: ${source.layerName}`,
    })),
    ...savedViews.map((view) => ({
      value: sourceSelectValue("saved_view", view.id),
      label: `Chế độ xem đã lưu: ${view.layerName} / ${view.name}`,
    })),
    ...datasets.map((dataset) => ({
      value: sourceSelectValue("dataset", dataset.id),
      label: `Bộ dữ liệu: ${dataset.name}`,
    })),
  ];

  function fieldsForVirtualSource(mapping?: VirtualSourceMapping) {
    if (!mapping?.sourceId || !mapping.sourceType) return [];
    if (mapping.sourceType === "dataset") {
      return (
        datasets.find((dataset) => dataset.id === mapping.sourceId)?.config.fields ?? []
      ).map((field) => ({
        code: field.key,
        label: field.label,
        fieldType: field.type,
      }));
    }
    const layerId =
      mapping.sourceType === "saved_view"
        ? savedViews.find((view) => view.id === mapping.sourceId)?.layerId
        : mapping.sourceId;
    const fields =
      dataSources.find((source) => source.layerId === layerId)?.fields ?? [];
    const savedView = savedViews.find((view) => view.id === mapping.sourceId);
    if (mapping.sourceType === "saved_view" && savedView?.config.visibleFields.length) {
      const visible = new Set(savedView.config.visibleFields);
      return fields.filter((field) => visible.has(field.code));
    }
    return fields;
  }

  function virtualMappingFor(
    dataset: DashboardAiSuggestedMultiSourceMetricDataset,
    source: DashboardAiMultiSourceMetricDatasetSourcePlan,
  ): VirtualSourceMapping {
    return (
      virtualMappings[dataset.tempId]?.[source.sourceKey] ?? {
        sourceId: source.sourceId ?? "",
        sourceType: source.sourceType ?? "",
        metricField: source.metricField ?? "",
        aggregation: source.aggregation,
      }
    );
  }

  function updateVirtualMapping(
    dataset: DashboardAiSuggestedMultiSourceMetricDataset,
    source: DashboardAiMultiSourceMetricDatasetSourcePlan,
    patch: Partial<VirtualSourceMapping>,
  ) {
    setVirtualMappings((current) => {
      const currentDataset = current[dataset.tempId] ?? {};
      const currentMapping = currentDataset[source.sourceKey] ?? {
        sourceId: source.sourceId ?? "",
        sourceType: source.sourceType ?? "",
        metricField: source.metricField ?? "",
        aggregation: source.aggregation,
      };
      return {
        ...current,
        [dataset.tempId]: {
          ...currentDataset,
          [source.sourceKey]: {
            ...currentMapping,
            ...patch,
            ...(patch.sourceId || patch.sourceType ? { metricField: "" } : {}),
          },
        },
      };
    });
  }

  function virtualDatasetReady(dataset: DashboardAiSuggestedMultiSourceMetricDataset) {
    return dataset.sources.every((source) => {
      const mapping = virtualMappingFor(dataset, source);
      return (
        mapping.sourceId &&
        mapping.sourceType &&
        (mapping.aggregation === "count" || mapping.metricField)
      );
    });
  }

  async function handleCreateVirtualDataset(dataset: DashboardAiSuggestedMultiSourceMetricDataset) {
    if (!virtualDatasetReady(dataset)) return;
    setVirtualDatasetErrors((current) => ({ ...current, [dataset.tempId]: "" }));
    setCreatingVirtualDatasetId(dataset.tempId);
    const draftVirtualDataset: Omit<VirtualDataset, "records"> = {
      id: virtualDatasetId(dataset.tempId),
      tempId: dataset.tempId,
      name: dataset.name,
      reason: dataset.reason,
      type: "virtualDataset",
      fields: virtualDatasetFields(),
      sources: dataset.sources.map((source) => {
        const mapping = virtualMappingFor(dataset, source);
        return {
          sourceKey: source.sourceKey,
          label: source.label,
          sourceId: mapping.sourceId,
          sourceType: mapping.sourceType as VirtualDatasetSourceType,
          metricField:
            mapping.aggregation === "count" ? undefined : mapping.metricField,
          aggregation: mapping.aggregation,
        };
      }),
    };
    try {
      const virtualDataset = await createVirtualDatasetWithRecords(draftVirtualDataset);
      setVirtualDataset(virtualDataset);
      logAuditAction({ action: "dataset.virtual_create", objectType: "virtualDataset", objectName: virtualDataset.name, metadata: { records: virtualDataset.records.length, sources: virtualDataset.sources.length } });
      const datasetOption = virtualDatasetToDataset(virtualDataset);
      setVirtualDatasets((current) => [
        ...current.filter((item) => item.id !== datasetOption.id),
        datasetOption,
      ]);
    } catch (err) {
      setVirtualDatasetErrors((current) => ({
        ...current,
        [dataset.tempId]:
          err instanceof Error
            ? err.message
            : "Không tạo được bộ dữ liệu tạm.",
      }));
    } finally {
      setCreatingVirtualDatasetId(null);
    }
  }

  async function handleApplyPreparationPlan() {
    if (!result?.dataPreparationPlan || isApplyingPlan) return;
    setApplyError(null);
    setIsApplyingPlan(true);
    try {
      const applied = await applyDashboardAiDataPreparationPlan(
        result.dataPreparationPlan,
      );
      setApplyResult(applied);
    } catch (err) {
      setApplyError(
        err instanceof Error
          ? err.message
          : "Không tạo được nguồn dữ liệu đề xuất.",
      );
    } finally {
      setIsApplyingPlan(false);
    }
  }

  const mappingSummary = result
    ? (() => {
        const placeholders = collectTemplatePlaceholders(result.template);
        const autoMapping = buildTemplateAutoMapping(
          result.template,
          dataSources,
          savedViews,
          datasets,
        );
        const mapped = placeholders
          .map((placeholder) => ({
            placeholder,
            state: autoMapping.states[placeholder.key],
            value: autoMapping.values[placeholder.key],
          }))
          .filter((item) => item.value || item.state?.suggestion);
        const needsReview = placeholders.filter((placeholder) => {
          const state = autoMapping.states[placeholder.key];
          return !state || state.status === "missing" || (state.score ?? 0) < 50;
        });
        return { mapped, needsReview };
      })()
    : null;

  function reviewedTemplate() {
    if (!result) return null;
    return {
      ...result.template,
      widgets: reviewWidgets.filter((widget) =>
        enabledWidgetIds.has(widget.templateWidgetId),
      ),
    };
  }

  function continueToMapping() {
    const template = reviewedTemplate();
    if (!template?.widgets.length) return;
    onGenerated(template, {
      savedViews: applyResult?.savedViews,
      datasets: [...(applyResult?.datasets ?? []), ...virtualDatasets],
      templateValues: buildVirtualTemplateValues(template, virtualDatasets),
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-semibold">AI chỉ tạo cấu hình mẫu dashboard.</p>
        <p className="mt-1 text-xs text-sky-800">
          Mẫu vẫn đi qua trình hướng dẫn để liên kết lớp dữ liệu, bộ dữ liệu,
          chế độ xem đã lưu và trường thật trước khi tạo tiện ích.
        </p>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-foreground">Mô tả dashboard muốn tạo</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="Ví dụ: Tạo dashboard IOC cho cảnh báo nông nghiệp."
          className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Gợi ý nhanh
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {dashboardAiPromptExamples.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => {
                setDescription(example.prompt);
                setError(null);
                setErrorDetails([]);
                setRawResponse(null);
                setErrorCode(null);
                setResult(null);
                setApplyResult(null);
                setApplyError(null);
                setVirtualDatasets([]);
                setVirtualMappings({});
                setReviewWidgets([]);
                setEnabledWidgetIds(new Set());
                setDataProfiles([]);
                setProfileNotice(null);
                setLastMode("normal");
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <span className="block text-sm font-medium text-foreground">
                {example.label}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs text-muted">
                {example.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="whitespace-pre-wrap">{error}</p>
          {errorCode ? (
            <p className="inline-flex w-fit rounded-full bg-white px-2 py-1 text-xs font-medium text-red-700">
              {errorCode}
            </p>
          ) : null}
          {errorDetails.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-xs">
              {errorDetails.slice(0, 6).map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
          {rawResponse ? (
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Raw response để copy/debug</span>
              <textarea
                readOnly
                value={rawResponse}
                rows={5}
                className="w-full rounded-lg border border-red-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700"
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(errorCode === "context_too_large" || !rawResponse) &&
            lastMode !== "intentOnly" ? (
              <button
                type="button"
                disabled={isGenerating || !description.trim()}
                onClick={() =>
                  void handleGenerate(lastMode === "normal" ? "compact" : "intentOnly")
                }
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {lastMode === "normal"
                  ? "Thử lại với context rút gọn"
                  : "Tạo mẫu cơ bản"}
              </button>
            ) : null}
            {rawResponse ? (
              <button
                type="button"
                disabled={isGenerating || !description.trim()}
                onClick={() => void handleGenerate("repair")}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Thử sửa bằng AI
              </button>
            ) : null}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div>
            <p className="font-semibold">Đã sinh template: {result.template.name}</p>
            <p className="mt-1 text-xs text-emerald-800">
              {result.template.widgets.length} tiện ích sẽ được đưa vào trình
              hướng dẫn để liên kết dữ liệu thật.
            </p>
          </div>
          {result.diagnostics?.messages?.length ? (
            <div className="space-y-1 text-xs">
              {result.diagnostics.messages.map((message) => (
                <p key={message}>✓ {message}</p>
              ))}
            </div>
          ) : null}
          {profileNotice ? (
            <p className="rounded-lg bg-white/70 px-3 py-2 text-xs text-sky-800">
              {profileNotice}
            </p>
          ) : null}
          {mappingSummary ? (
            <div className="rounded-lg bg-white/70 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-800">
                Gợi ý mapping tự động
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {mappingSummary.mapped.slice(0, 8).map((item) => (
                  <span
                    key={item.placeholder.key}
                    className={`rounded-full px-2 py-1 ${confidenceClass(
                      item.state?.score,
                    )}`}
                  >
                    {item.placeholder.label}:{" "}
                    {confidenceLabel(item.state?.score)}
                  </span>
                ))}
                {mappingSummary.needsReview.length > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                    {mappingSummary.needsReview.length} trường/nguồn cần kiểm tra
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                    Không có mapping confidence thấp
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {result && reviewWidgets.length > 0 ? (
        <DashboardAiWidgetReview
          key={result.template.id}
          widgets={reviewWidgets}
          enabledWidgetIds={enabledWidgetIds}
          onWidgetsChange={setReviewWidgets}
          onEnabledWidgetIdsChange={setEnabledWidgetIds}
          dataProfiles={dataProfiles}
        />
      ) : null}

      {result && hasDashboardAiPreparationPlan(result.dataPreparationPlan) ? (
        <div className="ai-data-preparation min-w-0 max-w-full space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-900 shadow-sm">
          <div>
            <p className="font-semibold">AI đề xuất chuẩn bị dữ liệu trước</p>
            <p className="mt-1 text-xs text-sky-800">
              Kế hoạch này chỉ được áp dụng khi bạn xác nhận. Nếu bỏ qua, mẫu
              vẫn đi vào trình hướng dẫn để liên kết thủ công.
            </p>
            {result.dataPreparationPlan?.reason ? (
              <p className="mt-2 text-xs text-sky-900">
                {result.dataPreparationPlan.reason}
              </p>
            ) : null}
          </div>

          {result.dataPreparationPlan?.suggestedSavedViews?.length ? (
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs font-semibold text-slate-800">
                Chế độ xem đã lưu được đề xuất
              </p>
              <div className="mt-2 space-y-2">
                {result.dataPreparationPlan.suggestedSavedViews.map((view) => (
                  <div key={view.tempId} className="text-xs text-slate-700">
                    <p className="font-medium text-slate-900">{view.name}</p>
                    <p>Trường: {summarizeList(view.visibleFields)}</p>
                    <p>Chỉ số: {summarizeList(view.metrics)}</p>
                    <p className="text-slate-500">{view.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.dataPreparationPlan?.suggestedDatasets?.length ? (
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs font-semibold text-slate-800">
                Bộ dữ liệu được đề xuất
              </p>
              <div className="mt-2 space-y-2">
                {result.dataPreparationPlan.suggestedDatasets.map((dataset) => (
                  isMultiSourceMetricDataset(dataset) ? (
                    <div
                      key={dataset.tempId}
                      className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-lg border border-sky-100 bg-white/80 px-3 py-3 text-xs text-slate-700"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {dataset.name} · Bộ dữ liệu tạm
                        </p>
                        <p className="text-slate-500">{dataset.reason}</p>
                      </div>
                      <div className="space-y-2">
                        {dataset.sources.map((source) => {
                          const mapping = virtualMappingFor(dataset, source);
                          const fields = fieldsForVirtualSource(mapping);
                          return (
                            <div
                              key={source.sourceKey}
                              className="ai-data-source-row rounded-lg border border-slate-200 bg-slate-50/80 p-2.5"
                            >
                              <span className="min-w-0 truncate font-semibold text-slate-800" title={source.label}>
                                {source.label}
                              </span>
                              <select
                                value={sourceSelectValue(
                                  mapping.sourceType,
                                  mapping.sourceId,
                                )}
                                onChange={(event) => {
                                  const parsed = parseSourceSelectValue(
                                    event.target.value,
                                  );
                                  updateVirtualMapping(dataset, source, parsed);
                                }}
                                className="ioc-select-sm"
                              >
                                <option value="">Chọn nguồn dữ liệu</option>
                                {sourceOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={mapping.metricField}
                                disabled={
                                  !mapping.sourceId ||
                                  !mapping.sourceType ||
                                  mapping.aggregation === "count"
                                }
                                onChange={(event) =>
                                  updateVirtualMapping(dataset, source, {
                                    metricField: event.target.value,
                                  })
                                }
                                className="ioc-select-sm"
                              >
                                <option value="">
                                  {mapping.aggregation === "count"
                                    ? "Không cần trường"
                                    : "Chọn trường chỉ số"}
                                </option>
                                {fields.map((field) => (
                                  <option key={field.code} value={field.code}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={mapping.aggregation}
                                onChange={(event) =>
                                  updateVirtualMapping(dataset, source, {
                                    aggregation: event.target.value as
                                      | "sum"
                                      | "avg"
                                      | "count",
                                  })
                                }
                                className="ioc-select-sm"
                              >
                                <option value="sum">Tổng</option>
                                <option value="avg">Trung bình</option>
                                <option value="count">Đếm</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            !virtualDatasetReady(dataset) ||
                            creatingVirtualDatasetId === dataset.tempId
                          }
                          onClick={() => void handleCreateVirtualDataset(dataset)}
                          aria-busy={creatingVirtualDatasetId === dataset.tempId}
                          className="inline-flex min-h-8 min-w-[9.5rem] items-center justify-center gap-2 rounded-lg border border-sky-700 bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {creatingVirtualDatasetId === dataset.tempId
                            ? <><span className="ioc-loading-spinner" aria-hidden="true" />Đang tạo</>
                            : "Tạo bộ dữ liệu tạm"}
                        </button>
                        {virtualDatasets.some(
                          (item) => item.id === virtualDatasetId(dataset.tempId),
                        ) ? (
                          <span className="text-xs font-medium text-emerald-700">
                            Đã tạo bộ dữ liệu tạm trong phiên thiết kế
                          </span>
                        ) : null}
                      </div>
                      {virtualDatasetErrors[dataset.tempId] ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                          {virtualDatasetErrors[dataset.tempId]}
                        </p>
                      ) : null}
                      {virtualDatasets
                        .find((item) => item.id === virtualDatasetId(dataset.tempId))
                        ?.virtualDataset?.records.length ? (
                        <div className="rounded-lg border border-emerald-100 bg-white px-2 py-2">
                          <p className="mb-1 font-medium text-slate-800">
                            Xem trước bộ dữ liệu tạm
                          </p>
                          <div className="space-y-1">
                            {virtualDatasets
                              .find((item) => item.id === virtualDatasetId(dataset.tempId))
                              ?.virtualDataset?.records.map((record) => (
                                <div
                                  key={record.sourceLabel}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="truncate">{record.name}</span>
                                  <span
                                    className={
                                      record.value
                                        ? "font-semibold tabular-nums text-slate-900"
                                        : "font-semibold tabular-nums text-amber-700"
                                    }
                                  >
                                    {record.value.toLocaleString("vi-VN", {
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ))}
                          </div>
                          {virtualDatasets
                            .find((item) => item.id === virtualDatasetId(dataset.tempId))
                            ?.virtualDataset?.records.some((record) => !record.value) ? (
                            <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-amber-700">
                              Có nguồn đang trả về 0 hoặc không có giá trị, hãy kiểm tra
                              trường chỉ số.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div key={dataset.tempId} className="text-xs text-slate-700">
                      <p className="font-medium text-slate-900">{dataset.name}</p>
                      <p>
                        Fields:{" "}
                        {summarizeList(
                          dataset.fields.map((field) => field.label || field.key),
                        )}
                      </p>
                      <p>Nhóm theo: {summarizeList(dataset.groupBy)}</p>
                      <p>Chỉ số: {summarizeList(dataset.metrics)}</p>
                      <p className="text-slate-500">{dataset.reason}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          ) : null}

          {applyResult ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {applyResult.messages.length ? (
                <div className="space-y-1">
                  {applyResult.messages.map((message) => (
                    <p key={message}>✓ {message}</p>
                  ))}
                </div>
              ) : (
                <p>Không có nguồn dữ liệu tự động nào được tạo.</p>
              )}
              {applyResult.skipped.length ? (
                <div className="mt-2 space-y-1 text-amber-700">
                  {applyResult.skipped.map((message) => (
                    <p key={message}>• {message}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {applyError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {applyError}
            </p>
          ) : null}

          <div className="flex min-w-0 flex-wrap gap-2.5">
            <button
              type="button"
              disabled={isApplyingPlan || Boolean(applyResult)}
              onClick={() => void handleApplyPreparationPlan()}
              aria-busy={isApplyingPlan}
              className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-3.5 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingPlan
                ? <><span className="ioc-loading-spinner" aria-hidden="true" />Đang tạo</>
                : applyResult
                  ? "Đã áp dụng kế hoạch"
                  : "Xác nhận tạo nguồn dữ liệu đề xuất"}
            </button>
            <button
              type="button"
              disabled={enabledWidgetIds.size === 0}
              onClick={continueToMapping}
              className="min-h-9 max-w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applyResult ? "Tiếp tục với nguồn vừa tạo" : "Xác nhận tiện ích và liên kết thủ công"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={isGenerating || !description.trim()}
          onClick={() => void handleGenerate("normal")}
          aria-busy={isGenerating}
          className="inline-flex min-h-10 min-w-[9.25rem] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating
            ? <><span className="ioc-loading-spinner" aria-hidden="true" />Đang tạo</>
            : result
              ? "Sinh lại"
              : "Sinh mẫu dashboard"}
        </button>
        {result && (
          <button
            type="button"
            disabled={enabledWidgetIds.size === 0}
            onClick={continueToMapping}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tiếp tục liên kết dữ liệu
          </button>
        )}
      </div>
    </div>
  );
}
