import type { Dictionary, DictionaryItem } from "@/types/api/dictionary";

/** BE trả `items` hoặc `values` — chuẩn hóa về một mảng */
export function getDictionaryValues(
  dictionary: Pick<Dictionary, "items" | "values">,
): DictionaryItem[] {
  return dictionary.items ?? dictionary.values ?? [];
}

export function parseValueLabels(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function cleanDictionaryText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeDictionaryName(value: string): string {
  return cleanDictionaryText(value).normalize("NFC").toLocaleLowerCase("vi-VN");
}

export function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const trimmed = cleanDictionaryText(label);
    if (!trimmed) continue;
    const key = normalizeDictionaryName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
