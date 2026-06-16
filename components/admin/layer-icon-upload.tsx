"use client";

import { useRef, useState } from "react";
import {
  resolvePublicAssetUrl,
  uploadLayerIcon,
  validateLayerIconFile,
} from "@/lib/api/assets";
import type { LayerStyle } from "@/types/api/admin";

interface LayerIconUploadFieldProps {
  style: LayerStyle;
  onChange: (style: LayerStyle) => void;
  required?: boolean;
}

export function LayerIconUploadField({
  style,
  onChange,
  required = false,
}: LayerIconUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewUrl = style.iconUrl
    ? resolvePublicAssetUrl(style.iconUrl)
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateLayerIconFile(file);
    if (validationError) {
      setUploadError(validationError);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadLayerIcon(file);
      onChange({
        ...style,
        iconAttachmentId: uploaded.attachmentId,
        iconUrl: uploaded.url,
        icon: undefined,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleRemove() {
    onChange({
      ...style,
      iconAttachmentId: undefined,
      iconUrl: undefined,
      icon: undefined,
    });
    setUploadError(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="flex items-start gap-4 rounded-lg border border-border bg-white p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Icon lớp"
              className="max-h-14 max-w-14 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Icon đã upload</p>
            <p className="truncate text-xs text-muted">
              {style.iconAttachmentId}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
                className="text-sm text-primary hover:underline disabled:opacity-60"
              >
                Đổi icon
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemove}
                className="text-sm text-red-600 hover:underline disabled:opacity-60"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-white px-4 py-8 text-sm text-muted transition hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {isUploading ? (
            <span>Đang upload...</span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                Chọn hoặc kéo thả icon
              </span>
              <span>PNG, JPEG, WebP, SVG — tối đa 512KB</span>
            </>
          )}
        </button>
      )}

      {required && !style.iconAttachmentId && !isUploading && (
        <p className="text-xs text-muted">
          Bắt buộc upload icon cho lớp dữ liệu điểm
        </p>
      )}

      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
