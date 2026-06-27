import { isNumericField } from "@/lib/fields/field-types";
import type {
  DataSourceField,
  DataSourceLayer,
} from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import type {
  DashboardTemplate,
  DashboardTemplatePlaceholder,
} from "./types";
import {
  collectTemplatePlaceholders,
  type DashboardTemplatePlaceholderValues,
} from "./apply-template";

export type TemplateMappingStatus = "auto" | "manual" | "suggested" | "missing";

export interface TemplateMappingState {
  status: TemplateMappingStatus;
  suggestion?: string;
  score?: number;
}

export interface TemplateAutoMappingResult {
  values: DashboardTemplatePlaceholderValues;
  states: Record<string, TemplateMappingState>;
}

type SourceCandidate = {
  id: string;
  label: string;
  searchText: string;
  geometryType?: string | null;
};

const KEYWORDS: Record<string, string[]> = {
  aquaculture_layer: ["aquaculture", "thuy san", "thủy sản", "nuoi tom", "nuôi tôm", "vung nuoi", "vùng nuôi"],
  rice_layer: ["rice", "lua", "lúa", "vung lua", "vùng lúa"],
  crop_layer: ["crop", "hoa mau", "hoa màu", "cay trong", "cây trồng", "rau mau"],
  irrigation_layer: ["irrigation", "thuy loi", "thủy lợi", "kenh", "kênh", "cong trinh", "công trình"],
  alert_layer: ["alert", "canh bao", "cảnh báo", "phan anh", "phản ánh", "su co", "sự cố"],
  zone_layer: ["zone", "ap", "ấp", "xa", "xã", "khu vuc", "khu vực", "hanh chinh", "hành chính"],
  ocop_layer: ["ocop"],
  facility_layer: ["ocop", "co so", "cơ sở", "chu the", "chủ thể"],
  product_layer: ["ocop", "san pham", "sản phẩm"],
  social_layer: ["social", "xa hoi", "xã hội"],
  area_field: ["dien tich", "diện tích", "area", "ha", "geometry_area"],
  length_field: ["chieu dai", "chiều dài", "length", "km"],
  profit_field: ["loi nhuan", "lợi nhuận", "profit", "income"],
  profit_per_ha_field: ["loi nhuan", "lợi nhuận", "profit", "ha"],
  production_field: ["san luong", "sản lượng", "production", "yield"],
  revenue_field: ["doanh thu", "revenue"],
  cost_field: ["chi phi", "chi phí", "cost"],
  metric_field: ["gia tri", "giá trị", "value", "tong", "tổng"],
  farming_type_field: ["loai hinh", "loại hình", "doi tuong nuoi", "đối tượng nuôi", "type"],
  cultivation_type_field: ["loai hinh", "loại hình", "canh tac", "canh tác"],
  crop_type_field: ["loai cay", "loại cây", "cay trong", "cây trồng", "type"],
  type_field: ["loai", "loại", "nhom", "nhóm", "type"],
  status_field: ["trang thai", "trạng thái", "tinh trang", "tình trạng", "status"],
  condition_field: ["tinh trang", "tình trạng", "trang thai", "trạng thái", "condition"],
  severity_field: ["muc do", "mức độ", "cap do", "cấp độ", "severity"],
  alert_severity_field: ["muc do", "mức độ", "cap do", "cấp độ", "severity"],
  alert_status_field: ["trang thai", "trạng thái", "tinh trang", "tình trạng", "status"],
  alert_title_field: ["tieu de", "tiêu đề", "noi dung", "nội dung", "title"],
  alert_area_field: ["khu vuc", "khu vực", "dia ban", "địa bàn", "area"],
  alert_date_field: ["ngay", "ngày", "thoi gian", "thời gian", "date", "created"],
  date_field: ["ngay", "ngày", "thoi gian", "thời gian", "date"],
  season_date_field: ["mua vu", "mùa vụ", "ngay", "ngày", "thoi gian", "thời gian"],
  name_field: ["ten", "tên", "name", "title", "ten vung", "tên vùng", "ten vung lua", "tên vùng lúa"],
  zone_label_field: ["ten ap", "tên ấp", "ten xa", "tên xã", "ten khu vuc", "tên khu vực", "ten vung", "tên vùng", "name"],
  facility_name_field: ["ten co so", "tên cơ sở", "co so", "cơ sở", "name"],
  product_name_field: ["ten san pham", "tên sản phẩm", "san pham", "sản phẩm", "name"],
  product_type_field: ["nhom san pham", "nhóm sản phẩm", "loai san pham", "loại sản phẩm", "type"],
  rating_field: ["xep hang", "xếp hạng", "sao", "rating", "hang"],
};

