import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  SavedView,
  SavedViewPayload,
  SavedViewPreviewResult,
  SavedViewUsage,
} from "@/types/api/saved-view";

export async function getSavedViews(layerId?: string): Promise<SavedView[]> {
  const query = layerId ? `?layerId=${encodeURIComponent(layerId)}` : "";
  const res = await apiFetch<ApiResponse<SavedView[]>>(`/saved-views${query}`);
  return unwrapData(res);
}

export async function getSavedView(id: string): Promise<SavedView> {
  const res = await apiFetch<ApiResponse<SavedView>>(`/saved-views/${id}`);
  return unwrapData(res);
}

export async function createSavedView(
  payload: SavedViewPayload,
): Promise<SavedView> {
  const res = await apiFetch<ApiResponse<SavedView>>("/saved-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function updateSavedView(
  id: string,
  payload: Partial<SavedViewPayload>,
): Promise<SavedView> {
  const res = await apiFetch<ApiResponse<SavedView>>(`/saved-views/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function deleteSavedView(id: string): Promise<void> {
  await apiFetch<ApiResponse<{ id: string; deleted: boolean }>>(
    `/saved-views/${id}`,
    { method: "DELETE" },
  );
}

export async function previewSavedView(payload: {
  layerId: string;
  config: SavedViewPayload["config"];
}): Promise<SavedViewPreviewResult> {
  const res = await apiFetch<ApiResponse<SavedViewPreviewResult>>(
    "/saved-views/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function duplicateSavedView(id: string): Promise<SavedView> {
  const res = await apiFetch<ApiResponse<SavedView>>(
    `/saved-views/${id}/duplicate`,
    { method: "POST" },
  );
  return unwrapData(res);
}

export async function getSavedViewUsage(id: string): Promise<SavedViewUsage> {
  const res = await apiFetch<ApiResponse<SavedViewUsage>>(
    `/saved-views/${id}/usage`,
  );
  return unwrapData(res);
}
