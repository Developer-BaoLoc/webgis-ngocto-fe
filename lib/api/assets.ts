import { getStoredToken } from "@/lib/auth/token";
import { ApiError, getApiBaseUrl } from "@/lib/api/client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  FieldAssetBatchUpload,
  FieldAssetUpload,
  LayerIconUpload,
} from "@/types/api/assets";
import type { ApiErrorBody } from "@/types/api/common";

const LAYER_ICON_MAX_BYTES = 512 * 1024;
const LAYER_ICON_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

const FIELD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const FIELD_IMAGE_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const FIELD_FILE_MAX_BYTES = 10 * 1024 * 1024;
const FIELD_FILE_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/csv",
];

export function resolvePublicAssetUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const origin = getApiBaseUrl().replace(/\/api\/?$/, "");
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

export function validateLayerIconFile(file: File): string | null {
  if (!LAYER_ICON_ACCEPT.includes(file.type)) {
    return "Chỉ chấp nhận PNG, JPEG, WebP hoặc SVG";
  }
  if (file.size > LAYER_ICON_MAX_BYTES) {
    return "Kích thước tối đa 512KB";
  }
  return null;
}

export function validateFieldImageFile(file: File): string | null {
  if (!FIELD_IMAGE_ACCEPT.includes(file.type)) {
    return "Chỉ chấp nhận PNG, JPEG, WebP hoặc GIF";
  }
  if (file.size > FIELD_IMAGE_MAX_BYTES) {
    return "Kích thước tối đa 5MB/ảnh";
  }
  return null;
}

export function validateFieldFile(file: File): string | null {
  if (!FIELD_FILE_ACCEPT.includes(file.type)) {
    return "Chỉ chấp nhận PDF, Word, Excel, ZIP, TXT, CSV";
  }
  if (file.size > FIELD_FILE_MAX_BYTES) {
    return "Kích thước tối đa 10MB/file";
  }
  return null;
}

async function uploadMultipart<T>(
  path: string,
  form: FormData,
): Promise<T> {
  const token = getStoredToken();
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    let message = `Tải lên thất bại (${res.status})`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  const json = (await res.json()) as ApiResponse<T>;
  return unwrapData(json);
}

export async function uploadLayerIcon(file: File): Promise<LayerIconUpload> {
  const validationError = validateLayerIconFile(file);
  if (validationError) {
    throw new ApiError(validationError, 400);
  }

  const form = new FormData();
  form.append("file", file);
  return uploadMultipart<LayerIconUpload>("/assets/layer-icons/upload", form);
}

export async function uploadFieldImage(file: File): Promise<FieldAssetUpload> {
  const validationError = validateFieldImageFile(file);
  if (validationError) {
    throw new ApiError(validationError, 400);
  }

  const form = new FormData();
  form.append("file", file);
  return uploadMultipart<FieldAssetUpload>("/assets/field-images/upload", form);
}

export async function uploadFieldImagesBatch(
  files: File[],
): Promise<FieldAssetUpload[]> {
  const form = new FormData();
  for (const file of files) {
    const validationError = validateFieldImageFile(file);
    if (validationError) {
      throw new ApiError(validationError, 400);
    }
    form.append("files", file);
  }

  const result = await uploadMultipart<FieldAssetBatchUpload>(
    "/assets/field-images/upload-batch",
    form,
  );
  return result.items;
}

export async function uploadFieldFile(file: File): Promise<FieldAssetUpload> {
  const validationError = validateFieldFile(file);
  if (validationError) {
    throw new ApiError(validationError, 400);
  }

  const form = new FormData();
  form.append("file", file);
  return uploadMultipart<FieldAssetUpload>("/assets/field-files/upload", form);
}

export async function uploadFieldFilesBatch(
  files: File[],
): Promise<FieldAssetUpload[]> {
  const form = new FormData();
  for (const file of files) {
    const validationError = validateFieldFile(file);
    if (validationError) {
      throw new ApiError(validationError, 400);
    }
    form.append("files", file);
  }

  const result = await uploadMultipart<FieldAssetBatchUpload>(
    "/assets/field-files/upload-batch",
    form,
  );
  return result.items;
}