const GROUPABLE_TYPES = new Set([
  "char",
  "varchar",
  "text",
  "string",
  "textarea",
  "select",
  "enum",
  "dictionary",
  "category",
  "multi_category",
  "relation",
  "relationship",
  "lookup",
  "boolean",
]);

const DATE_TYPES = new Set(["date", "datetime", "timestamp"]);
const STATUS_TYPES = new Set([
  "char",
  "varchar",
  "text",
  "string",
  "select",
  "enum",
  "dictionary",
  "category",
  "multi_category",
  "boolean",
]);
const FIELD_TYPE_ALIASES: Record<string, string[]> = {
  text: ["text", "string", "varchar", "char", "textarea"],
  string: ["text", "string", "varchar", "char", "textarea"],
  varchar: ["text", "string", "varchar", "char", "textarea"],
  char: ["text", "string", "varchar", "char", "textarea"],
  select: ["select", "enum", "dictionary", "category", "lookup"],
  enum: ["select", "enum", "dictionary", "category", "lookup"],
  category: ["select", "enum", "dictionary", "category", "lookup"],
  dictionary: ["select", "enum", "dictionary", "category", "lookup"],
};

export function normalizeTemplateMatchText(value: unknown): string {
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

function keywordsForPlaceholder(placeholder: DashboardTemplatePlaceholder) {
  const fromKey = KEYWORDS[placeholder.key] ?? [];
  const normalizedKey = normalizeTemplateMatchText(placeholder.key);
  const normalizedLabel = normalizeTemplateMatchText(placeholder.label);
  return [normalizedKey, normalizedLabel, ...fromKey].filter(Boolean);
}

function scoreText(candidate: string, keywords: string[]) {
  const normalizedCandidate = normalizeTemplateMatchText(candidate);
  let score = 0;
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeTemplateMatchText(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedCandidate === normalizedKeyword) score += 100;
    else if (normalizedCandidate.startsWith(normalizedKeyword)) score += 72;
    else if (normalizedCandidate.includes(normalizedKeyword)) score += 55;
    const words = normalizedKeyword.split(" ");
    if (words.length > 1 && words.every((word) => normalizedCandidate.includes(word))) {
      score += 36;
    }
  }
  return score;
}

function fieldType(field: DataSourceField) {
  return normalizeTemplateMatchText(
    (field as DataSourceField & { type?: string; dataType?: string; columnType?: string; dataSchema?: { type?: string } }).fieldType ??
      (field as DataSourceField & { type?: string }).type ??
      (field as DataSourceField & { dataType?: string }).dataType ??
      (field as DataSourceField & { columnType?: string }).columnType ??
      (field as DataSourceField & { dataSchema?: { type?: string } }).dataSchema?.type,
  );
}

export function isTemplateFieldTypeValid(
  field: DataSourceField,
  placeholder: DashboardTemplatePlaceholder,
) {
  const type = fieldType(field);
  if (placeholder.kind === "metric_field") return isNumericField(field);
  if (placeholder.kind === "dimension_field") return GROUPABLE_TYPES.has(type);
  if (placeholder.kind === "date_field") return DATE_TYPES.has(type);
  if (
    placeholder.key.includes("status") ||
    placeholder.key.includes("severity") ||
    placeholder.key.includes("condition")
  ) {
    return STATUS_TYPES.has(type);
  }
  if (placeholder.fieldTypes?.some((item) => isNumericField(item))) {
    return isNumericField(field);
  }
  if (placeholder.fieldTypes?.length) {
    return placeholder.fieldTypes
      .map(normalizeTemplateMatchText)
      .some((item) => {
        const aliases = FIELD_TYPE_ALIASES[item] ?? [item];
        return aliases.includes(type);
      });
  }
  return true;
}

export type TemplatePlaceholderSourceResolution =
  | {
      status: "resolved";
      sourceType: "layer" | "dataset" | "saved_view";
      sourceId: string;
      sourceName: string;
      layerId?: string;
    }
  | {
      status: "missing_source";
      sourceKey?: string;
    }
  | {
      status: "ambiguous_source";
      sourceKeys: string[];
    };

