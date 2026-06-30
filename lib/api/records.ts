import { apiFetch } from "./client";
import { unwrapData, type ApiMeta, type ApiResponse } from "@/types/api/common";
import type { RecordItem, RecordsQuery, CreateRecordPayload, UpdateRecordPayload, RecordDisplayData } from "@/types/api/records";

export interface RecordsListResult {
  records: RecordItem[];
  meta: ApiMeta;
}

const DEFAULT_ALL_RECORDS_LIMIT = 1000;

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

export async function getAllLayerRecords(
  layerId: string,
  query: Omit<RecordsQuery, "page" | "pageSize"> = {},
  options: { maxRecords?: number } = {},
): Promise<RecordItem[]> {
  const pageSize = 200;
  const maxRecords = options.maxRecords ?? DEFAULT_ALL_RECORDS_LIMIT;
  const first = await getLayerRecords(layerId, { ...query, page: 1, pageSize });
  const total = first.meta.total ?? first.records.length;
  const totalPages = first.meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const safePages = Math.min(totalPages, Math.ceil(maxRecords / pageSize));
  const records = [...first.records];
  for (let page = 2; page <= safePages; page += 1) {
    const next = await getLayerRecords(layerId, { ...query, page, pageSize });
    records.push(...next.records);
  }
  return records.slice(0, maxRecords);
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
