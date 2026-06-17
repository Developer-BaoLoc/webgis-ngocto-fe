"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { normalizeMultiCategoryDisplayText } from "@/lib/fields/multi-category";
import { cn } from "@/lib/utils";
import type { AttachmentRef } from "@/types/api/assets";
import type { RecordDisplayData, RecordDisplayField } from "@/types/api/records";
import { openDirections, type MapLatLng } from "@/lib/map/directions";

interface RecordDetailModalProps {
  data: RecordDisplayData | null;
  loading?: boolean;
  error?: string | null;
  destination?: MapLatLng | null;
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
  destination = null,
  onClose,
}: RecordDetailModalProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!data && !loading && !error) return null;

  const title = getRecordTitle(data?.detail ?? []);
  const { images, files, others } = data
    ? partitionFields(data.detail)
    : { images: [], files: [], others: [] };
  const galleryImages = collectGalleryImages(images);
  const hasGallery = galleryImages.length > 0;

  return (
    <>
      <Modal size="sm" padding={false} onClose={onClose}>
        <article className="relative flex max-h-[85vh] flex-col overflow-hidden bg-white">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition",
              hasGallery
                ? "bg-black/50 text-white hover:bg-black/65"
                : "border border-border bg-white text-muted hover:bg-slate-50",
            )}
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>

          {hasGallery && !loading && (
            <DetailHeroGallery
              images={galleryImages}
              onPreview={setPreviewIndex}
            />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <header className="pr-8">
              <span className="text-[0.6875rem] font-semibold text-emerald-700">
                {data?.layerName ?? "Đang tải..."}
              </span>
              <h2 className="mt-0.5 text-base font-bold leading-snug text-foreground">
                {loading ? "Đang tải..." : title}
              </h2>
              {destination && !loading && (
                <button
                  type="button"
                  onClick={() => openDirections(destination)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <DirectionsIcon className="h-3.5 w-3.5" />
                  Chỉ đường
                </button>
              )}
            </header>

            {loading && (
              <div className="flex items-center gap-2 py-6 text-xs text-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Đang tải dữ liệu...
              </div>
            )}

            {error && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                {error}
              </p>
            )}

            {data && !loading && (
              <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {others.map((field) => (
                  <DetailFieldRow key={field.code} field={field} />
                ))}

                {files.map((field) => (
                  <div
                    key={field.code}
                    className="rounded-lg border border-border bg-slate-50/50 px-2.5 py-2 sm:col-span-2"
                  >
                    <dt className="text-xs font-medium text-muted">
                      {field.label}
                    </dt>
                    <dd className="mt-1">
                      <FileAttachmentList value={field.value} />
                    </dd>
                  </div>
                ))}
              </dl>
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

function DetailHeroGallery({
  images,
  onPreview,
}: {
  images: AttachmentRef[];
  onPreview: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const current = images[index];
  const src = current?.url ? resolvePublicAssetUrl(current.url) : "";
  const hasMultiple = images.length > 1;

  if (!src) return null;

  return (
    <div className="shrink-0 border-b border-border bg-slate-100">
      <div className="relative flex min-h-[11rem] w-full items-center justify-center px-3 py-2.5 sm:min-h-[12.5rem]">
        <button
          type="button"
          onClick={() => onPreview(index)}
          className="flex w-full items-center justify-center"
          aria-label="Phóng to ảnh"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={current.originalName ?? "Ảnh"}
            className="max-h-44 w-auto max-w-full object-contain sm:max-h-52"
          />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() =>
                setIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/55"
              aria-label="Ảnh trước"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/55"
              aria-label="Ảnh sau"
            >
              <ChevronIcon direction="right" />
            </button>
            <span className="absolute bottom-1.5 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[0.625rem] font-medium text-white">
              {index + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex justify-center gap-1.5 overflow-x-auto border-t border-border/60 px-3 py-1.5">
          {images.map((item, itemIndex) => {
            const thumbSrc = item.url ? resolvePublicAssetUrl(item.url) : "";
            if (!thumbSrc) return null;

            return (
              <button
                key={item.attachmentId}
                type="button"
                onClick={() => setIndex(itemIndex)}
                className={cn(
                  "h-8 w-8 shrink-0 overflow-hidden rounded border-2 bg-white",
                  itemIndex === index
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
                aria-label={`Ảnh ${itemIndex + 1}`}
                aria-current={itemIndex === index}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailFieldRow({ field }: { field: RecordDisplayField }) {
  if (field.fieldType === "relationship" && isRelationshipDisplay(field.value)) {
    return <RelationshipDetailRow field={field} value={field.value} />;
  }
  if (field.fieldType === "relationship" && Array.isArray(field.value)) {
    return <RelationshipChildrenRow field={field} />;
  }

  let value = field.displayValue?.trim() || "—";
  if (field.fieldType === "multi_category" && value !== "—") {
    value = normalizeMultiCategoryDisplayText(value);
  }
  const isMultiLine =
    field.fieldType === "multi_category" ||
    field.fieldType === "relationship" ||
    value.length > 60 ||
    value.includes("\n");

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-slate-50/50 px-2.5 py-2",
        isMultiLine && "sm:col-span-2",
      )}
    >
      <dt className="text-xs font-medium text-muted">{field.label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-xs font-semibold text-foreground",
          isMultiLine &&
            "whitespace-pre-wrap break-words font-normal leading-snug",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

type RelationshipDisplayValue = {
  value?: unknown;
  rawValue?: unknown;
  label?: unknown;
  status?: unknown;
  message?: unknown;
  foreignKey?: unknown;
  targetLayerName?: unknown;
  targetLayerCode?: unknown;
  targetDisplayField?: unknown;
  matchField?: unknown;
};

type RelationshipChildRow = {
  id?: string;
  label?: string;
  properties: Record<string, unknown>;
};

function isRelationshipDisplay(value: unknown): value is RelationshipDisplayValue {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "status" in value
  );
}

function formatRelationshipRawValue(value: RelationshipDisplayValue): string {
  const raw = value.rawValue ?? value.value;
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return "Chưa liên kết";
  }
  return String(raw);
}

function RelationshipDetailRow({
  field,
  value,
}: {
  field: RecordDisplayField;
  value: RelationshipDisplayValue;
}) {
  const status = String(value.status ?? "");
  const isWarning = status === "empty" || status === "not_found";
  const displayLabel =
    value.label !== null && value.label !== undefined && String(value.label).trim()
      ? String(value.label)
      : status === "empty"
        ? "Chưa liên kết"
        : "—";
  const targetLayer = [
    value.targetLayerName,
    value.targetLayerCode ? `(${String(value.targetLayerCode)})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-lg border border-border bg-slate-50/50 px-2.5 py-2 sm:col-span-2">
      <dt className="text-xs font-medium text-muted">{field.label}</dt>
      <dd className="mt-1 space-y-2 text-xs">
        <div
          className={cn(
            "rounded-md border px-2 py-1.5 font-medium",
            isWarning
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {status === "not_found"
            ? String(value.message ?? "Không tìm thấy bản ghi cha")
            : displayLabel}
        </div>

        <div className="grid gap-1.5 text-muted sm:grid-cols-2">
          <span>
            Giá trị lưu trong database:{" "}
            <strong className="font-mono text-foreground">
              {formatRelationshipRawValue(value)}
            </strong>
          </span>
          <span>
            Label resolve:{" "}
            <strong className="text-foreground">{displayLabel}</strong>
          </span>
          <span>
            Target layer:{" "}
            <strong className="text-foreground">{targetLayer || "—"}</strong>
          </span>
          <span>
            Display field:{" "}
            <strong className="font-mono text-foreground">
              {String(value.targetDisplayField ?? "—")}
            </strong>
          </span>
          <span>
            Match field:{" "}
            <strong className="font-mono text-foreground">
              {String(value.matchField ?? "—")}
            </strong>
          </span>
        </div>
      </dd>
    </div>
  );
}

const RELATIONSHIP_SKIP_KEYS = new Set([
  "id",
  "_id",
  "entity_id",
  "geometry",
  "geom",
  "created_at",
  "updated_at",
  "deleted_at",
  "location_status",
]);

function humanizeFieldCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\p{Ll}/u, (char) => char.toUpperCase());
}

function getRelationshipChildren(value: unknown): RelationshipChildRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as {
        id?: unknown;
        label?: unknown;
        properties?: Record<string, unknown>;
      };
      return {
        id: row.id ? String(row.id) : undefined,
        label: row.label ? String(row.label) : undefined,
        properties:
          row.properties && typeof row.properties === "object"
            ? row.properties
            : {},
      };
    });
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatChildValue(value: unknown): string {
  if (!isPresent(value)) return "—";
  if (typeof value === "number") return value.toLocaleString("vi-VN");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getChildDisplayFields(
  field: RecordDisplayField,
  rows: RelationshipChildRow[],
): string[] {
  const configured = field.dataSchema?.popupFields;
  if (Array.isArray(configured)) {
    return configured.map(String).filter(Boolean).slice(0, 9);
  }

  const displayField =
    typeof field.dataSchema?.targetDisplayField === "string"
      ? field.dataSchema.targetDisplayField
      : null;
  const foreignKey =
    typeof field.dataSchema?.foreignKey === "string"
      ? field.dataSchema.foreignKey
      : null;
  const keys = new Set<string>();
  if (displayField) keys.add(displayField);

  for (const row of rows) {
    for (const [key, value] of Object.entries(row.properties)) {
      if (!isPresent(value)) continue;
      if (key === foreignKey || RELATIONSHIP_SKIP_KEYS.has(key)) continue;
      keys.add(key);
      if (keys.size >= 6) break;
    }
    if (keys.size >= 6) break;
  }

  return [...keys];
}

function RelationshipChildrenRow({ field }: { field: RecordDisplayField }) {
  const rows = getRelationshipChildren(field.value);
  const fields = getChildDisplayFields(field, rows);
  const cardMode = field.dataSchema?.popupDisplayMode === "cards";

  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-2 sm:col-span-2">
      <dt className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
        <span>{field.label}</span>
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-sky-700">
          {rows.length}
        </span>
      </dt>
      <dd className="mt-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted">Chưa có dữ liệu liên kết.</p>
        ) : fields.length === 0 ? (
          <div className="grid gap-2">
            {rows.map((row) => (
              <div
                key={row.id ?? row.label}
                className="rounded-lg border border-border bg-slate-50 px-2.5 py-2 text-xs font-semibold text-foreground"
              >
                {row.label ?? row.id ?? "Bản ghi liên kết"}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "overflow-x-auto rounded-lg border border-border",
                cardMode ? "hidden" : "hidden sm:block",
              )}
            >
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-slate-50 text-left text-muted">
                  <tr>
                    {fields.map((code) => (
                      <th key={code} className="whitespace-nowrap px-2.5 py-2">
                        {humanizeFieldCode(code)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id ?? row.label}>
                      {fields.map((code) => {
                        const value =
                          row.properties[code] ??
                          (code === field.dataSchema?.targetDisplayField
                            ? row.label
                            : null);
                        return (
                          <td
                            key={code}
                            className={cn(
                              "whitespace-nowrap px-2.5 py-2 text-foreground",
                              typeof value === "number" && "text-right",
                            )}
                          >
                            {formatChildValue(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={cn("grid gap-2", !cardMode && "sm:hidden")}>
              {rows.map((row) => {
                const titleCode = fields[0];
                const title =
                  (titleCode ? row.properties[titleCode] : null) ??
                  row.label ??
                  row.id;
                return (
                  <article
                    key={row.id ?? row.label}
                    className="rounded-lg border border-border bg-slate-50 px-2.5 py-2 text-xs"
                  >
                    <strong className="block text-foreground">
                      {formatChildValue(title)}
                    </strong>
                    <div className="mt-1 grid gap-1 text-muted">
                      {fields.slice(1).map((code) => {
                        const value = row.properties[code];
                        if (!isPresent(value)) return null;
                        return (
                          <span key={code}>
                            {humanizeFieldCode(code)}:{" "}
                            <strong className="text-foreground">
                              {formatChildValue(value)}
                            </strong>
                          </span>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </dd>
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
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-label="Đóng xem ảnh"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={current.originalName ?? "Ảnh"}
          className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => onChange((index - 1 + images.length) % images.length)}
              className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
              aria-label="Ảnh trước"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => onChange((index + 1) % images.length)}
              className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
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
  if (items.length === 0) return <span className="text-xs text-muted">—</span>;

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const href = item.url ? resolvePublicAssetUrl(item.url) : undefined;
        return (
          <li key={item.attachmentId}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <FileIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {item.originalName ?? "Tệp tin"}
                </span>
              </a>
            ) : (
              <span className="text-xs text-muted">
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
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
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

function DirectionsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.369 1.684a1.125 1.125 0 0 1-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689A1.125 1.125 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.369-1.684c.381-.19.622-.58.622-1.006Z"
      />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