function isSourcePlaceholder(placeholder: DashboardTemplatePlaceholder) {
  return (
    placeholder.kind === "layer" ||
    placeholder.kind === "zone_layer" ||
    placeholder.kind === "dataset" ||
    placeholder.kind === "saved_view"
  );
}

export function getPlaceholderSource(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[] = [],
): TemplatePlaceholderSourceResolution {
  const candidateSourceKeys = placeholder.sourceKey
    ? [placeholder.sourceKey]
    : allPlaceholders.filter(isSourcePlaceholder).map((item) => item.key);

  const selected = candidateSourceKeys
    .map((key) => ({ key, value: values[key] }))
    .filter((item) => Boolean(item.value));

  if (!placeholder.sourceKey && selected.length !== 1) {
    return selected.length === 0
      ? { status: "missing_source", sourceKey: undefined }
      : {
          status: "ambiguous_source",
          sourceKeys: selected.map((item) => item.key),
        };
  }

  const sourceKey = placeholder.sourceKey ?? selected[0]?.key;
  const sourceValue = sourceKey ? values[sourceKey] : undefined;
  if (!sourceValue) return { status: "missing_source", sourceKey };

  const dataset = datasets.find((item) => item.id === sourceValue);
  if (dataset) {
    return {
      status: "resolved",
      sourceType: "dataset",
      sourceId: dataset.id,
      sourceName: dataset.name,
    };
  }

  const savedView = savedViews.find((view) => view.id === sourceValue);
  if (savedView) {
    return {
      status: "resolved",
      sourceType: "saved_view",
      sourceId: savedView.id,
      sourceName: savedView.name,
      layerId: savedView.layerId,
    };
  }

  const layer = dataSources.find((source) => source.layerId === sourceValue);
  if (layer) {
    return {
      status: "resolved",
      sourceType: "layer",
      sourceId: layer.layerId,
      sourceName: layer.layerName,
      layerId: layer.layerId,
    };
  }

  return { status: "missing_source", sourceKey };
}

function sourceSearchText(source: SourceCandidate) {
  return source.searchText;
}

