import { previewAnalytics } from "@/lib/api/analytics";
import type {
  AggregationType,
  AnalyticsResult,
  DataSourceConfig,
  DataSourceField,
} from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";

export type VirtualDatasetSourceType = "layer" | "saved_view" | "dataset";

export interface VirtualDatasetSource {
  sourceKey: string;
  label: string;
  sourceId: string;
  sourceType: VirtualDatasetSourceType;
  metricField?: string;
  aggregation: Extract<AggregationType, "sum" | "avg" | "count">;
}

export interface VirtualDataset {
  id: string;
  tempId: string;
  name: string;
  reason?: string;
  type: "virtualDataset";
  fields: DataSourceField[];
  sources: VirtualDatasetSource[];
  records: VirtualDatasetRecord[];
}

export interface VirtualDatasetRecord {
  name: string;
  category: string;
  value: number;
  sourceType: string;
  sourceLabel: string;
}

export type VirtualDatasetBackedDataset = Dataset & {
  isVirtual?: true;
  virtualDataset?: VirtualDataset;
};

const VIRTUAL_DATASET_PREFIX = "virtual_";
const LEGACY_VIRTUAL_DATASET_PREFIX = "virtual:";
const registry = new Map<string, VirtualDataset>();
const listeners = new Set<() => void>();

