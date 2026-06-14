import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  FieldTypeMeta,
  FieldDisplayOptionsCatalog,
  LayerGeometryTypeMeta,
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
