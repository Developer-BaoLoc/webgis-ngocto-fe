import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from "@/types/gis.types";
import type { Layer } from "@/types/layer.types";
import { getFieldLabel } from "@/lib/fields/field-label";

export type LayerFilterFieldType =
  | "text"
  | "category"
  | "boolean"
  | "number"
  | "currency"
  | "date";

export interface FieldFilterCondition {
  type: LayerFilterFieldType;
  values?: string[];
  booleanValue?: boolean | null;
  min?: number | null;
  max?: number | null;
  from?: string | null;
  to?: string | null;
}

export interface LayerFilterState {
  fieldFilters: Record<string, FieldFilterCondition>;
  searchText: string;
}

export type LayerFilters = Record<string, LayerFilterState>;

export interface LayerFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface LayerFilterField {
  key: string;
  label: string;
  type: LayerFilterFieldType;
  options: LayerFilterOption[];
  min?: number;
  max?: number;
  uniqueCount: number;
}

type MetadataField = {
  key: string;
  label?: string;
  name?: string;
  displayName?: string;
  type?: string;
};

const MAX_QUICK_FILTER_OPTIONS = 30;

const BLOCKED_KEYS = new Set([
  "id",
  "uuid",
  "geom",
  "geometry",
  "created_at",
  "updated_at",
  "deleted_at",
  "tenant_id",
  "layer_id",
  "source_id",
  "attachment_id",
  "import_id",
  "record_id",
  "feature_id",
  "location_status",
  "location_source",
  "coordinates",
  "toa_do",
  "recordid",
  "layerid",
  "popupsummary",
]);

const BLOCKED_KEY_PARTS = ["attachment", "file", "image", "icon"];
const MONEY_FIELD_PARTS = [
  "chi_phi",
  "thu_nhap",
  "loi_nhuan",
  "revenue",
  "cost",
  "profit",
];
const SEARCH_PRIORITY_FIELDS = [
  "ten",
  "name",
  "nguoi_dai_dien",
  "representative",
  "dia_chi",
  "address",
  "nganh_nghe",
  "business_type",
  "khu_vuc",
  "region",
];
const PRIORITY_FILTER_FIELDS = [
  "status",
  "trang_thai",
  "khu_vuc",
  "region",
  "loai_tom",
  "loai_hinh_nuoi",
  "hinh_thuc_nuoi",
  "loai_hinh_canh_tac",
  "loai_hinh_san_xuat",
  "loai_cay_trong",
  "loai_cay",
  "business_type",
  "nganh_nghe",
  "loai",
];

export const EMPTY_LAYER_FILTER: LayerFilterState = {
  fieldFilters: {},
  searchText: "",
};

export function normalizeFieldKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim()
    .replace(/^_+|_+$/g, "")
    .replace(/[^a-z0-9]+/g, "_");
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .replace(/đ/g, "d")
    .trim();
}

function isBlockedField(key: string) {
  if (key.startsWith("_")) return true;
  const normalized = normalizeFieldKey(key);
  return (
    BLOCKED_KEYS.has(normalized) ||
    BLOCKED_KEY_PARTS.some((part) => normalized.includes(part))
  );
}

function readMetadataFields(layer: Layer): MetadataField[] {
  const record = layer as unknown as Record<string, unknown>;
  const style = layer.style as Record<string, unknown> | undefined;
  const metadata = style?.metadata as Record<string, unknown> | undefined;
  const schema = (record.schema ?? style?.schema ?? metadata?.schema) as
    | Record<string, unknown>
    | undefined;
  const rawFields = [
    record.fields,
    style?.fields,
    metadata?.fields,
    schema?.fields,
  ].find(Array.isArray);
  if (!Array.isArray(rawFields)) return [];

  return rawFields.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const field = item as Record<string, unknown>;
    const key = field.code ?? field.key ?? field.fieldCode ?? field.storageKey;
    if (typeof key !== "string") return [];
    return [
      {
        key,
        label: typeof field.label === "string" ? field.label : undefined,
        name: typeof field.name === "string" ? field.name : undefined,
        displayName:
          typeof field.displayName === "string" ? field.displayName : undefined,
        type:
          typeof field.fieldType === "string"
            ? field.fieldType
            : typeof field.type === "string"
              ? field.type
              : undefined,
      },
    ];
  });
}

function scalarValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(scalarValues);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [value];
  }
  return [];
}

