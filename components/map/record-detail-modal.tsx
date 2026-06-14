"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { cn } from "@/lib/utils";
import type { AttachmentRef } from "@/types/api/assets";
import type { RecordDisplayData, RecordDisplayField } from "@/types/api/records";

interface RecordDetailModalProps {
  data: RecordDisplayData | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

function getRecordTitle(fields: RecordDisplayField[]): string {
  const first = fields.find(
    (field) =>
      field.fieldType === "text" ||
      field.required ||
      field.displayValue?.trim(),
  );
  return first?.displayValue?.trim() || "Chi tiết bản ghi";
}

function partitionFields(fields: RecordDisplayField[]) {
  const images: RecordDisplayField[] = [];
  const files: RecordDisplayField[] = [];
  const others: RecordDisplayField[] = [];

  for (const field of fields) {
    if (field.fieldType === "image") images.push(field);
    else if (field.fieldType === "file") files.push(field);
    else others.push(field);
  }

  return { images, files, others };
}

function collectGalleryImages(imageFields: RecordDisplayField[]): AttachmentRef[] {
  const seen = new Set<string>();
  const items: AttachmentRef[] = [];

  for (const field of imageFields) {
    for (const item of normalizeAttachmentList(field.value)) {
      if (!item.url || seen.has(item.attachmentId)) continue;
      seen.add(item.attachmentId);
      items.push(item);
    }
  }

  return items;
}

export function RecordDetailModal({
  data,
  loading = false,
  error = null,
  onClose,
}: RecordDetailModalProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!data && !loading && !error) return null;

  const title = getRecordTitle(data?.detail ?? []);
  const { images, files, others } = data
    ? partitionFields(data.detail)
    : { images: [], files: [], others: [] };
  const galleryImages = collectGalleryImages(images);

  return (
    <>
      <Modal size="lg" padding={false} onClose={onClose}>
        <article className="flex max-h-[90vh] flex-col overflow-hidden bg-white">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted shadow-sm transition hover:bg-slate-50 hover:text-foreground"
              aria-label="Đóng"
            >
              <CloseIcon />
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <header className="border-b border-border pb-4 pr-10">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {data?.layerName ?? "Đang tải..."}
                </span>
                <h2 className="mt-2 text-xl font-bold leading-snug text-foreground">
                  {loading ? "Đang tải chi tiết..." : title}
                </h2>
              </header>

              {loading && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Đang tải dữ liệu bản ghi...
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  {error}
                </p>
              )}

