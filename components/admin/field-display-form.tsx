"use client";

import { inputClass } from "@/components/form/field-wrapper";
import { isDisplayOptionVisible } from "@/lib/fields/display-schema";
import type { FieldDisplayOptionsCatalog } from "@/types/api/metadata";

interface FieldDisplayFormProps {
  catalog: FieldDisplayOptionsCatalog;
  displaySchema: Record<string, unknown>;
  onChange: (displaySchema: Record<string, unknown>) => void;
}

export function FieldDisplayForm({
  catalog,
  displaySchema,
  onChange,
}: FieldDisplayFormProps) {
  const groups = catalog.groups.length
    ? catalog.groups
    : [{ key: "default", label: "Hiển thị trên bản đồ" }];

  function update(key: string, value: unknown) {
    const next = { ...displaySchema, [key]: value };
    if (key === "showOnMapPopup" && !value) {
      next.popupBold = false;
      next.popupFontSize = "medium";
      next.popupTextColor = "";
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const options = catalog.options.filter(
          (option) => (option.group ?? "default") === group.key,
        );
        if (options.length === 0) return null;

        return (
          <div
            key={group.key}
            className="space-y-3 rounded-lg border border-border bg-slate-50 p-3"
          >
            <div>
              <p className="text-sm font-medium">{group.label}</p>
              {group.hint && (
                <p className="mt-0.5 text-xs text-muted">{group.hint}</p>
              )}
            </div>

            {options.map((option) => {
              if (!isDisplayOptionVisible(option, displaySchema)) return null;

              if (option.type === "boolean") {
                return (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(displaySchema[option.key])}
                      onChange={(e) => update(option.key, e.target.checked)}
                    />
                    {option.label}
                  </label>
                );
              }

              if (option.type === "select") {
                return (
                  <div key={option.key}>
                    <label className="block text-sm font-medium">
                      {option.label}
                    </label>
                    <select
                      className={inputClass}
                      value={String(displaySchema[option.key] ?? option.default ?? "")}
                      onChange={(e) => update(option.key, e.target.value)}
                    >
                      {(option.options ?? []).map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (option.type === "color") {
                const colorValue = String(displaySchema[option.key] ?? "");
                return (
                  <div key={option.key}>
                    <label className="block text-sm font-medium">
                      {option.label}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={colorValue || "#2563eb"}
                        onChange={(e) => update(option.key, e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border bg-white p-0.5"
                      />
                      <input
                        type="text"
                        className={inputClass}
                        value={colorValue}
                        onChange={(e) => update(option.key, e.target.value)}
                        placeholder="Mặc định"
                      />
                      {colorValue && (
                        <button
                          type="button"
                          onClick={() => update(option.key, "")}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        );
      })}
    </div>
  );
}
