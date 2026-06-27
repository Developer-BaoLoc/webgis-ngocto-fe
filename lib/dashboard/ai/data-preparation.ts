import { createDataset } from "@/lib/api/datasets";
import { createSavedView } from "@/lib/api/saved-views";
import type { Dataset, DatasetFieldType } from "@/types/api/dataset";
import type { SavedView, SavedViewFilterOperator } from "@/types/api/saved-view";

export interface DashboardAiPreparationFilter {
  field: string;
  operator: SavedViewFilterOperator;
  value?: unknown;
}

export interface DashboardAiSuggestedSavedView {
  tempId: string;
  name: string;
  description?: string;
  layerId: string;
  filters?: DashboardAiPreparationFilter[];
  visibleFields?: string[];
  groupBy?: string[];
  metrics?: string[];
  reason: string;
}

export interface DashboardAiDatasetFieldPlan {
  key: string;
  label: string;
  type: DatasetFieldType;
}

export interface DashboardAiDatasetSourcePlan {
  savedViewTempId?: string;
  viewId?: string;
  sourceLabel: string;
  mapping: Record<string, string>;
}

export interface DashboardAiMultiSourceMetricDatasetSourcePlan {
  sourceKey: string;
  label: string;
  sourceId?: string;
  sourceType?: "layer" | "saved_view" | "dataset";
  metricField?: string;
  aggregation: "sum" | "avg" | "count";
}

export interface DashboardAiSuggestedDataset {
  type?: "dataset";
  tempId: string;
  name: string;
  description?: string;
  fields: DashboardAiDatasetFieldPlan[];
  sources: DashboardAiDatasetSourcePlan[];
  groupBy?: string[];
  metrics?: string[];
  reason: string;
}

export interface DashboardAiSuggestedMultiSourceMetricDataset {
  type: "multiSourceMetricDataset";
  tempId: string;
  name: string;
  description?: string;
  sources: DashboardAiMultiSourceMetricDatasetSourcePlan[];
  reason: string;
}

export interface DashboardAiDataPreparationPlan {
  suggestedSavedViews?: DashboardAiSuggestedSavedView[];
  suggestedDatasets?: Array<
    DashboardAiSuggestedDataset | DashboardAiSuggestedMultiSourceMetricDataset
  >;
  filters?: DashboardAiPreparationFilter[];
  groupBy?: string[];
  metrics?: string[];
  reason?: string;
}

export interface DashboardAiPreparationApplyResult {
  savedViews: SavedView[];
  datasets: Dataset[];
  messages: string[];
  skipped: string[];
}

function normalizeLimit(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export async function applyDashboardAiDataPreparationPlan(
  plan: DashboardAiDataPreparationPlan,
): Promise<DashboardAiPreparationApplyResult> {
  const savedViewByTempId = new Map<string, SavedView>();
  const savedViews: SavedView[] = [];
  const datasets: Dataset[] = [];
  const messages: string[] = [];
  const skipped: string[] = [];

  for (const view of plan.suggestedSavedViews ?? []) {
    if (!view.layerId || !view.name) {
      skipped.push(`Bỏ qua saved view thiếu layer/name: ${view.name || view.tempId}`);
      continue;
    }
    const created = await createSavedView({
      name: view.name,
      description: view.description ?? view.reason,
      layerId: view.layerId,
      viewType: "table",
      isPublic: false,
      config: {
        filterMode: "and",
        filters: view.filters ?? [],
        sorts: [],
        visibleFields: view.visibleFields ?? [],
        limit: normalizeLimit(undefined, 500),
        previewLimit: normalizeLimit(undefined, 100),
      },
    });
    savedViews.push(created);
    savedViewByTempId.set(view.tempId, created);
    messages.push(`Đã tạo Saved View: ${created.name}`);
  }

  for (const dataset of plan.suggestedDatasets ?? []) {
    if (dataset.type === "multiSourceMetricDataset") {
      skipped.push(
        `Dataset tạm ${dataset.name} cần map trong Wizard, không tạo backend tự động.`,
      );
      continue;
    }

    const sources = dataset.sources
      .map((source) => {
        const viewId =
          source.viewId ||
          (source.savedViewTempId
            ? savedViewByTempId.get(source.savedViewTempId)?.id
            : undefined);
        if (!viewId) return null;
        return {
          viewId,
          sourceLabel: source.sourceLabel,
          mapping: source.mapping,
        };
      })
      .filter((source): source is NonNullable<typeof source> => Boolean(source));

    if (!dataset.name || !dataset.fields.length || !sources.length) {
      skipped.push(`Bỏ qua dataset chưa đủ cấu hình: ${dataset.name || dataset.tempId}`);
      continue;
    }

    const created = await createDataset({
      name: dataset.name,
      description: dataset.description ?? dataset.reason,
      isPublic: false,
      config: {
        fields: dataset.fields,
        sources,
        previewLimit: 100,
      },
    });
    datasets.push(created);
    messages.push(`Đã tạo Dataset: ${created.name}`);
  }

  return { savedViews, datasets, messages, skipped };
}

export function hasDashboardAiPreparationPlan(
  plan?: DashboardAiDataPreparationPlan | null,
) {
  return Boolean(
    plan &&
      ((plan.suggestedSavedViews?.length ?? 0) > 0 ||
        (plan.suggestedDatasets?.length ?? 0) > 0 ||
        (plan.filters?.length ?? 0) > 0 ||
        (plan.groupBy?.length ?? 0) > 0 ||
        (plan.metrics?.length ?? 0) > 0),
  );
}
