"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { LayerFilterControl } from "@/components/map/layer-filter-control";
import { Modal } from "@/components/ui/modal";
import type {
  FieldFilterCondition,
  LayerFilterField,
} from "@/lib/map/layer-filters";
import { isFieldFilterActive } from "@/lib/map/layer-filters";

interface AllLayerFiltersDialogProps {
  layerName: string;
  fields: LayerFilterField[];
  filters: Record<string, FieldFilterCondition>;
  onApply: (filters: Record<string, FieldFilterCondition>) => void;
  onClose: () => void;
}

function compactFilters(
  filters: Record<string, FieldFilterCondition>,
): Record<string, FieldFilterCondition> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => isFieldFilterActive(value)),
  );
}

export function AllLayerFiltersDialog({
  layerName,
  fields,
  filters,
  onApply,
  onClose,
}: AllLayerFiltersDialogProps) {
  const [draft, setDraft] = useState<Record<string, FieldFilterCondition>>(
    () => ({ ...filters }),
  );

  return createPortal(
    <Modal title={`Tất cả bộ lọc · ${layerName}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Chọn nhiều giá trị trong cùng trường để lọc theo OR. Các trường khác
          nhau được kết hợp theo AND.
        </p>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          {fields.map((field) => (
            <fieldset
              key={field.key}
              className="min-w-0 rounded-xl border border-border bg-slate-50/60 p-3"
            >
              <legend className="px-1 text-sm font-semibold text-foreground">
                {field.label}
                <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted">
                  {fieldTypeLabel(field.type)}
                </span>
              </legend>
              <div className="mt-2">
                <LayerFilterControl
                  field={field}
                  value={draft[field.key]}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft({});
              onApply({});
            }}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Xóa tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(compactFilters(draft));
              onClose();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </Modal>,
    document.body,
  );
}

function fieldTypeLabel(type: LayerFilterField["type"]) {
  return {
    text: "Văn bản",
    category: "Danh sách",
    boolean: "Có / Không",
    number: "Khoảng số",
    currency: "Tiền tệ",
    date: "Khoảng ngày",
  }[type];
}
