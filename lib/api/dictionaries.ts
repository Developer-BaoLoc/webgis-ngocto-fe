import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type { Dictionary, DictionaryItem } from "@/types/api/dictionary";

export async function getDictionaries(): Promise<Dictionary[]> {
  const res = await apiFetch<ApiResponse<Dictionary[]>>("/dictionaries");
  return unwrapData(res);
}

export async function getDictionaryItems(
  code: string,
): Promise<DictionaryItem[]> {
  const res = await apiFetch<ApiResponse<DictionaryItem[]>>(
    `/dictionaries/${code}/items`,
  );
  return unwrapData(res);
}
