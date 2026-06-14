import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  AdminLayer,
  CreateLayerPayload,
  DeleteLayerResult,
  UpdateLayerPayload,
} from "@/types/api/admin";

export async function getAdminLayers(): Promise<AdminLayer[]> {
  const res = await apiFetch<ApiResponse<AdminLayer[]>>("/layers/admin");
  return unwrapData(res);
}

export async function createLayer(
  payload: CreateLayerPayload,
): Promise<AdminLayer> {
  const res = await apiFetch<ApiResponse<AdminLayer>>("/layers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function updateLayer(
  layerId: string,
  payload: UpdateLayerPayload,
): Promise<AdminLayer> {
  const res = await apiFetch<ApiResponse<AdminLayer>>(`/layers/${layerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function deleteLayer(layerId: string): Promise<DeleteLayerResult> {
  const res = await apiFetch<ApiResponse<DeleteLayerResult>>(
    `/layers/${layerId}`,
    { method: "DELETE" },
  );
  return unwrapData(res);
}

export async function getLayerById(layerId: string): Promise<AdminLayer> {
  const res = await apiFetch<ApiResponse<AdminLayer>>(`/layers/${layerId}`);
  return unwrapData(res);
}
