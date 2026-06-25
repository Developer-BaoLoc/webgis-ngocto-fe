"use client";

import { useMemo, useState } from "react";
import {
  emptyFieldFilter,
  type FieldFilterCondition,
  type LayerFilterField,
} from "@/lib/map/layer-filters";
import { cn } from "@/lib/utils";

interface LayerFilterControlProps {
  field: LayerFilterField;
  value?: FieldFilterCondition;
  onChange: (value: FieldFilterCondition) => void;
  compact?: boolean;
}

const OPTION_RENDER_LIMIT = 100;

export function LayerFilterControl({
  field,
  value,
  onChange,
  compact = false,
}: LayerFilterControlProps) {
  const current = value ?? emptyFieldFilter(field);

  if (field.type === "boolean") {
    return (
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {[
          { label: "Tất cả", value: null },
          { label: "Có", value: true },
          { label: "Không", value: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={current.booleanValue === option.value}
            onClick={() =>
              onChange({ type: "boolean", booleanValue: option.value })
            }
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              current.booleanValue === option.value
                ? "bg-white text-primary shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "number" || field.type === "currency") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Từ
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={current.min ?? ""}
            onChange={(event) =>
              onChange({
                ...current,
                type: field.type,
                min:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
            placeholder={field.min !== undefined ? String(field.min) : "Min"}
            className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="text-xs text-muted">
          Đến
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={current.max ?? ""}
            onChange={(event) =>
              onChange({
                ...current,
                type: field.type,
                max:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
            placeholder={field.max !== undefined ? String(field.max) : "Max"}
            className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div
        className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-2")}
      >
        <label className="text-xs text-muted">
          Từ ngày
          <input
            type="date"
            value={current.from ?? ""}
            onChange={(event) =>
              onChange({
                ...current,
                type: "date",
                from: event.target.value || null,
              })
            }
            className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="text-xs text-muted">
          Đến ngày
          <input
            type="date"
            value={current.to ?? ""}
            onChange={(event) =>
              onChange({
                ...current,
                type: "date",
                to: event.target.value || null,
              })
            }
            className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
    );
  }

  return (
    <CategoryFilterControl
      field={field}
      value={current}
      onChange={onChange}
      compact={compact}
    />
  );
}

function CategoryFilterControl({
  field,
  value,
  onChange,
  compact,
}: {
  field: LayerFilterField;
  value: FieldFilterCondition;
  onChange: (value: FieldFilterCondition) => void;
  compact: boolean;
}) {
  const [optionSearch, setOptionSearch] = useState("");
  const selectedValues = value.values ?? [];
  const matchingOptions = useMemo(() => {
    const query = normalizeFilterSearch(optionSearch);
    if (!query) return field.options;
    return field.options.filter((option) => {
      const searchable = option.searchText || `${option.label} ${option.value}`;
      return normalizeFilterSearch(searchable).includes(query);
    });
  }, [field.options, optionSearch]);
  const visibleOptions = matchingOptions.slice(0, OPTION_RENDER_LIMIT);

  function toggle(optionValue: string) {
    const selected = new Set(selectedValues);
    if (selected.has(optionValue)) selected.delete(optionValue);
    else selected.add(optionValue);
    onChange({ type: field.type, values: [...selected] });
  }

  return (
    <div className="space-y-2">
      {(field.options.length >= 6 || field.type === "text") && (
        <div className="relative">
          <input
            type="search"
            value={optionSearch}
            onChange={(event) => setOptionSearch(event.target.value)}
            placeholder="Tìm giá trị..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-8 text-sm text-foreground outline-none focus:border-primary"
          />
          <SearchIcon />
          {optionSearch && (
            <button
              type="button"
              onClick={() => setOptionSearch("")}
              aria-label="Xóa tìm giá trị"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "space-y-1 overflow-y-auto",
          compact ? "max-h-52" : "max-h-48",
        )}
      >
        {visibleOptions.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <span className="text-xs tabular-nums text-muted">
              {option.count}
            </span>
          </label>
        ))}
        {visibleOptions.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted">
            Không tìm thấy giá trị.
          </p>
        )}
      </div>
      {matchingOptions.length > OPTION_RENDER_LIMIT && (
        <p className="px-2 text-[11px] text-muted">
          Hiển thị {OPTION_RENDER_LIMIT}/{matchingOptions.length} giá trị. Nhập
          thêm từ khóa để thu hẹp.
        </p>
      )}
    </div>
  );
}

function normalizeFilterSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .trim();
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
