import type {
  DataSourceField,
  DataSourceLayer,
} from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import type { DashboardAiDataProfile } from "./data-profiling";

export type DashboardAiMode = "normal" | "compact" | "intentOnly" | "repair";

export interface DashboardAiFieldContext {
  key: string;
  label?: string;
  type?: string;
}

export interface DashboardAiSourceContext {
  id: string;
  code?: string;
  name: string;
  kind: "layer" | "dataset" | "saved_view";
  geometryType?: string | null;
  layerId?: string;
  fields: DashboardAiFieldContext[];
}

export interface DashboardAiGroundingContext {
  mode: Exclude<DashboardAiMode, "repair">;
  layers: DashboardAiSourceContext[];
  datasets: DashboardAiSourceContext[];
  savedViews: DashboardAiSourceContext[];
  dataProfiles?: DashboardAiDataProfile[];
}

type SourceWithScore = DashboardAiSourceContext & { score: number };
type FieldWithScore = DashboardAiFieldContext & { score: number };

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  aquaculture: ["thuy san", "thuysan", "nuoi tom", "nuoi ca", "vung nuoi", "aquaculture"],
  rice: ["lua", "vung lua", "san xuat lua", "rice"],
  crop: ["hoa mau", "cay trong", "rau mau", "crop"],
  irrigation: ["thuy loi", "kenh", "cong trinh", "irrigation"],
  ocop: ["ocop", "san pham", "co so"],
  alert: ["canh bao", "phan anh", "su co", "muc do", "alert"],
  ioc: ["ioc", "tong quan", "dashboard", "van hanh"],
  zone: ["ap", "xa", "khu vuc", "hanh chinh", "ranh gioi"],
};

const FIELD_KEYWORDS: Record<string, string[]> = {
  name: ["ten", "name", "title", "tieu de"],
  date: ["ngay", "thoi gian", "date", "time", "created", "updated"],
  area: ["dien tich", "area", "ha", "geometry area"],
  quantity: ["san luong", "quantity", "production", "yield"],
  status: ["trang thai", "tinh trang", "status", "condition"],
  type: ["loai", "nhom", "type", "category", "doi tuong"],
  severity: ["muc do", "cap do", "severity", "priority"],
  value: ["gia tri", "value", "amount", "count", "tong", "so luong"],
  profit: ["loi nhuan", "profit", "income"],
  revenue: ["doanh thu", "revenue"],
  cost: ["chi phi", "cost"],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string) {
  return normalize(value).split(" ").filter((word) => word.length >= 2);
}

function fieldType(field: DataSourceField) {
  const extra = field as DataSourceField & {
    type?: string;
    dataType?: string;
    columnType?: string;
    dataSchema?: { type?: string };
  };
  return (
    field.fieldType ??
    extra.type ??
    extra.dataType ??
    extra.columnType ??
    extra.dataSchema?.type
  );
}

function scoreText(prompt: string, text: string) {
  const normalizedPrompt = normalize(prompt);
  const normalizedText = normalize(text);
  if (!normalizedPrompt || !normalizedText) return 0;
  let score = 0;
  if (normalizedPrompt.includes(normalizedText)) score += 80;
  if (normalizedText.includes(normalizedPrompt)) score += 80;
  for (const word of words(prompt)) {
    if (normalizedText.includes(word)) score += 10;
  }
  for (const keywords of Object.values(DOMAIN_KEYWORDS)) {
    const domainHit = keywords.some((keyword) =>
      normalizedPrompt.includes(normalize(keyword)),
    );
    if (!domainHit) continue;
    for (const keyword of keywords) {
      if (normalizedText.includes(normalize(keyword))) score += 45;
    }
  }
  return score;
}

function scoreField(prompt: string, field: DashboardAiFieldContext) {
  const text = [field.key, field.label, field.type].filter(Boolean).join(" ");
  let score = scoreText(prompt, text);
  const normalizedText = normalize(text);
  const normalizedType = normalize(field.type);

  for (const keywords of Object.values(FIELD_KEYWORDS)) {
    const promptHit = keywords.some((keyword) =>
      normalize(prompt).includes(normalize(keyword)),
    );
    const fieldHit = keywords.some((keyword) =>
      normalizedText.includes(normalize(keyword)),
    );
    if (promptHit && fieldHit) score += 70;
    else if (fieldHit) score += 18;
  }

  if (
    ["number", "integer", "decimal", "currency", "float", "double", "numeric"].some(
      (type) => normalizedType.includes(type),
    )
  ) {
    score += 12;
  }
  if (["date", "datetime", "timestamp"].some((type) => normalizedType.includes(type))) {
    score += 12;
  }
  if (["select", "enum", "category", "boolean", "text", "string"].some((type) =>
    normalizedType.includes(type),
  )) {
    score += 8;
  }
  return score;
}

