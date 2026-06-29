"use client";

import { useRef, useState } from "react";
import {
  resolvePublicAssetUrl,
  uploadFieldFilesBatch,
  uploadFieldImagesBatch,
  validateFieldFile,
  validateFieldImageFile,
} from "@/lib/api/assets";
import {
  getAttachmentMaxCount,
  normalizeAttachmentList,
} from "@/lib/fields/attachments";
import type { AttachmentRef } from "@/types/api/assets";

interface AttachmentUploadFieldProps {
  kind: "image" | "file";
  value: unknown;
  onChange: (value: AttachmentRef[]) => void;
  dataSchema?: Record<string, unknown>;
  required?: boolean;
}

export function AttachmentUploadField({
  kind,
  value,
  onChange,
  dataSchema,
  required,
}: AttachmentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const items = normalizeAttachmentList(value);
  const maxCount = getAttachmentMaxCount(dataSchema);
  const remaining = maxCount - items.length;
  const canAddMore = remaining > 0;

  const accept =
    kind === "image"
      ? "image/png,image/jpeg,image/webp,image/gif"
      : ".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv";

  const hint =
    kind === "image"
      ? "PNG, JPEG, WebP, GIF — tối đa 5MB/ảnh"
      : "PDF, Word, Excel, ZIP, TXT, CSV — tối đa 10MB/file";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) {
      setUploadError(`Tối đa ${maxCount} ${kind === "image" ? "ảnh" : "file"}`);
      e.target.value = "";
      return;
    }

    for (const file of files) {
      const validationError =
        kind === "image"
          ? validateFieldImageFile(file)
          : validateFieldFile(file);
      if (validationError) {
        setUploadError(validationError);
        e.target.value = "";
        return;
      }
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded =
        kind === "image"
          ? await uploadFieldImagesBatch(files)
          : await uploadFieldFilesBatch(files);
      onChange([...items, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Tải lên thất bại");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleRemove(attachmentId: string) {
    onChange(items.filter((item) => item.attachmentId !== attachmentId));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {items.length > 0 && (
        <div className="space-y-2">
          {kind === "image" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => {
                const src = item.url
                  ? resolvePublicAssetUrl(item.url)
                  : undefined;
                return (
                  <div
                    key={item.attachmentId}
                    className="group relative overflow-hidden rounded-lg border border-border bg-white"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={item.originalName ?? "Ảnh"}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-slate-50 text-xs text-muted">
                        {item.originalName ?? "Ảnh"}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.attachmentId)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    >
                      Xóa
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-white">
              {items.map((item) => {
                const href = item.url
                  ? resolvePublicAssetUrl(item.url)
                  : undefined;
                return (
                  <li
                    key={item.attachmentId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {item.originalName ?? "Tệp tin"}
                      </a>
                    ) : (
                      <span className="truncate">
                        {item.originalName ?? "Tệp tin"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.attachmentId)}
                      className="shrink-0 text-xs text-red-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-white px-4 py-6 text-sm text-muted transition hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {isUploading ? (
            <span>Đang upload...</span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {kind === "image" ? "Chọn ảnh" : "Chọn file"}
              </span>
              <span>{hint}</span>
              <span className="text-xs">
                Còn thêm được {remaining}/{maxCount}
              </span>
            </>
          )}
        </button>
      )}

      {required && items.length === 0 && !isUploading && (
        <p className="text-xs text-muted">
          Bắt buộc upload ít nhất 1 {kind === "image" ? "ảnh" : "file"}
        </p>
      )}

      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
