"use client";

import { useEffect, useState } from "react";
import { AreaPolygonMapPicker } from "@/components/form/area-polygon-map-picker";
import {
  areaPolygonToLatLngPoints,
  areaPolygonVertexCount,
  buildAreaPolygonValue,
  parseAreaPolygonInput,
} from "@/lib/fields/area-polygon";
import { inputClass } from "./field-wrapper";

interface AreaPolygonFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

type PointInput = { lat: string; lng: string };

export function AreaPolygonField({
  value,
  onChange,
  required,
}: AreaPolygonFieldProps) {
  const [points, setPoints] = useState<PointInput[]>(() =>
    parseAreaPolygonInput(value),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setPoints(parseAreaPolygonInput(value));
  }, [value]);

  function emit(nextPoints: PointInput[]) {
    const built = buildAreaPolygonValue(nextPoints);
    if (built) {
      onChange(built);
      return;
    }
    const allEmpty = nextPoints.every(
      (point) => !point.lat.trim() && !point.lng.trim(),
    );
    if (allEmpty) {
      onChange(null);
    }
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
    if (points.length <= 3) return;
    const nextPoints = points.filter((_, i) => i !== index);
    setPoints(nextPoints);
    emit(nextPoints);
  }

  function applyPickedPolygon(picked: { coordinates: Array<{ lat: number; lng: number }> }) {
    const nextPoints = picked.coordinates.map((point) => ({
      lat: String(point.lat),
      lng: String(point.lng),
    }));
    setPoints(nextPoints);
    onChange(picked);
    setPickerOpen(false);
  }

  const pointCount = areaPolygonVertexCount(value);

  return (
    <div className="mt-1.5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <PolygonIcon />
          Vẽ trên bản đồ
        </button>
        <span className="text-xs text-muted">
          Hoặc nhập toạ độ thủ công — tối thiểu 3 điểm {pointCount > 0 && `(${pointCount} điểm)`}
        </span>
      </div>

      <p className="text-xs text-muted">
        Import Excel:{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          10.01,105.78; 10.02,105.79; 10.03,105.80
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
                Điểm {index + 1} — Vĩ độ (lat)
              </label>
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                className={inputClass}
                value={point.lat}
                required={required}
                placeholder="10.0125"
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
                placeholder="105.785"
                onChange={(e) => updatePoint(index, "lng", e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={points.length <= 3}
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

      <AreaPolygonMapPicker
        open={pickerOpen}
        initialValue={{ coordinates: areaPolygonToLatLngPoints(value) }}
        onClose={() => setPickerOpen(false)}
        onConfirm={applyPickedPolygon}
      />
    </div>
  );
}

function PolygonIcon() {
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
        d="M4.5 9.75 9 4.5l6 1.5 4.5 6.75-4.5 6-6-1.5L4.5 15V9.75Z"
      />
    </svg>
  );
}
