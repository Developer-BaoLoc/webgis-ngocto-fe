import { getApiBaseUrl, ApiError } from "./client";
import { getStoredToken } from "@/lib/auth/token";
import { unwrapData, type ApiErrorBody, type ApiResponse } from "@/types/api/common";
import type {
  ImportPreviewResult,
  ImportUploadResult,
  LayerImportExecuteResult,
  LayerImportValidationError,
} from "@/types/api/import";

export class LayerImportValidationFailedError extends ApiError {
  validationErrors: LayerImportValidationError[];

  constructor(message: string, validationErrors: LayerImportValidationError[]) {
    super(message, 400);
    this.name = "LayerImportValidationFailedError";
    this.validationErrors = validationErrors;
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
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
      message?: {
        code?: string;
        message?: string;
        errors?: LayerImportValidationError[];
      };
    };

    if (
      body.message?.code === "IMPORT_VALIDATION_FAILED" ||
      body.error?.code === "IMPORT_VALIDATION_FAILED"
    ) {
      const payload = body.message ?? body.error;
      const validationErrors = (payload as { errors?: LayerImportValidationError[] })
        .errors ?? [];
      throw new LayerImportValidationFailedError(
        typeof payload?.message === "string"
          ? payload.message
          : "Không thể import vì file còn lỗi. Sửa Excel theo danh sách errors rồi upload lại.",
        validationErrors,
      );
    }

    if (body.error?.message) message = body.error.message;
    else if (typeof body.message === "string") message = body.message;
    else if (body.message?.message) message = body.message.message;
  } catch (error) {
    if (error instanceof LayerImportValidationFailedError) throw error;
  }
  throw new ApiError(message, res.status);
}

function parseFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ""));
  } catch {
    return match[1];
  }
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadLayerImportTemplate(
  layerId: string,
  layerName?: string,
): Promise<void> {
  const res = await authFetch(`/layers/${layerId}/imports/template`, {
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream",
    },
  });
  if (!res.ok) await parseError(res, "Không tải được file mẫu");

  const blob = await res.blob();
  const fallback = layerName
    ? `mau_import_${layerName.replace(/\s+/g, "_")}.xlsx`
    : `mau_import_${layerId}.xlsx`;
  const fileName = parseFileName(
    res.headers.get("Content-Disposition"),
    fallback,
  );
  triggerBlobDownload(blob, fileName);
}

export async function uploadLayerImportFile(
  layerId: string,
  file: File,
): Promise<ImportUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`/layers/${layerId}/imports/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) await parseError(res, "Upload thất bại");
  const json = (await res.json()) as ApiResponse<ImportUploadResult>;
  return unwrapData(json);
}

export async function previewLayerImport(
  layerId: string,
  importId: string,
): Promise<ImportPreviewResult> {
  const res = await authFetch(
    `/layers/${layerId}/imports/${encodeURIComponent(importId)}/preview`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) await parseError(res, "Preview thất bại");
  const json = (await res.json()) as ApiResponse<ImportPreviewResult>;
  return unwrapData(json);
}

export async function executeLayerImport(
  layerId: string,
  importId: string,
): Promise<LayerImportExecuteResult> {
  const res = await authFetch(
    `/layers/${layerId}/imports/${encodeURIComponent(importId)}/execute`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) await parseError(res, "Thực hiện import thất bại");
  const json = (await res.json()) as ApiResponse<LayerImportExecuteResult>;
  return unwrapData(json);
}
