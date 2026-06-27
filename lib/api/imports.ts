import { getApiBaseUrl, ApiError } from "./client";
import { getStoredToken } from "@/lib/auth/token";
import { unwrapData, type ApiErrorBody, type ApiResponse } from "@/types/api/common";
import type {
  ImportExecuteResult,
  ImportJob,
  ImportPreviewResult,
  ImportSession,
  ImportTemplate,
  ImportUploadResult,
} from "@/types/api/import";

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
    const body = (await res.json()) as ApiErrorBody;
    if (body.error?.message) message = body.error.message;
  } catch {
    // ignore
  }
  throw new ApiError(message, res.status);
}

export async function getImportTemplates(): Promise<ImportTemplate[]> {
  const res = await authFetch("/imports/templates", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) await parseError(res, "Không tải được templates");
  const json = (await res.json()) as ApiResponse<ImportTemplate[]>;
  return unwrapData(json);
}

export async function uploadImportFile(file: File): Promise<ImportUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch("/imports/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) await parseError(res, "Upload thất bại");
  const json = (await res.json()) as ApiResponse<ImportUploadResult>;
  return unwrapData(json);
}

export async function previewImport(
  importId: string,
  templateCode: string,
): Promise<ImportPreviewResult> {
  const res = await authFetch(`/imports/${importId}/preview`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ templateCode }),
  });
  if (!res.ok) await parseError(res, "Xem trước thất bại");
  const json = (await res.json()) as ApiResponse<ImportPreviewResult>;
  return unwrapData(json);
}

export async function executeImport(
  importId: string,
  templateCode: string,
): Promise<ImportExecuteResult> {
  const res = await authFetch(`/imports/${importId}/execute`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ templateCode }),
  });
  if (!res.ok) await parseError(res, "Thực hiện import thất bại");
  const json = (await res.json()) as ApiResponse<ImportExecuteResult>;
  return unwrapData(json);
}

export async function getImportSession(
  importId: string,
): Promise<ImportSession> {
  const res = await authFetch(`/imports/${importId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) await parseError(res, "Không lấy được trạng thái import");
  const json = (await res.json()) as ApiResponse<ImportSession>;
  return unwrapData(json);
}

export async function getJob(jobId: string): Promise<ImportJob> {
  const res = await authFetch(`/jobs/${jobId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) await parseError(res, "Không lấy được tiến trình job");
  const json = (await res.json()) as ApiResponse<ImportJob>;
  return unwrapData(json);
}

/** Job đã hoàn tất (thành công hoặc lỗi) */
export function isJobFinished(status: string): boolean {
  return ["completed", "failed", "done", "error"].includes(
    status.toLowerCase(),
  );
}
