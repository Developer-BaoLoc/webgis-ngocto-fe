"use client";

import { inputClass } from "@/components/form/field-wrapper";

interface DictionaryValuesInputProps {
  labels: string[];
  onChange: (labels: string[]) => void;
  disabled?: boolean;
}

export function DictionaryValuesInput({
  labels,
  onChange,
  disabled = false,
}: DictionaryValuesInputProps) {
  function updateLabel(index: number, value: string) {
    const next = [...labels];
    next[index] = value;
    onChange(next);
  }

  function addRow() {
    onChange([...labels, ""]);
  }

  function removeRow(index: number) {
    onChange(labels.filter((_, i) => i !== index));
  }

  const rows = labels.length > 0 ? labels : [""];

  return (
    <div className="space-y-2">
      {rows.map((label, index) => (
        <div key={index} className="flex gap-2">
          <input
            className={inputClass}
            value={label}
            disabled={disabled}
            onChange={(e) => updateLabel(index, e.target.value)}
            placeholder={`Giá trị ${index + 1} — vd. Trồng trọt`}
          />
          {rows.length > 1 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeRow(index)}
              className="shrink-0 rounded-lg border border-border px-3 text-sm text-muted hover:bg-slate-50 disabled:opacity-60"
              aria-label="Xóa dòng"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        className="text-sm text-primary hover:underline disabled:opacity-60"
      >
        + Thêm giá trị
      </button>
    </div>
  );
}

interface DictionaryBatchValuesInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DictionaryBatchValuesInput({
  value,
  onChange,
  disabled = false,
}: DictionaryBatchValuesInputProps) {
  return (
    <div>
      <textarea
        className={inputClass}
        rows={6}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Trồng trọt\nChăn nuôi\nDịch vụ bơm tưới"}
      />
      <p className="mt-1 text-xs text-muted">
        Mỗi dòng là một giá trị lựa chọn.
      </p>
    </div>
  );
}
