import { apiFetch } from "./client";
import { unwrapData, type ApiMeta, type ApiResponse } from "@/types/api/common";
import type { RecordItem, RecordsQuery, CreateRecordPayload, UpdateRecordPayload, RecordDisplayData } from "@/types/api/records";

export interface RecordsListResult {
  records: RecordItem[];
  meta: ApiMeta;
}

export async function getLayerRecords(
  layerId: string,
  query: RecordsQuery = {},
): Promise<RecordsListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  if (query.q) params.set("q", query.q);

  const qs = params.toString();
  const path = `/layers/${layerId}/records${qs ? `?${qs}` : ""}`;

  const res = await apiFetch<ApiResponse<RecordItem[]>>(path);
  return {
    records: unwrapData(res),
    meta: res.meta ?? {},
  };
}

export async function getRecord(
  layerId: string,
  recordId: string,
): Promise<RecordItem> {
  const res = await apiFetch<ApiResponse<RecordItem>>(
    `/layers/${layerId}/records/${recordId}`,
  );
  return unwrapData(res);
}

export async function createRecord(
  layerId: string,
  payload: CreateRecordPayload,
): Promise<RecordItem> {
  const res = await apiFetch<ApiResponse<RecordItem>>(
    `/layers/${layerId}/records`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function updateRecord(
  layerId: string,
  recordId: string,
  payload: UpdateRecordPayload,
): Promise<RecordItem> {
  const res = await apiFetch<ApiResponse<RecordItem>>(
    `/layers/${layerId}/records/${recordId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function getRecordDisplay(
  layerId: string,
  recordId: string,
): Promise<RecordDisplayData> {
  const res = await apiFetch<ApiResponse<RecordDisplayData>>(
    `/layers/${layerId}/records/${recordId}/display`,
    { token: null },
  );
  return unwrapData(res);
}

export async function deleteRecord(
  layerId: string,
  recordId: string,
): Promise<void> {
  await apiFetch(`/layers/${layerId}/records/${recordId}`, {
    method: "DELETE",
  });
}
