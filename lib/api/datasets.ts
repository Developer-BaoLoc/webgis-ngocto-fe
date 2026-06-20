import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  Dataset,
  DatasetPayload,
  DatasetPreviewResult,
  DatasetUsage,
} from "@/types/api/dataset";

export async function getDatasets(): Promise<Dataset[]> {
  const res = await apiFetch<ApiResponse<Dataset[]>>("/datasets");
  return unwrapData(res);
}

export async function createDataset(payload: DatasetPayload): Promise<Dataset> {
  const res = await apiFetch<ApiResponse<Dataset>>("/datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function updateDataset(
  id: string,
  payload: Partial<DatasetPayload>,
): Promise<Dataset> {
  const res = await apiFetch<ApiResponse<Dataset>>(`/datasets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function previewDataset(
  config: DatasetPayload["config"],
): Promise<DatasetPreviewResult> {
  const res = await apiFetch<ApiResponse<DatasetPreviewResult>>(
    "/datasets/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    },
  );
  return unwrapData(res);
}

export async function duplicateDataset(id: string): Promise<Dataset> {
  const res = await apiFetch<ApiResponse<Dataset>>(
    `/datasets/${id}/duplicate`,
    { method: "POST" },
  );
  return unwrapData(res);
}

export async function getDatasetUsage(id: string): Promise<DatasetUsage> {
  const res = await apiFetch<ApiResponse<DatasetUsage>>(
    `/datasets/${id}/usage`,
  );
  return unwrapData(res);
}

export async function deleteDataset(id: string): Promise<void> {
  await apiFetch(`/datasets/${id}`, { method: "DELETE" });
}
