import type { RecordItem } from "@/types/api/records";
import type { SchemaField } from "@/types/api/schema";
import type { DictionaryLabelMap } from "@/lib/dictionaries/labels";
import {
  formatRecordValue,
  getRecordNumericValue,
  type MeasurementUnitMode,
} from "@/lib/records/format-record-value";

export type RecordFilterValue = {
  text?: string;
  min?: string;
  max?: string;
  from?: string;
  to?: string;
  selected?: string;
};

export type RecordFilters = Record<string, RecordFilterValue>;

export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

export function recordMatchesSearch(
  record: RecordItem,
  query: string,
  fields: SchemaField[] = [],
  options?: {
    dictionaryLabels?: DictionaryLabelMap;
    measurementUnitModes?: Record<string, MeasurementUnitMode>;
  },
) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  const fieldValues = fields.length
    ? fields.map((field) =>
        formatRecordValue(record.properties[field.code], field, {
          dictionaryLabels: options?.dictionaryLabels,
          measurementUnitMode: options?.measurementUnitModes?.[field.code],
        }),
      )
    : Object.values(record.properties);
  return normalizeSearchText([record.id, ...fieldValues].join(" ")).includes(normalized);
}

export function recordMatchesFilters(
  record: RecordItem,
  fields: SchemaField[],
  filters: RecordFilters,
  options?: { measurementUnitModes?: Record<string, MeasurementUnitMode> },
) {
  return fields.every((field) => {
    const filter = filters[field.code];
    if (!filter) return true;
    const value = record.properties[field.code];
    const type = field.fieldType.toLowerCase();
    if (filter.text && !normalizeSearchText(value).includes(normalizeSearchText(filter.text))) return false;
    if (filter.selected && String(value ?? "") !== filter.selected) return false;
    if (filter.min || filter.max) {
      const numeric = getRecordNumericValue(
        value,
        field,
        options?.measurementUnitModes?.[field.code],
      );
      if (numeric === null) return false;
      if (filter.min && numeric < Number(filter.min)) return false;
      if (filter.max && numeric > Number(filter.max)) return false;
    }
    if ((filter.from || filter.to) && /date|time/.test(type)) {
      const time = new Date(String(value ?? "")).getTime();
      if (!Number.isFinite(time)) return false;
      if (filter.from && time < new Date(filter.from).getTime()) return false;
      if (filter.to && time > new Date(`${filter.to}T23:59:59`).getTime()) return false;
    }
    return true;
  });
}