function layerToCandidate(layer: DataSourceLayer): SourceCandidate {
  const extra = layer as DataSourceLayer & {
    displayName?: string;
    alias?: string;
    name?: string;
  };
  return {
    id: layer.layerId,
    label: layer.layerName,
    geometryType: layer.geometryType,
    searchText: [
      layer.layerCode,
      layer.layerName,
      extra.displayName,
      extra.alias,
      extra.name,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function datasetToCandidate(dataset: Dataset): SourceCandidate {
  return {
    id: dataset.id,
    label: dataset.name,
    searchText: [dataset.code, dataset.name, dataset.description].filter(Boolean).join(" "),
  };
}

function savedViewToCandidate(view: SavedView): SourceCandidate {
  return {
    id: view.id,
    label: view.name,
    searchText: [view.name, view.description, view.layerName].filter(Boolean).join(" "),
  };
}

function geometryMatches(
  candidate: SourceCandidate,
  geometryType?: DashboardTemplatePlaceholder["geometryType"],
) {
  if (!geometryType || geometryType === "any") return true;
  const current = normalizeTemplateMatchText(candidate.geometryType);
  if (geometryType === "polygon") return current.includes("polygon") || current.includes("area");
  return current.includes(geometryType);
}

export function getSourceAutoCandidates(
  placeholder: DashboardTemplatePlaceholder,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
) {
  const keywords = keywordsForPlaceholder(placeholder);
  let candidates: SourceCandidate[] = [];
  if (placeholder.kind === "dataset") candidates = datasets.map(datasetToCandidate);
  if (placeholder.kind === "saved_view") candidates = savedViews.map(savedViewToCandidate);
  if (placeholder.kind === "layer" || placeholder.kind === "zone_layer") {
    candidates = dataSources.map(layerToCandidate).filter((item) => geometryMatches(item, placeholder.geometryType));
  }
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreText(sourceSearchText(candidate), keywords),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function getFieldAutoCandidates(
  placeholder: DashboardTemplatePlaceholder,
  fields: DataSourceField[],
) {
  const keywords = keywordsForPlaceholder(placeholder);
  const validFields = fields.filter((field) =>
    isTemplateFieldTypeValid(field, placeholder),
  );
  const pool = validFields.length > 0 ? validFields : fields;
  const penalty = validFields.length > 0 ? 0 : 35;
  return pool
    .map((field) => {
      const extra = field as DataSourceField & {
        alias?: string;
        name?: string;
        displayName?: string;
      };
      const searchText = [
        field.code,
        field.label,
        extra.alias,
        extra.name,
        extra.displayName,
      ]
        .filter(Boolean)
        .join(" ");
      return {
        id: field.code,
        label: field.label,
        score: Math.max(1, scoreText(searchText, keywords) - penalty),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function getSourceFieldsForTemplatePlaceholder(
  placeholder: DashboardTemplatePlaceholder,
  values: DashboardTemplatePlaceholderValues,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
  allPlaceholders: DashboardTemplatePlaceholder[] = [],
) {
  const source = getPlaceholderSource(
    placeholder,
    values,
    dataSources,
    savedViews,
    datasets,
    allPlaceholders,
  );
  if (source.status !== "resolved") return [];

  const dataset =
    source.sourceType === "dataset"
      ? datasets.find((item) => item.id === source.sourceId)
      : undefined;
  if (dataset) {
    return dataset.config.fields.map<DataSourceField>((field) => ({
      code: field.key,
      label: field.label,
      fieldType: field.type,
    }));
  }

  const savedView =
    source.sourceType === "saved_view"
      ? savedViews.find((view) => view.id === source.sourceId)
      : undefined;
  const savedViewFields = (savedView as SavedView & {
    fields?: DataSourceField[];
  } | undefined)?.fields;
  if (savedViewFields?.length) return savedViewFields;

  const layerId = savedView?.layerId ?? source.layerId;
  const layerFields = dataSources.find((source) => source.layerId === layerId)?.fields ?? [];
  if (savedView?.config.visibleFields?.length) {
    const visible = new Set(savedView.config.visibleFields);
    return layerFields.filter((field) => visible.has(field.code));
  }
  return layerFields;
}

export function buildTemplateAutoMapping(
  template: DashboardTemplate,
  dataSources: DataSourceLayer[],
  savedViews: SavedView[],
  datasets: Dataset[],
): TemplateAutoMappingResult {
  const values: DashboardTemplatePlaceholderValues = {};
  const states: Record<string, TemplateMappingState> = {};
  const placeholders = collectTemplatePlaceholders(template);
  const sourcePlaceholders = placeholders.filter(
    (placeholder) =>
      placeholder.kind === "layer" ||
      placeholder.kind === "zone_layer" ||
      placeholder.kind === "dataset" ||
      placeholder.kind === "saved_view",
  );

  for (const placeholder of sourcePlaceholders) {
    const candidates = getSourceAutoCandidates(placeholder, dataSources, savedViews, datasets);
    if (candidates.length === 1 || (candidates[0] && candidates[0].score >= 80 && candidates[0].score > (candidates[1]?.score ?? 0) + 15)) {
      values[placeholder.key] = candidates[0].id;
      states[placeholder.key] = { status: "auto", score: candidates[0].score };
    } else if (candidates[0]) {
      states[placeholder.key] = {
        status: "suggested",
        suggestion: candidates[0].id,
        score: candidates[0].score,
      };
    } else {
      states[placeholder.key] = { status: "missing" };
    }
  }

  for (const placeholder of placeholders.filter((item) => item.sourceKey)) {
    const fields = getSourceFieldsForTemplatePlaceholder(
      placeholder,
      values,
      dataSources,
      savedViews,
      datasets,
    );
    const candidates = getFieldAutoCandidates(placeholder, fields);
    if (candidates.length === 1 || (candidates[0] && candidates[0].score >= 80 && candidates[0].score > (candidates[1]?.score ?? 0) + 15)) {
      values[placeholder.key] = candidates[0].id;
      states[placeholder.key] = { status: "auto", score: candidates[0].score };
    } else if (candidates[0]) {
      states[placeholder.key] = {
        status: "suggested",
        suggestion: candidates[0].id,
        score: candidates[0].score,
      };
    } else {
      states[placeholder.key] = { status: "missing" };
    }
  }

  return { values, states };
}
