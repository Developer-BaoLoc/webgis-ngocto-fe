"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AllLayerFiltersDialog } from "@/components/map/all-layer-filters-dialog";
import { LayerFilterControl } from "@/components/map/layer-filter-control";
import type { LayerGeoJsonEntry } from "@/lib/api/map-geojson";
import {
  countActiveLayerFilters,
  emptyFieldFilter,
  EMPTY_LAYER_FILTER,
  filterFeatureCollection,
  getLayerFilterFields,
  getSuggestedFilterFields,
  isFieldFilterActive,
  type FieldFilterCondition,
  type LayerFilters,
  type LayerFilterField,
  type LayerFilterState,
} from "@/lib/map/layer-filters";
import { cn } from "@/lib/utils";
import type { Layer } from "@/types/layer.types";

interface MapLayerFilterChipsProps {
  visibleLayers: Layer[];
  entries: LayerGeoJsonEntry[];
  loaded: boolean;
  activeLayerId: string | null;
  layerFilters: LayerFilters;
  onActiveLayerChange: (layerId: string | null) => void;
  onLayerFiltersChange: (layerId: string, filter: LayerFilterState) => void;
}

export function MapLayerFilterChips({
  visibleLayers,
  entries,
  loaded,
  activeLayerId,
  layerFilters,
  onActiveLayerChange,
  onLayerFiltersChange,
}: MapLayerFilterChipsProps) {
  const [quickFilter, setQuickFilter] = useState<{
    layerId: string;
    field: LayerFilterField;
  } | null>(null);
  const [quickDraft, setQuickDraft] = useState<FieldFilterCondition | null>(
    null,
  );
  const [showAllFilters, setShowAllFilters] = useState(false);
  const quickPanelRef = useRef<HTMLDivElement>(null);

  const entryMap = useMemo(
    () => new Map(entries.map((entry) => [entry.layer.id, entry])),
    [entries],
  );
  const activeLayer = visibleLayers.find((layer) => layer.id === activeLayerId);
  const activeEntry = activeLayerId ? entryMap.get(activeLayerId) : undefined;
  const activeFields = useMemo(
    () => getLayerFilterFields(activeEntry),
    [activeEntry],
  );
  const suggestedFields = useMemo(
    () => getSuggestedFilterFields(activeFields),
    [activeFields],
  );
  const activeFilter = activeLayerId
    ? (layerFilters[activeLayerId] ?? EMPTY_LAYER_FILTER)
    : EMPTY_LAYER_FILTER;
  const quickField =
    quickFilter?.layerId === activeLayerId ? quickFilter.field : null;
  const filteredFeatureCount = activeEntry
    ? filterFeatureCollection(activeEntry.geojson, activeFilter).features.length
    : 0;

  useEffect(() => {
    if (!quickField) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!quickPanelRef.current?.contains(event.target as Node)) {
        setQuickFilter(null);
        setQuickDraft(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickFilter(null);
        setQuickDraft(null);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [quickField]);

  if (!visibleLayers.length) return null;

  function updateActiveFilter(next: LayerFilterState) {
    if (activeLayerId) onLayerFiltersChange(activeLayerId, next);
  }

  function openQuickFilter(field: LayerFilterField) {
    if (!activeLayerId) return;
    if (
      quickFilter?.layerId === activeLayerId &&
      quickFilter.field.key === field.key
    ) {
      setQuickFilter(null);
      setQuickDraft(null);
      return;
    }
    setQuickFilter({ layerId: activeLayerId, field });
    setQuickDraft(
      activeFilter.fieldFilters[field.key] ?? emptyFieldFilter(field),
    );
  }

  function applyField(fieldKey: string, value: FieldFilterCondition) {
    const fieldFilters = { ...activeFilter.fieldFilters };
    if (isFieldFilterActive(value)) fieldFilters[fieldKey] = value;
    else delete fieldFilters[fieldKey];
    updateActiveFilter({ ...activeFilter, fieldFilters });
  }

  function clearField(fieldKey: string) {
    const fieldFilters = { ...activeFilter.fieldFilters };
    delete fieldFilters[fieldKey];
    updateActiveFilter({ ...activeFilter, fieldFilters });
  }

  return (
    <div className="pointer-events-none absolute left-3 right-14 top-3 z-20">
      <div className="pointer-events-auto overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full gap-2 pr-2">
          {visibleLayers.map((layer) => {
            const active = layer.id === activeLayerId;
            const filterCount = countActiveLayerFilters(layerFilters[layer.id]);
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => {
                  setQuickFilter(null);
                  setQuickDraft(null);
                  setShowAllFilters(false);
                  onActiveLayerChange(active ? null : layer.id);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-white shadow-md"
                    : "border-border bg-white/95 text-foreground hover:border-primary/40 hover:bg-white",
                )}
                aria-pressed={active}
              >
                <span>{layer.name}</span>
                {filterCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {filterCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeLayer && (
        <div
          ref={quickPanelRef}
          className="pointer-events-auto relative mt-1.5 w-fit max-w-full rounded-2xl border border-border bg-white/95 p-2 shadow-lg backdrop-blur-sm"
        >
          {!loaded ? (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
              Đang tải dữ liệu bộ lọc…
            </div>
          ) : !activeEntry ? (
            <p className="px-2 py-1.5 text-sm text-muted">
              Lớp chưa có dữ liệu để lọc.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex max-w-[min(52rem,calc(100vw-5rem))] items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <LayerSearchInput
                  value={activeFilter.searchText}
                  onChange={(searchText) =>
                    updateActiveFilter({ ...activeFilter, searchText })
                  }
                />
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums",
                    filteredFeatureCount === 0 ? "text-red-700" : "text-muted",
                  )}
                >
                  Hiển thị {filteredFeatureCount}/
                  {activeEntry.geojson.features.length} đối tượng
                </span>
              </div>

              <div className="flex max-w-[min(52rem,calc(100vw-5rem))] items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestedFields.map((field) => {
                  const value = activeFilter.fieldFilters[field.key];
                  const badge = fieldFilterBadge(value);
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "relative flex shrink-0 items-center overflow-visible rounded-full border",
                        isFieldFilterActive(value)
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-white text-foreground",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openQuickFilter(field)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-slate-50/70"
                        aria-expanded={quickField?.key === field.key}
                      >
                        {field.label}
                        {badge > 0 && (
                          <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">
                            {badge}
                          </span>
                        )}
                        <ChevronDownIcon />
                      </button>
                      {isFieldFilterActive(value) && (
                        <button
                          type="button"
                          onClick={() => {
                            clearField(field.key);
                            if (quickField?.key === field.key) {
                              setQuickFilter(null);
                              setQuickDraft(null);
                            }
                          }}
                          className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                          aria-label={`Xóa lọc ${field.label}`}
                          title="Xóa lọc"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowAllFilters(true)}
                  disabled={activeFields.length === 0}
                  className="shrink-0 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tất cả bộ lọc
                </button>
                {countActiveLayerFilters(activeFilter) > 0 && (
                  <button
                    type="button"
                    onClick={() => updateActiveFilter(EMPTY_LAYER_FILTER)}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {filteredFeatureCount === 0 && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  Không có đối tượng phù hợp bộ lọc.
                </p>
              )}
            </div>
          )}

          {quickField && quickDraft && (
            <QuickFilterPopover
              field={quickField}
              value={quickDraft}
              onChange={setQuickDraft}
              onApply={() => {
                applyField(quickField.key, quickDraft);
                setQuickFilter(null);
                setQuickDraft(null);
              }}
              onClear={() => {
                clearField(quickField.key);
                setQuickFilter(null);
                setQuickDraft(null);
              }}
            />
          )}
        </div>
      )}

      {showAllFilters && activeLayer && (
        <AllLayerFiltersDialog
          layerName={activeLayer.name}
          fields={activeFields}
          filters={activeFilter.fieldFilters}
          onApply={(fieldFilters) =>
            updateActiveFilter({ ...activeFilter, fieldFilters })
          }
          onClose={() => setShowAllFilters(false)}
        />
      )}
    </div>
  );
}

function LayerSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-64 shrink-0 sm:w-72">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm trong lớp đang chọn..."
        aria-label="Tìm trong lớp đang chọn"
        className="w-full rounded-full border border-border bg-white py-1.5 pl-8 pr-8 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
      <SearchIcon />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xóa tìm kiếm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
        >
          ×
        </button>
      )}
    </div>
  );
}

function QuickFilterPopover({
  field,
  value,
  onChange,
  onApply,
  onClear,
}: {
  field: LayerFilterField;
  value: FieldFilterCondition;
  onChange: (value: FieldFilterCondition) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-border bg-white p-3 text-foreground shadow-xl">
      <p className="mb-2 text-sm font-semibold">{field.label}</p>
      <LayerFilterControl
        field={field}
        value={value}
        onChange={onChange}
        compact
      />
      <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Xóa lọc
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function fieldFilterBadge(value: FieldFilterCondition | undefined) {
  if (!isFieldFilterActive(value)) return 0;
  if (value?.type === "text" || value?.type === "category") {
    return value.values?.length ?? 0;
  }
  return 1;
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="8.5" cy="8.5" r="5" />
      <path strokeLinecap="round" d="m12.5 12.5 4 4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
    </svg>
  );
}
