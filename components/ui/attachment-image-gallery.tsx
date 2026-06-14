"use client";

import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { cn } from "@/lib/utils";

interface AttachmentImageGalleryProps {
  value: unknown;
  compact?: boolean;
}

export function AttachmentImageGallery({
  value,
  compact = false,
}: AttachmentImageGalleryProps) {
  const items = normalizeAttachmentList(value);
  if (items.length === 0) {
    return <span className="text-muted">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
      {items.map((item) => {
        const src = item.url ? resolvePublicAssetUrl(item.url) : "";
        if (!src) {
          return (
            <span
              key={item.attachmentId}
              className="text-xs text-muted"
            >
              {item.originalName ?? "Ảnh"}
            </span>
          );
        }

        return (
          <a
            key={item.attachmentId}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title={item.originalName ?? "Xem ảnh"}
            className={cn(
              "block overflow-hidden rounded-md border border-border bg-slate-50 transition hover:ring-2 hover:ring-primary/30",
              compact ? "h-10 w-10" : "h-20 w-20",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={item.originalName ?? "Ảnh"}
              className="h-full w-full object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}
