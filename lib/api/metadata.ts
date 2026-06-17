import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  FieldTypeMeta,
  FieldDisplayOptionsCatalog,
  LayerGeometryTypeMeta,
  RelationshipCheckResult,
  RelationshipOption,
  RelationshipResolveAgainResult,
  RelationshipResolveResult,
  RelationshipSuggestion,
} from "@/types/api/metadata";

export async function getFieldTypes(): Promise<FieldTypeMeta[]> {
  const res = await apiFetch<ApiResponse<FieldTypeMeta[]>>(
    "/metadata/field-types",
  );
  return unwrapData(res);
}

export async function getLayerGeometryTypes(): Promise<LayerGeometryTypeMeta[]> {
  const res = await apiFetch<ApiResponse<LayerGeometryTypeMeta[]>>(
    "/metadata/layer-geometry-types",
  );
  return unwrapData(res);
}

export async function getFieldDisplayOptions(): Promise<FieldDisplayOptionsCatalog> {
  const res = await apiFetch<ApiResponse<FieldDisplayOptionsCatalog>>(
    "/metadata/field-display-options",
  );
  return unwrapData(res);
}

export async function getRelationshipOptions(params: {
  targetLayerId?: string;
  targetTable?: string;
  targetLayerCode?: string;
  displayField?: string;
  q?: string;
  limit?: number;
}): Promise<RelationshipOption[]> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  }
  const res = await apiFetch<ApiResponse<RelationshipOption[]>>(
    `/metadata/relationship-options?${search.toString()}`,
  );
  return unwrapData(res);
}

export async function resolveRelationships(payload: {
  targetLayerId?: string;
  targetTable?: string;
  targetLayerCode?: string;
  matchField?: string;
  displayField?: string;
  values: string[];
}): Promise<Record<string, RelationshipResolveResult>> {
  const res = await apiFetch<
    ApiResponse<Record<string, RelationshipResolveResult>>
  >("/imports/resolve-relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function checkRelationship(payload: {
  sourceLayerId: string;
  fieldCode?: string;
  relationType?: string;
  targetLayerId?: string;
  targetLayerCode?: string;
  targetTable?: string;
  foreignKey?: string;
  targetDisplayField?: string;
  matchField?: string;
}): Promise<RelationshipCheckResult> {
  const res = await apiFetch<ApiResponse<RelationshipCheckResult>>(
    "/metadata/relationships/check",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function resolveAgainRelationship(payload: {
  sourceLayerId: string;
  fieldCode: string;
}): Promise<RelationshipResolveAgainResult> {
  const res = await apiFetch<ApiResponse<RelationshipResolveAgainResult>>(
    "/metadata/relationships/resolve-again",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function getRelationshipSuggestions(
  layerId: string,
): Promise<RelationshipSuggestion[]> {
  const res = await apiFetch<ApiResponse<RelationshipSuggestion[]>>(
    `/metadata/relationships/suggestions?layerId=${encodeURIComponent(layerId)}`,
  );
  return unwrapData(res);
}