export function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value !== "string") return null;
  const normalized = normalizeSearchValue(value);
  if (["true", "1", "yes", "co", "có"].includes(normalized)) return true;
  if (["false", "0", "no", "khong", "không"].includes(normalized)) {
    return false;
  }
  return null;
}

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const numericCandidate = value
    .trim()
    .replace(/vnd/gi, "")
    .replace(/[$€£₫đ]/gi, "")
    .replace(/\s/g, "");
  if (!/^-?[0-9.,]+$/.test(numericCandidate)) return null;
  let normalized = numericCandidate;
  if (!normalized) return null;
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    if (comma > dot)
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    else normalized = normalized.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized =
      decimals > 0 && decimals <= 2
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if ((normalized.match(/\./g) ?? []).length > 1) {
    normalized = normalized.replace(/\./g, "");
  } else if (dot >= 0 && normalized.length - dot - 1 === 3) {
    normalized = normalized.replace(".", "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateKey(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const vietnameseDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const normalized = vietnameseDate
    ? `${vietnameseDate[3]}-${vietnameseDate[2].padStart(2, "0")}-${vietnameseDate[1].padStart(2, "0")}`
    : trimmed;
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function metadataFieldType(
  type: string | undefined,
): LayerFilterFieldType | null {
  if (!type) return null;
  const normalized = normalizeFieldKey(type);
  if (["boolean", "bool"].includes(normalized)) return "boolean";
  if (
    ["integer", "number", "decimal", "measurement", "quantity"].includes(
      normalized,
    )
  ) {
    return "number";
  }
  if (["currency", "money"].includes(normalized)) return "currency";
  if (["date", "datetime", "timestamp"].includes(normalized)) return "date";
  if (["select", "enum", "category", "multi_category"].includes(normalized)) {
    return "category";
  }
  if (["text", "string", "textarea"].includes(normalized)) return "text";
  return null;
}

export function inferFieldType(
  fieldKey: string,
  values: unknown[],
  metadata?: MetadataField,
): LayerFilterFieldType {
  const declared = metadataFieldType(metadata?.type);
  if (declared) return declared;
  const present = values.filter(
    (value) => value !== null && value !== undefined && value !== "",
  );
  if (
    present.length &&
    present.every((value) => normalizeBoolean(value) !== null)
  ) {
    return "boolean";
  }
  const normalizedKey = normalizeFieldKey(fieldKey);
  const looksLikeMoney =
    MONEY_FIELD_PARTS.some((part) => normalizedKey.includes(part)) ||
    present.some(
      (value) => typeof value === "string" && /[$€£₫đ]|vnd/i.test(value),
    );
  if (
    present.length &&
    present.every((value) => parseNumericValue(value) !== null)
  ) {
    return looksLikeMoney ? "currency" : "number";
  }
  if (
    present.length &&
    present.every(
      (value) =>
        typeof value === "string" &&
        /[-/T]/.test(value) &&
        parseDateKey(value) !== null,
    )
  ) {
    return "date";
  }
  const unique = new Set(present.map((value) => String(value).trim())).size;
  return unique <= MAX_QUICK_FILTER_OPTIONS ? "category" : "text";
}

function canonicalOptionValue(value: unknown, type: LayerFilterFieldType) {
  if (type === "boolean") {
    const parsed = normalizeBoolean(value);
    return parsed === null ? null : String(parsed);
  }
  if (type === "number" || type === "currency") {
    const parsed = parseNumericValue(value);
    return parsed === null ? null : String(parsed);
  }
  if (type === "date") return parseDateKey(value);
  const text = String(value).trim();
  return text || null;
}

function optionLabel(value: string, type: LayerFilterFieldType) {
  if (type === "boolean") return value === "true" ? "Có" : "Không";
  return value;
}

export function getLayerFilterFields(
  entry: LayerGeoJsonEntry | undefined,
): LayerFilterField[] {
  if (!entry) return [];
  const metadata = readMetadataFields(entry.layer);
  const metadataMap = new Map(metadata.map((field) => [field.key, field]));
  const keys = new Set<string>(metadata.map((field) => field.key));
  for (const feature of entry.geojson.features) {
    Object.keys(feature.properties ?? {}).forEach((key) => keys.add(key));
  }

  const fields: LayerFilterField[] = [];
  for (const key of keys) {
    if (isBlockedField(key)) continue;
    const rawValues: unknown[] = [];
    let hasComplexValue = false;
    for (const feature of entry.geojson.features) {
      const raw = feature.properties?.[key];
      if (
        raw !== null &&
        raw !== undefined &&
        typeof raw === "object" &&
        !Array.isArray(raw)
      ) {
        hasComplexValue = true;
        break;
      }
      rawValues.push(...scalarValues(raw));
    }
    if (hasComplexValue || rawValues.length === 0) continue;

    const meta = metadataMap.get(key);
    if (meta?.type && !metadataFieldType(meta.type)) continue;
    const type = inferFieldType(key, rawValues, meta);
    const counts = new Map<string, number>();
    for (const raw of rawValues) {
      const value = canonicalOptionValue(raw, type);
      if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    if (counts.size === 0) continue;
    const numericValues =
      type === "number" || type === "currency"
        ? [...counts.keys()].map(Number).filter(Number.isFinite)
        : [];
    fields.push({
      key,
      label: getFieldLabel(key, meta),
      type,
      uniqueCount: counts.size,
      options: [...counts.entries()]
        .map(([value, count]) => ({
          value,
          label: optionLabel(value, type),
          count,
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, "vi", { numeric: true }),
        ),
      ...(numericValues.length
        ? { min: Math.min(...numericValues), max: Math.max(...numericValues) }
        : {}),
    });
  }
  return fields.sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function priorityIndex(field: LayerFilterField) {
  const key = normalizeFieldKey(field.key);
  const label = normalizeFieldKey(field.label);
  const index = PRIORITY_FILTER_FIELDS.findIndex(
    (name) => key === name || label === name || key.includes(name),
  );
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

export function getSuggestedFilterFields(
  fields: LayerFilterField[],
  limit = 3,
) {
  return [...fields]
    .filter(
      (field) =>
        (field.type === "category" || field.type === "boolean") &&
        field.uniqueCount <= MAX_QUICK_FILTER_OPTIONS,
    )
    .sort((a, b) => {
      const priority = priorityIndex(a) - priorityIndex(b);
      if (priority !== 0) return priority;
      const distinct = b.options.length - a.options.length;
      if (distinct !== 0) return distinct;
      return a.label.localeCompare(b.label, "vi");
    })
    .slice(0, limit);
}

export function emptyFieldFilter(
  field: LayerFilterField,
): FieldFilterCondition {
  if (field.type === "boolean") return { type: field.type, booleanValue: null };
  if (field.type === "number" || field.type === "currency") {
    return { type: field.type, min: null, max: null };
  }
  if (field.type === "date") return { type: field.type, from: null, to: null };
  return { type: field.type, values: [] };
}

export function isFieldFilterActive(filter: FieldFilterCondition | undefined) {
  if (!filter) return false;
  if (filter.type === "boolean")
    return filter.booleanValue !== null && filter.booleanValue !== undefined;
  if (filter.type === "number" || filter.type === "currency") {
    return (
      (filter.min !== null && filter.min !== undefined) ||
      (filter.max !== null && filter.max !== undefined)
    );
  }
  if (filter.type === "date") return Boolean(filter.from || filter.to);
  return Boolean(filter.values?.length);
}

function featureMatchesSearch(feature: GeoJsonFeature, searchText: string) {
  const query = normalizeSearchValue(searchText);
  if (!query) return true;
  const properties = feature.properties ?? {};
  const keys = Object.keys(properties).filter((key) => !isBlockedField(key));
  const priorityKeys = keys.filter((key) =>
    SEARCH_PRIORITY_FIELDS.includes(normalizeFieldKey(key)),
  );
  const searchableKeys = priorityKeys.length ? priorityKeys : keys;
  return searchableKeys.some((key) =>
    scalarValues(properties[key]).some((value) =>
      normalizeSearchValue(String(value)).includes(query),
    ),
  );
}

function featureMatchesFieldFilter(
  rawValue: unknown,
  filter: FieldFilterCondition,
) {
  if (!isFieldFilterActive(filter)) return true;
  const values = scalarValues(rawValue);
  if (filter.type === "boolean") {
    return values.some(
      (value) => normalizeBoolean(value) === filter.booleanValue,
    );
  }
  if (filter.type === "number" || filter.type === "currency") {
    return values.some((value) => {
      const parsed = parseNumericValue(value);
      if (parsed === null) return false;
      if (
        filter.min !== null &&
        filter.min !== undefined &&
        parsed < filter.min
      )
        return false;
      if (
        filter.max !== null &&
        filter.max !== undefined &&
        parsed > filter.max
      )
        return false;
      return true;
    });
  }
  if (filter.type === "date") {
    return values.some((value) => {
      const parsed = parseDateKey(value);
      if (!parsed) return false;
      if (filter.from && parsed < filter.from) return false;
      if (filter.to && parsed > filter.to) return false;
      return true;
    });
  }
  const selected = new Set(filter.values ?? []);
  return values.some((value) => {
    const normalized = canonicalOptionValue(value, filter.type);
    return normalized !== null && selected.has(normalized);
  });
}

export function applyLayerFilters(
  feature: GeoJsonFeature,
  layerFilter: LayerFilterState | undefined,
) {
  if (!layerFilter) return true;
  if (!featureMatchesSearch(feature, layerFilter.searchText)) return false;
  return Object.entries(layerFilter.fieldFilters).every(([key, filter]) =>
    featureMatchesFieldFilter(feature.properties?.[key], filter),
  );
}

export function filterFeatureCollection(
  geojson: GeoJsonFeatureCollection,
  layerFilter: LayerFilterState | undefined,
): GeoJsonFeatureCollection {
  if (
    !layerFilter ||
    (!layerFilter.searchText.trim() &&
      countActiveFieldFilters(layerFilter) === 0)
  ) {
    return geojson;
  }
  return {
    ...geojson,
    features: geojson.features.filter((feature) =>
      applyLayerFilters(feature, layerFilter),
    ),
  };
}

export function applyLayerFiltersToEntries(
  entries: LayerGeoJsonEntry[],
  layerFilters: LayerFilters,
): LayerGeoJsonEntry[] {
  return entries.map((entry) => ({
    ...entry,
    geojson: filterFeatureCollection(
      entry.geojson,
      layerFilters[entry.layer.id],
    ),
  }));
}

export function countActiveFieldFilters(filter: LayerFilterState | undefined) {
  return Object.values(filter?.fieldFilters ?? {}).filter(isFieldFilterActive)
    .length;
}

export function countActiveLayerFilters(filter: LayerFilterState | undefined) {
  return countActiveFieldFilters(filter) + (filter?.searchText.trim() ? 1 : 0);
}
