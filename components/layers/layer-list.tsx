"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayerSymbol } from "@/components/layers/layer-symbol";
import { EmptyState } from "@/components/ui/empty-state";
import { LayerBadge } from "@/components/ui/badge";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { geometryKindLabels } from "@/types/layer.types";
import { cn } from "@/lib/utils";

function LayersIcon() {
  return (
    <svg
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

export function LayerList() {
  const { layers, error } = useLayerCatalog();
  const [query, setQuery] = useState("");

  const filteredLayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return layers;
    return layers.filter(
      (layer) =>
        layer.name.toLowerCase().includes(normalized) ||
        layer.code.toLowerCase().includes(normalized) ||
        (layer.description?.toLowerCase().includes(normalized) ?? false),
    );
  }, [layers, query]);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Không tải được danh sách lớp. Kiểm tra backend tại port 4000.
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <EmptyState
        icon={<LayersIcon />}
        title="Chưa có lớp dữ liệu"
        description="Khởi động backend và tạo lớp trong mục Quản trị để bắt đầu thu thập dữ liệu GIS."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{layers.length}</span>{" "}
          lớp dữ liệu
          {query && (
            <>
              {" "}
              ·{" "}
              <span className="font-medium text-foreground">
                {filteredLayers.length}
              </span>{" "}
              kết quả
            </>
          )}
        </p>
        <label className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên lớp..."
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>

      {filteredLayers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy lớp"
          description={`Không có lớp nào khớp với "${query}".`}
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Xóa bộ lọc
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredLayers.map((layer) => (
            <Link
              key={layer.id}
              href={`/lop-du-lieu/${layer.code}`}
              className="group block h-full"
            >
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5",
                )}
              >
                <div
                  className="h-1.5"
                  style={{ backgroundColor: layer.color }}
                  aria-hidden
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <LayerSymbol layer={layer} size="lg" />
                    <LayerBadge
                      label={
                        geometryKindLabels[layer.geometryKind] ??
                        layer.geometryKind
                      }
                      color={layer.color}
                    />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary">
                    {layer.name}
                  </h3>
                  {layer.description ? (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
                      {layer.description}
                    </p>
                  ) : (
                    <p className="mt-2 flex-1 text-sm italic text-muted/80">
                      Chưa có mô tả
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted">
                    <span className="font-mono uppercase tracking-wide">
                      {layer.code}
                    </span>
                    <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Xem dữ liệu →
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
