import { getApiBaseUrl, ApiError } from "./client";
import { getStoredToken } from "@/lib/auth/token";
import {
  unwrapData,
  type ApiErrorBody,
  type ApiResponse,
} from "@/types/api/common";
import type { GeoJsonGeometry } from "@/types/gis.types";
import type {
  ImportColumnSuggestion,
  ImportCreateFieldPayload,
} from "@/types/api/import";

export type GeoJsonFilterMode = "none" | "current_ward";

export interface GeoJsonImportUploadResult {
  importId: string;
  fileName: string;
  layerId: string;
  status: "uploaded";
  detectedColumns?: string[];
  existingFields?: string[];
  unknownColumns?: string[];
  columnSuggestions?: ImportColumnSuggestion[];
}

export interface GeoJsonImportSampleItem {
  rowNumber: number;
  geometryType: string;
  properties: Record<string, unknown>;
}

export interface GeoJsonImportErrorItem {
  rowNumber: number;
  reason: string;
}

export interface GeoJsonImportWarningItem {
  rowNumber: number;
  message: string;
}

export interface GeoJsonPolygonStats {
  total: number;
  valid: number;
  autoClosed: number;
  invalid: number;
}

export interface GeoJsonImportSummary {
  importId: string;
  layerId: string;
  totalFeatures: number;
  accepted: number;
  rejected: number;
  inserted?: number;
  geometryTypes: Record<string, number>;
  polygonStats?: GeoJsonPolygonStats;
  sample: GeoJsonImportSampleItem[];
  errors: GeoJsonImportErrorItem[];
  warnings?: GeoJsonImportWarningItem[];
  detectedColumns?: string[];
  existingFields?: string[];
  unknownColumns?: string[];
  columnSuggestions?: ImportColumnSuggestion[];
}

export interface GeoJsonImportOptions {
  importId: string;
  filterMode?: GeoJsonFilterMode;
  propertyMapping?: Record<string, string>;
  filterBoundary?: GeoJsonGeometry;
  batchSize?: number;
  sampleSize?: number;
  newFields?: ImportCreateFieldPayload[];
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = (await res.json()) as ApiErrorBody & {
      message?: string | { message?: string };
    };
    if (body.error?.message) message = body.error.message;
    else if (typeof body.message === "string") message = body.message;
    else if (body.message?.message) message = body.message.message;
  } catch {
    // Keep fallback message when the response is not JSON.
  }
  throw new ApiError(message, res.status);
}

function buildRequestBody(options: GeoJsonImportOptions) {
  const body: Record<string, unknown> = {
    importId: options.importId,
    filterMode: options.filterMode ?? "none",
    batchSize: options.batchSize ?? 1000,
  };

  if (options.sampleSize) body.sampleSize = options.sampleSize;
  if (options.filterBoundary) body.filterBoundary = options.filterBoundary;
  if (
    options.propertyMapping &&
    Object.keys(options.propertyMapping).length > 0
  ) {
    body.propertyMapping = options.propertyMapping;
  }
  if (options.newFields && options.newFields.length > 0) {
    body.newFields = options.newFields;
  }

  return body;
}

export async function uploadGeoJsonImportFile(
  layerId: string,
  file: File,
): Promise<GeoJsonImportUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`/layers/${layerId}/geojson-import/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) await parseError(res, "Upload GeoJSON thất bại");
  const json = (await res.json()) as ApiResponse<GeoJsonImportUploadResult>;
  return unwrapData(json);
}

export async function previewGeoJsonImport(
  layerId: string,
  options: GeoJsonImportOptions,
): Promise<GeoJsonImportSummary> {
  const res = await authFetch(`/layers/${layerId}/geojson-import/preview`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(options)),
  });
  if (!res.ok) await parseError(res, "Preview GeoJSON thất bại");
  const json = (await res.json()) as ApiResponse<GeoJsonImportSummary>;
  return unwrapData(json);
}

export async function executeGeoJsonImport(
  layerId: string,
  options: GeoJsonImportOptions,
): Promise<GeoJsonImportSummary> {
  const res = await authFetch(`/layers/${layerId}/geojson-import/execute`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(options)),
  });
  if (!res.ok) await parseError(res, "Import GeoJSON thất bại");
  const json = (await res.json()) as ApiResponse<GeoJsonImportSummary>;
  return unwrapData(json);
}
