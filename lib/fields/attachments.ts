import type { AttachmentRef } from "@/types/api/assets";

export const DEFAULT_ATTACHMENT_MAX_COUNT = 20;

export function getAttachmentMaxCount(
  dataSchema?: Record<string, unknown>,
): number {
  const max = dataSchema?.maxCount;
  if (typeof max === "number" && max > 0) return max;
  return DEFAULT_ATTACHMENT_MAX_COUNT;
}

export function normalizeAttachmentList(value: unknown): AttachmentRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const ref = item as AttachmentRef;
      const attachmentId = ref.attachmentId;
      return {
        attachmentId,
        url:
          ref.url ??
          (attachmentId ? `/api/assets/${attachmentId}/file` : undefined),
        originalName: ref.originalName,
        mimeType: ref.mimeType,
        sizeBytes: ref.sizeBytes,
      };
    })
    .filter((item) => Boolean(item.attachmentId));
}

export function formatAttachmentList(value: unknown): string {
  const items = normalizeAttachmentList(value);
  if (items.length === 0) return "—";
  const names = items
    .map((item) => item.originalName)
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names.join(", ");
  return `${items.length} tệp`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
