import { previewDataset } from "@/lib/api/datasets";
import { getLayerRecords } from "@/lib/api/records";
import { previewSavedView } from "@/lib/api/saved-views";
import { isNumericFieldType } from "@/lib/fields/field-types";
import type { DataSourceLayer } from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import {
  buildDashboardAiGroundingContext,
  rankSourcesForPrompt,
  type DashboardAiMode,
} from "./context";

export interface DashboardAiProfileTopValue {
  value: string | number | boolean;
  count: number;
}

export interface DashboardAiFieldProfile {
  key: string;
  label?: string;
  type?: string;
  nullCount: number;
  uniqueCount: number;
  numeric?: {
    min: number;
    max: number;
    sum: number;
    avg: number;
  };
  dateRange?: { from: string; to: string };
  topValues?: DashboardAiProfileTopValue[];
}

export interface DashboardAiDataProfile {
  sourceId: string;
  sourceName: string;
  sourceCode?: string;
  sourceKind: "layer" | "dataset" | "saved_view";
  rowCount: number;
  sampledRowCount: number;
  hasGeometry: boolean;
  fields: DashboardAiFieldProfile[];
}

interface ProfileRows {
  rows: Array<Record<string, unknown>>;
  total: number;
  hasGeometry?: boolean;
}

const SAMPLE_SIZE = 100;
const CATEGORY_TYPES = new Set([
  "select",
  "enum",
  "category",
  "dictionary",
  "boolean",
  "status",
]);
const DATE_TYPES = new Set(["date", "datetime", "timestamp", "timestamptz"]);

function normalizeType(value?: string) {
  return String(value ?? "").trim().toLowerCase();
}

function safeScalar(value: unknown): string | number | boolean | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const vietnameseDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const date = vietnameseDate
    ? new Date(
        Number(vietnameseDate[3]),
        Number(vietnameseDate[2]) - 1,
        Number(vietnameseDate[1]),
      )
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isLikelySensitiveFreeText(key: string, label?: string) {
  const text = `${key} ${label ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /ten |name|title|tieu de|dia chi|address|ghi chu|note|mo ta|description|dien thoai|phone|email/.test(
    text,
  );
}

function profileField(
  field: { key: string; label?: string; type?: string },
  rows: Array<Record<string, unknown>>,
): DashboardAiFieldProfile {
  const values = rows.map((row) => row[field.key]);
  const present = values.filter((value) => value !== null && value !== undefined && value !== "");
  const distinct = new Map<string, { value: string | number | boolean; count: number }>();
  for (const value of present) {
    const scalar = safeScalar(value);
    if (scalar === null) continue;
    const key = `${typeof scalar}:${String(scalar)}`;
    const current = distinct.get(key);
    distinct.set(key, { value: scalar, count: (current?.count ?? 0) + 1 });
  }

  const type = normalizeType(field.type);
  const profile: DashboardAiFieldProfile = {
    key: field.key,
    ...(field.label ? { label: field.label } : {}),
    ...(field.type ? { type: field.type } : {}),
    nullCount: values.length - present.length,
    uniqueCount: distinct.size,
  };

  if (isNumericFieldType(type)) {
    const numeric = present
      .map(numericValue)
      .filter((value): value is number => value !== null);
    if (numeric.length) {
      const sum = numeric.reduce((total, value) => total + value, 0);
      profile.numeric = {
        min: Math.min(...numeric),
        max: Math.max(...numeric),
        sum,
        avg: sum / numeric.length,
      };
    }
  }

  if (DATE_TYPES.has(type)) {
    const dates = present
      .map(dateValue)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length) {
      profile.dateRange = {
        from: dates[0].toISOString(),
        to: dates[dates.length - 1].toISOString(),
      };
    }
  }

  const mayBeCategory =
    CATEGORY_TYPES.has(type) ||
    (!isLikelySensitiveFreeText(field.key, field.label) && distinct.size <= 20);
  if (mayBeCategory) {
    const topValues = Array.from(distinct.values())
      .filter((item) => item.count > 1 || CATEGORY_TYPES.has(type))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    if (topValues.length) profile.topValues = topValues;
  }

  return profile;
}

async function rowsForSource(input: {
  sourceId: string;
  sourceKind: "layer" | "dataset" | "saved_view";
  dataSources: DataSourceLayer[];
  datasets: Dataset[];
  savedViews: SavedView[];
}): Promise<ProfileRows> {
  if (input.sourceKind === "layer") {
    const result = await getLayerRecords(input.sourceId, {
      page: 1,
      pageSize: SAMPLE_SIZE,
    });
    return {
      rows: result.records.map((record) => record.properties),
      total: result.meta.total ?? result.records.length,
      hasGeometry: result.records.some((record) => Boolean(record.geometry)),
    };
  }

  if (input.sourceKind === "saved_view") {
    const view = input.savedViews.find((item) => item.id === input.sourceId);
    if (!view) throw new Error("Không tìm thấy Saved View để profiling.");
    const result = await previewSavedView({
      layerId: view.layerId,
      config: { ...view.config, previewLimit: SAMPLE_SIZE },
    });
    return { rows: result.rows, total: result.total };
  }

  const dataset = input.datasets.find((item) => item.id === input.sourceId);
  if (!dataset) throw new Error("Không tìm thấy Dataset để profiling.");
  const embedded = dataset as Dataset & {
    virtualDataset?: { records?: Array<Record<string, unknown>> };
  };
  if (embedded.virtualDataset?.records) {
    return {
      rows: embedded.virtualDataset.records.slice(0, SAMPLE_SIZE),
      total: embedded.virtualDataset.records.length,
    };
  }
  const result = await previewDataset({
    ...dataset.config,
    previewLimit: SAMPLE_SIZE,
  });
  return { rows: result.rows, total: result.total };
}

export async function profileRelevantDashboardSources(input: {
  prompt: string;
  mode?: Exclude<DashboardAiMode, "repair">;
  dataSources: DataSourceLayer[];
  datasets: Dataset[];
  savedViews: SavedView[];
}): Promise<DashboardAiDataProfile[]> {
  const mode = input.mode ?? "normal";
  if (mode === "intentOnly") return [];
  const context = buildDashboardAiGroundingContext(input);
  const sourceLimit = mode === "compact" ? 3 : 5;
  const fieldLimit = mode === "compact" ? 8 : 12;
  const sources = rankSourcesForPrompt(
    input.prompt,
    [...context.layers, ...context.datasets, ...context.savedViews],
    sourceLimit,
  );

  const settled = await Promise.allSettled(
    sources.map(async (source): Promise<DashboardAiDataProfile> => {
      const sampled = await rowsForSource({
        sourceId: source.id,
        sourceKind: source.kind,
        dataSources: input.dataSources,
        datasets: input.datasets,
        savedViews: input.savedViews,
      });
      const layerGeometry =
        source.kind === "layer"
          ? input.dataSources.find((item) => item.layerId === source.id)?.geometryType
          : source.kind === "saved_view"
            ? input.dataSources.find((item) => item.layerId === source.layerId)?.geometryType
            : undefined;
      return {
        sourceId: source.id,
        sourceName: source.name,
        ...(source.code ? { sourceCode: source.code } : {}),
        sourceKind: source.kind,
        rowCount: sampled.total,
        sampledRowCount: sampled.rows.length,
        hasGeometry: Boolean(sampled.hasGeometry || layerGeometry),
        fields: source.fields
          .slice(0, fieldLimit)
          .map((field) => profileField(field, sampled.rows)),
      };
    }),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}
