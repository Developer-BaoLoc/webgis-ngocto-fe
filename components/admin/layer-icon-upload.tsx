"use client";

import { useEffect, useRef, useState } from "react";
import {
  resolvePublicAssetUrl,
  uploadLayerIcon,
  validateLayerIconFile,
} from "@/lib/api/assets";
import type { LayerIconReference, LayerStyle } from "@/types/api/admin";

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
  const [previewFailed, setPreviewFailed] = useState(false);

  const previewUrl = style.iconUrl
    ? resolvePublicAssetUrl(style.iconUrl)
    : null;

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUrl]);

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
      setUploadError(err instanceof Error ? err.message : "Tải lên thất bại");
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
            {!previewFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Icon lớp dữ liệu"
                className="max-h-14 max-w-14 object-contain"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <span className="text-center text-[10px] leading-tight text-muted">
                Không xem được icon
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Icon đã tải lên
            </p>
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
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-white px-4 py-6 text-sm text-muted transition hover:border-primary hover:bg-sky-50/50 hover:text-primary disabled:opacity-60"
        >
          {isUploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="ioc-loading-spinner" aria-hidden="true" />
              Đang tải lên
            </span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                Tải icon lên
              </span>
              <span>PNG, JPEG, WebP hoặc SVG · tối đa 512KB</span>
            </>
          )}
        </button>
      )}

      {required && !style.iconAttachmentId && !isUploading && (
        <p className="text-xs text-muted">
          Bắt buộc tải icon lên cho lớp dữ liệu điểm
        </p>
      )}

      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
    </div>
  );
}

export function LayerRuleIconUpload({
  value,
  onChange,
  label = "Icon",
}: {
  value?: LayerIconReference;
  onChange: (value?: LayerIconReference) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const previewUrl = value?.url ? resolvePublicAssetUrl(value.url) : null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateLayerIconFile(file);
    if (validationError) {
      setUploadError(validationError);
      event.target.value = "";
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadLayerIcon(file);
      onChange({ attachmentId: uploaded.attachmentId, url: uploaded.url });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Tải lên thất bại",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={label}
            className="h-9 w-9 rounded border border-border bg-white object-contain p-0.5"
          />
        )}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium disabled:opacity-60"
        >
          {isUploading
            ? "Đang tải..."
            : previewUrl
              ? "Đổi icon"
              : "Tải biểu tượng lên"}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Xóa
          </button>
        )}
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}