function layerFields(fields: DataSourceField[] = []): DashboardAiFieldContext[] {
  return fields.map((field) => ({
    key: field.code,
    label: field.label,
    type: fieldType(field),
  }));
}

function rankFieldContexts(
  prompt: string,
  fields: DashboardAiFieldContext[],
): FieldWithScore[] {
  return fields
    .map((field) => ({ ...field, score: scoreField(prompt, field) }))
    .sort((a, b) => b.score - a.score);
}

export function rankFieldsForPrompt(
  prompt: string,
  fields: DashboardAiFieldContext[],
  limit = 20,
) {
  return rankFieldContexts(prompt, fields)
    .filter((field, index) => field.score > 0 || index < Math.min(6, limit))
    .slice(0, limit)
    .map(({ score: _score, ...field }) => field);
}

export function rankSourcesForPrompt(
  prompt: string,
  sources: DashboardAiSourceContext[],
  limit = 12,
) {
  return sources
    .map<SourceWithScore>((source) => ({
      ...source,
      score: scoreText(
        prompt,
        [
          source.id,
          source.code,
          source.name,
          source.kind,
          source.geometryType,
          ...source.fields.slice(0, 12).flatMap((field) => [field.key, field.label]),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((source, index) => source.score > 0 || index < Math.min(4, limit))
    .slice(0, limit)
    .map(({ score: _score, ...source }) => source);
}

function limitsForMode(mode: Exclude<DashboardAiMode, "repair">) {
  if (mode === "intentOnly") return { sources: 0, fields: 0 };
  if (mode === "compact") return { sources: 6, fields: 10 };
  return { sources: 12, fields: 20 };
}

export function buildDashboardAiGroundingContext(input: {
  prompt: string;
  mode?: Exclude<DashboardAiMode, "repair">;
  dataSources: DataSourceLayer[];
  datasets: Dataset[];
  savedViews: SavedView[];
  dataProfiles?: DashboardAiDataProfile[];
}): DashboardAiGroundingContext {
  const mode = input.mode ?? "normal";
  const limits = limitsForMode(mode);
  if (mode === "intentOnly") {
    return { mode, layers: [], datasets: [], savedViews: [], dataProfiles: [] };
  }

  const layerById = new Map(
    input.dataSources.map((layer) => [layer.layerId, layer]),
  );

  const layers: DashboardAiSourceContext[] = input.dataSources.map((layer) => ({
    id: layer.layerId,
    code: layer.layerCode,
    name: layer.layerName,
    kind: "layer",
    geometryType: layer.geometryType,
    fields: rankFieldsForPrompt(input.prompt, layerFields(layer.fields), limits.fields),
  }));

  const datasets: DashboardAiSourceContext[] = input.datasets.map((dataset) => ({
    id: dataset.id,
    code: dataset.code,
    name: dataset.name,
    kind: "dataset",
    fields: rankFieldsForPrompt(
      input.prompt,
      dataset.config.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
      })),
      limits.fields,
    ),
  }));

  const savedViews: DashboardAiSourceContext[] = input.savedViews.map((view) => {
    const layer = layerById.get(view.layerId);
    const visible = new Set(view.config.visibleFields ?? []);
    const fields =
      layer && visible.size > 0
        ? layer.fields.filter((field) => visible.has(field.code))
        : (layer?.fields ?? []);
    return {
      id: view.id,
      name: view.name,
      kind: "saved_view",
      layerId: view.layerId,
      fields: rankFieldsForPrompt(input.prompt, layerFields(fields), limits.fields),
    };
  });

  const combined = rankSourcesForPrompt(
    input.prompt,
    [...layers, ...datasets, ...savedViews],
    limits.sources,
  );

  return {
    mode,
    layers: combined.filter((source) => source.kind === "layer"),
    datasets: combined.filter((source) => source.kind === "dataset"),
    savedViews: combined.filter((source) => source.kind === "saved_view"),
    ...(input.dataProfiles?.length
      ? {
          dataProfiles: input.dataProfiles.filter((profile) =>
            combined.some(
              (source) =>
                source.id === profile.sourceId && source.kind === profile.sourceKind,
            ),
          ),
        }
      : {}),
  };
}

export function summarizeDashboardAiGroundingContext(
  context?: DashboardAiGroundingContext,
) {
  if (!context || context.mode === "intentOnly") return "";
  return JSON.stringify(
    {
      mode: context.mode,
      layers: context.layers.map((layer) => ({
        id: layer.id,
        code: layer.code,
        name: layer.name,
        geometryType: layer.geometryType,
        fields: layer.fields,
      })),
      datasets: context.datasets.map((dataset) => ({
        id: dataset.id,
        code: dataset.code,
        name: dataset.name,
        fields: dataset.fields,
      })),
      savedViews: context.savedViews.map((view) => ({
        id: view.id,
        name: view.name,
        layerId: view.layerId,
        fields: view.fields,
      })),
      dataProfiles: context.dataProfiles,
    },
    null,
    2,
  );
}
