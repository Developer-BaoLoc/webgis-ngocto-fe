"use client";

import { useEffect, useState } from "react";
import { LineStringMapPicker } from "@/components/form/line-string-map-picker";
import {
  buildLineGeometryValue,
  formatLineGeometry,
  isLineGeometryValue,
  parseLineInput,
} from "@/lib/fields/line";
import { inputClass } from "./field-wrapper";

interface LineStringFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

type PointInput = { lat: string; lng: string };

export function LineStringField({
  value,
  onChange,
  required,
}: LineStringFieldProps) {
  const [points, setPoints] = useState<PointInput[]>(() =>
    parseLineInput(value),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setPoints(parseLineInput(value));
  }, [value]);

  function emit(nextPoints: PointInput[]) {
    const built = buildLineGeometryValue(nextPoints);
    if (built) {
      onChange(built);
      return;
    }
    const allEmpty = nextPoints.every(
      (point) => !point.lat.trim() && !point.lng.trim(),
    );
    if (allEmpty) onChange(null);
  }

  function updatePoint(index: number, key: "lat" | "lng", nextValue: string) {
    const nextPoints = points.map((point, i) =>
      i === index ? { ...point, [key]: nextValue } : point,
    );
    setPoints(nextPoints);
    emit(nextPoints);
  }

  function addPoint() {
    setPoints((prev) => [...prev, { lat: "", lng: "" }]);
  }

  function removePoint(index: number) {
    if (points.length <= 2) return;
    const nextPoints = points.filter((_, i) => i !== index);
    setPoints(nextPoints);
    emit(nextPoints);
  }

  function clearLine() {
    const next = [
      { lat: "", lng: "" },
      { lat: "", lng: "" },
    ];
    setPoints(next);
    onChange(null);
  }

  return (
    <div className="mt-1.5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <LineIcon />
          {isLineGeometryValue(value) ? "Chỉnh sửa đường" : "Vẽ đường"}
        </button>
        <button
          type="button"
          disabled={!isLineGeometryValue(value)}
          onClick={clearLine}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Xóa đường
        </button>
        <span className="text-xs text-muted">
          {formatLineGeometry(value)}. Tối thiểu 2 điểm.
        </span>
      </div>

      <p className="text-xs text-muted">
        Click để thêm các điểm trên bản đồ; các điểm sẽ được nối lại thành
        đường. Import Excel:{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          10.01,105.78; 10.02,105.79
        </code>
      </p>

      <div className="space-y-2">
        {points.map((point, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className="block text-xs font-medium text-muted">
                Điểm {index + 1} - Vĩ độ (lat)
              </label>
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                className={inputClass}
                value={point.lat}
                required={required}
                placeholder="9.4466"
                onChange={(e) => updatePoint(index, "lat", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                Kinh độ (lng)
              </label>
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                className={inputClass}
                value={point.lng}
                required={required}
                placeholder="105.9342"
                onChange={(e) => updatePoint(index, "lng", e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={points.length <= 2}
                onClick={() => removePoint(index)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPoint}
        className="rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-primary hover:border-primary/40 hover:bg-primary/5"
      >
        + Thêm điểm
      </button>

      <LineStringMapPicker
        open={pickerOpen}
        initialValue={value}
        onClose={() => setPickerOpen(false)}
        onConfirm={(picked) => {
          setPoints(parseLineInput(picked));
          onChange(picked);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function LineIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17 9 9l5 3 6-7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17h.01M9 9h.01M14 12h.01M20 5h.01"
      />
    </svg>
  );
}