              {data && !loading && (
                <div className="mt-4 space-y-6">
                  {others.length > 0 && (
                    <section>
                      <h3 className="mb-1 text-sm font-semibold text-foreground">
                        Thông tin
                      </h3>
                      <dl className="divide-y divide-border rounded-xl border border-border bg-slate-50/40">
                        {others.map((field) => (
                          <DetailFieldRow key={field.code} field={field} />
                        ))}
                      </dl>
                    </section>
                  )}

                  {galleryImages.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">
                        Hình ảnh
                      </h3>
                      <div className="space-y-3">
                        {images.map((field) => (
                          <DetailImageThumbnails
                            key={field.code}
                            field={field}
                            allImages={galleryImages}
                            showLabel={images.length > 1}
                            onPreview={setPreviewIndex}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {files.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">
                        Tệp đính kèm
                      </h3>
                      <div className="space-y-3">
                        {files.map((field) => (
                          <div
                            key={field.code}
                            className="rounded-xl border border-border bg-white p-4"
                          >
                            <p className="mb-2 text-sm font-medium text-muted">
                              {field.label}
                            </p>
                            <FileAttachmentList value={field.value} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {data && !loading && (
              <footer className="shrink-0 border-t border-border bg-white px-6 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
                >
                  Đóng
                </button>
              </footer>
            )}
          </div>
        </article>
      </Modal>

      {previewIndex !== null && galleryImages.length > 0 && (
        <ImagePreviewOverlay
          images={galleryImages}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onChange={setPreviewIndex}
        />
      )}
    </>
  );
}

function DetailFieldRow({ field }: { field: RecordDisplayField }) {
  const value = field.displayValue?.trim() || "—";
  const isLong = value.length > 80 || value.includes("\n");

  return (
    <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted">{field.label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold text-foreground",
          isLong && "whitespace-pre-wrap break-words font-normal leading-relaxed",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function DetailImageThumbnails({
  field,
  allImages,
  showLabel,
  onPreview,
}: {
  field: RecordDisplayField;
  allImages: AttachmentRef[];
  showLabel: boolean;
  onPreview: (index: number) => void;
}) {
  const items = normalizeAttachmentList(field.value).filter((item) => item.url);
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-3">
      {showLabel && (
        <p className="mb-2 text-sm font-medium text-muted">{field.label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const src = item.url ? resolvePublicAssetUrl(item.url) : "";
          if (!src) return null;

          const globalIndex = allImages.findIndex(
            (image) => image.attachmentId === item.attachmentId,
          );

          return (
            <button
              key={item.attachmentId}
              type="button"
              onClick={() => {
                if (globalIndex >= 0) onPreview(globalIndex);
              }}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-slate-50 transition hover:border-primary/40 hover:ring-2 hover:ring-primary/20"
              title={item.originalName ?? "Xem ảnh lớn"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={item.originalName ?? "Ảnh"}
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                <ZoomIcon className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImagePreviewOverlay({
  images,
  index,
  onClose,
  onChange,
}: {
  images: AttachmentRef[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const current = images[index];
  const src = current?.url ? resolvePublicAssetUrl(current.url) : "";
  const hasMultiple = images.length > 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (!hasMultiple) return;
      if (event.key === "ArrowLeft") {
        onChange((index - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        onChange((index + 1) % images.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMultiple, images.length, index, onChange, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-label="Đóng xem ảnh"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          aria-label="Đóng"
        >
          <CloseIcon />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={current.originalName ?? "Ảnh"}
          className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />

        <p className="mt-3 max-w-full truncate px-2 text-center text-sm text-white/90">
          {current.originalName ?? "Ảnh"}
          {hasMultiple && (
            <span className="ml-2 text-white/60">
              ({index + 1}/{images.length})
            </span>
          )}
        </p>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => onChange((index - 1 + images.length) % images.length)}
              className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:-left-12"
              aria-label="Ảnh trước"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => onChange((index + 1) % images.length)}
              className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:-right-12"
              aria-label="Ảnh sau"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FileAttachmentList({ value }: { value: unknown }) {
  const items = normalizeAttachmentList(value);
  if (items.length === 0) return <span className="text-sm text-muted">—</span>;

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const href = item.url ? resolvePublicAssetUrl(item.url) : undefined;
        return (
          <li key={item.attachmentId}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm transition hover:border-primary/30 hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-muted shadow-sm">
                  <FileIcon />
                </span>
                <span className="min-w-0 flex-1 font-medium text-foreground">
                  {item.originalName ?? "Tệp tin"}
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  Tải xuống
                </span>
              </a>
            ) : (
              <span className="text-sm text-muted">
                {item.originalName ?? "Tệp tin"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      {direction === "left" ? (
        <path
          fillRule="evenodd"
          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 3.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5ZM1.75 10a8.25 8.25 0 1 1 14.59 5.28l2.69 2.69a.75.75 0 1 1-1.06 1.06l-2.69-2.69A8.25 8.25 0 0 1 1.75 10Zm6.25-2.5a.75.75 0 0 0-1.5 0v1.75H4.75a.75.75 0 0 0 0 1.5h1.75V13a.75.75 0 0 0 1.5 0v-1.75h1.75a.75.75 0 0 0 0-1.5H8.5V7.5Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}
