import { apiFetch } from "./client";
import { unwrapData, type ApiMeta, type ApiResponse } from "@/types/api/common";
import type { RecordItem, RecordsQuery } from "@/types/api/records";

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
