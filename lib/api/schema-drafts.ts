import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  CreateFieldPayload,
  ReorderFieldsPayload,
  SchemaDraft,
  UpdateFieldPayload,
} from "@/types/api/admin";

export async function getLayerSchemaDraft(
  layerId: string,
): Promise<SchemaDraft> {
  const res = await apiFetch<ApiResponse<SchemaDraft>>(
    `/layers/${layerId}/schema/draft`,
  );
  return unwrapData(res);
}

export async function createSchemaDraft(
  layerId: string,
): Promise<SchemaDraft> {
  const res = await apiFetch<ApiResponse<SchemaDraft>>(
    `/layers/${layerId}/schema/drafts`,
    { method: "POST" },
  );
  return unwrapData(res);
}

export async function getSchemaDraft(
  schemaId: string,
): Promise<SchemaDraft> {
  const res = await apiFetch<ApiResponse<SchemaDraft>>(
    `/schema-drafts/${schemaId}`,
  );
  return unwrapData(res);
}

export async function addSchemaField(
  schemaId: string,
  payload: CreateFieldPayload,
): Promise<unknown> {
  const res = await apiFetch<ApiResponse<unknown>>(
    `/schema-drafts/${schemaId}/fields`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function updateSchemaField(
  schemaId: string,
  fieldId: string,
  payload: UpdateFieldPayload,
): Promise<unknown> {
  const res = await apiFetch<ApiResponse<unknown>>(
    `/schema-drafts/${schemaId}/fields/${fieldId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function deleteSchemaField(
  schemaId: string,
  fieldId: string,
): Promise<void> {
  await apiFetch(`/schema-drafts/${schemaId}/fields/${fieldId}`, {
    method: "DELETE",
  });
}

export async function reorderSchemaFields(
  schemaId: string,
  fieldIds: string[],
): Promise<SchemaDraft> {
  const payload: ReorderFieldsPayload = { fieldIds };
  const res = await apiFetch<ApiResponse<SchemaDraft>>(
    `/schema-drafts/${schemaId}/fields/reorder`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function publishSchema(schemaId: string): Promise<unknown> {
  const res = await apiFetch<ApiResponse<unknown>>(
    `/schema-drafts/${schemaId}/publish`,
    { method: "POST" },
  );
  return unwrapData(res);
}