export function virtualDatasetId(tempId: string) {
  const normalized = tempId
    .replace(/^virtual[:_]/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return tempId.startsWith(VIRTUAL_DATASET_PREFIX)
    ? tempId
    : `${VIRTUAL_DATASET_PREFIX}${normalized || "dataset"}`;
}

export function isVirtualDatasetId(value?: string | null) {
  return (
    typeof value === "string" &&
    (value.startsWith(VIRTUAL_DATASET_PREFIX) ||
      value.startsWith(LEGACY_VIRTUAL_DATASET_PREFIX))
  );
}

export function isVirtualDataset(dataset?: Dataset | null): dataset is VirtualDatasetBackedDataset {
  return Boolean(dataset && isVirtualDatasetId(dataset.id));
}

export function getVirtualDataset(id?: string | null) {
  return id ? registry.get(id) ?? null : null;
}

export function getVirtualDatasets() {
  return Array.from(registry.values());
}

export function setVirtualDataset(dataset: VirtualDataset) {
  registry.set(dataset.id, dataset);
  emitVirtualDatasetChange();
}

export function subscribeVirtualDatasets(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitVirtualDatasetChange() {
  listeners.forEach((listener) => listener());
}

export function virtualDatasetFields(): DataSourceField[] {
  return [
    { code: "name", label: "Tên", fieldType: "text" },
    { code: "category", label: "Nhóm", fieldType: "text" },
    { code: "value", label: "Giá trị", fieldType: "decimal" },
    { code: "sourceType", label: "Loại nguồn", fieldType: "text" },
    { code: "sourceLabel", label: "Nhãn nguồn", fieldType: "text" },
  ];
}

export function virtualDatasetToDataset(dataset: VirtualDataset): VirtualDatasetBackedDataset {
  return {
    id: dataset.id,
    code: dataset.tempId,
    name: `${dataset.name} (Tạm)`,
    description: dataset.reason ?? "Dataset tạm trong phiên Dashboard Builder.",
    isPublic: false,
    config: {
      fields: dataset.fields.map((field) => ({
        key: field.code,
        label: field.label,
        type:
          field.fieldType === "decimal"
            ? "decimal"
            : field.fieldType === "number"
              ? "number"
              : "text",
      })),
      sources: [],
      previewLimit: 20,
    },
    isVirtual: true,
    virtualDataset: dataset,
  };
}

export function virtualDatasetSnapshot(dataset: VirtualDataset): NonNullable<DataSourceConfig["virtualDataset"]> {
  return {
    id: dataset.id,
    name: dataset.name,
    type: "virtualDataset",
    fields: dataset.fields,
    records: dataset.records,
  };
}

export function virtualDatasetSnapshotToDataset(
  snapshot: NonNullable<DataSourceConfig["virtualDataset"]>,
): VirtualDatasetBackedDataset {
  return {
    id: snapshot.id,
    code: snapshot.id.replace(/^virtual_/, ""),
    name: `${snapshot.name} (Tạm)`,
    description: "Dataset tạm được embed trong widget dashboard.",
    isPublic: false,
    config: {
      fields: snapshot.fields.map((field) => ({
        key: field.code,
        label: field.label,
        type:
          field.fieldType === "decimal"
            ? "decimal"
            : field.fieldType === "number"
              ? "number"
              : "text",
      })),
      sources: [],
      previewLimit: 20,
    },
    isVirtual: true,
    virtualDataset: {
      id: snapshot.id,
      tempId: snapshot.id.replace(/^virtual_/, ""),
      name: snapshot.name,
      type: "virtualDataset",
      fields: snapshot.fields,
      sources: [],
      records: snapshot.records,
    },
  };
}

function sourceDataSourceConfig(source: VirtualDatasetSource): DataSourceConfig {
  return {
    aggregation: source.aggregation,
    ...(source.sourceType === "layer" ? { layerId: source.sourceId } : {}),
    ...(source.sourceType === "saved_view" ? { viewId: source.sourceId } : {}),
    ...(source.sourceType === "dataset" ? { datasetId: source.sourceId } : {}),
    ...(source.metricField ? { metricField: source.metricField } : {}),
  };
}

function resultValue(result: AnalyticsResult) {
  if ("value" in result) return Number(result.value ?? 0);
  if ("rows" in result) {
    return result.rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
  }
  if ("records" in result) return result.records.length;
  return 0;
}

export async function previewVirtualDatasetAnalytics(
  dataSourceConfig: DataSourceConfig,
): Promise<AnalyticsResult | null> {
  const snapshot = dataSourceConfig.virtualDataset;
  const dataset = getVirtualDataset(dataSourceConfig.datasetId);
  const records = snapshot?.records ?? dataset?.records;
  const datasetId = snapshot?.id ?? dataset?.id;
  if (!records || !datasetId) return null;

  const sortedRecords = [...records].sort(
    (a, b) => Number(b.value ?? 0) - Number(a.value ?? 0),
  );
  const limit =
    typeof dataSourceConfig.limit === "number" && dataSourceConfig.limit > 0
      ? dataSourceConfig.limit
      : sortedRecords.length;
  const fieldLabels = {
    name: "Tên",
    category: "Nhóm",
    value: "Giá trị",
    sourceType: "Loại nguồn",
    sourceLabel: "Nhãn nguồn",
  };

  if (
    dataSourceConfig.aggregation === "top" ||
    dataSourceConfig.sort?.field === "value"
  ) {
    return {
      datasetId,
      aggregation: "top",
      fieldCode: "value",
      records: sortedRecords.slice(0, limit),
      fieldLabels,
    };
  }

  return {
    datasetId,
    aggregation: dataSourceConfig.aggregation,
    groupByFieldCode: dataSourceConfig.dimensionField ?? "category",
    fieldCode: dataSourceConfig.metricField ?? "value",
    rows: sortedRecords.slice(0, limit).map((record) => ({
      rawLabel: String(record.category),
      label: String(record.category),
      value: Number(record.value ?? 0),
    })),
    fieldLabels,
  };
}

export async function createVirtualDatasetWithRecords(input: Omit<VirtualDataset, "records">): Promise<VirtualDataset> {
  const records = await Promise.all(
    input.sources.map(async (source) => {
      try {
        const result = await previewAnalytics({
          dataSourceConfig: sourceDataSourceConfig(source),
        });
        return {
          name: source.label,
          category: source.label,
          value: resultValue(result),
          sourceType: source.sourceKey,
          sourceLabel: source.label,
        };
      } catch (err) {
        throw new Error(
          `Không lấy được dữ liệu từ ${source.label}: ${
            err instanceof Error ? err.message : "Xem trước thất bại"
          }`,
        );
      }
    }),
  );
  return { ...input, records };
}
