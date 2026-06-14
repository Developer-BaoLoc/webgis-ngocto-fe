import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  BatchCreateDictionaryItemsPayload,
  CreateDictionaryItemPayload,
  CreateDictionaryPayload,
  Dictionary,
  DictionaryItem,
  UpdateDictionaryItemPayload,
  UpdateDictionaryPayload,
} from "@/types/api/dictionary";
import { getDictionaryValues } from "@/lib/dictionaries/utils";

export async function getDictionaries(): Promise<Dictionary[]> {
  const res = await apiFetch<ApiResponse<Dictionary[]>>("/dictionaries");
  return unwrapData(res);
}

export async function getDictionary(
  code: string,
  options?: { includeItems?: boolean },
): Promise<Dictionary> {
  const query = options?.includeItems ? "?includeItems=true" : "";
  const res = await apiFetch<ApiResponse<Dictionary>>(
    `/dictionaries/${code}${query}`,
  );
  const data = unwrapData(res);
  return {
    ...data,
    items: getDictionaryValues(data),
  };
}

export async function createDictionary(
  payload: CreateDictionaryPayload,
): Promise<Dictionary> {
  const res = await apiFetch<ApiResponse<Dictionary>>("/dictionaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function updateDictionary(
  code: string,
  payload: UpdateDictionaryPayload,
): Promise<Dictionary> {
  const res = await apiFetch<ApiResponse<Dictionary>>(`/dictionaries/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function deleteDictionary(code: string): Promise<void> {
  await apiFetch(`/dictionaries/${code}`, { method: "DELETE" });
}

export async function getDictionaryItems(
  code: string,
): Promise<DictionaryItem[]> {
  const res = await apiFetch<ApiResponse<DictionaryItem[]>>(
    `/dictionaries/${code}/items`,
  );
  return unwrapData(res);
}

export async function createDictionaryItem(
  code: string,
  payload: CreateDictionaryItemPayload,
): Promise<DictionaryItem> {
  const res = await apiFetch<ApiResponse<DictionaryItem>>(
    `/dictionaries/${code}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function createDictionaryItemsBatch(
  code: string,
  payload: BatchCreateDictionaryItemsPayload,
): Promise<DictionaryItem[]> {
  const res = await apiFetch<ApiResponse<DictionaryItem[]>>(
    `/dictionaries/${code}/items/batch`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function updateDictionaryItem(
  code: string,
  itemId: string,
  payload: UpdateDictionaryItemPayload,
): Promise<DictionaryItem> {
  const res = await apiFetch<ApiResponse<DictionaryItem>>(
    `/dictionaries/${code}/items/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function deleteDictionaryItem(
  code: string,
  itemId: string,
): Promise<void> {
  await apiFetch(`/dictionaries/${code}/items/${itemId}`, {
    method: "DELETE",
  });
}
