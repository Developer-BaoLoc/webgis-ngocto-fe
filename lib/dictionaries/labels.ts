import { getDictionaryItems } from "@/lib/api/dictionaries";
import type { SchemaField } from "@/types/api/schema";

export type DictionaryLabelMap = Map<string, string>;

function mapKey(dictionaryCode: string, itemCode: string): string {
  return `${dictionaryCode}:${itemCode}`;
}

export async function buildDictionaryLabelMap(
  fields: SchemaField[],
): Promise<DictionaryLabelMap> {
  const map: DictionaryLabelMap = new Map();
  const dictionaryCodes = new Set<string>();

  for (const field of fields) {
    if (field.fieldType !== "category" && field.fieldType !== "multi_category") {
      continue;
    }
    const code = field.dataSchema?.dictionary as string | undefined;
    if (code) dictionaryCodes.add(code);
  }

  await Promise.all(
    Array.from(dictionaryCodes).map(async (dictionaryCode) => {
      try {
        const items = await getDictionaryItems(dictionaryCode);
        for (const item of items) {
          map.set(mapKey(dictionaryCode, item.code), item.label);
        }
      } catch {
        // Bỏ qua nếu không tải được danh mục
      }
    }),
  );

  return map;
}

export function formatDictionaryValue(
  field: Pick<SchemaField, "fieldType" | "dataSchema">,
  value: unknown,
  labelMap: DictionaryLabelMap,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const dictionaryCode = field.dataSchema?.dictionary as string | undefined;
  if (!dictionaryCode) return null;

  if (field.fieldType === "multi_category" && Array.isArray(value)) {
    const labels = (value as string[])
      .map((code) => labelMap.get(mapKey(dictionaryCode, code)) ?? null)
      .filter((label): label is string => Boolean(label));
    return labels.length > 0 ? labels.join(", ") : null;
  }

  if (field.fieldType === "category" && typeof value === "string") {
    return labelMap.get(mapKey(dictionaryCode, value)) ?? null;
  }

  return null;
}
