"use client";

import { useEffect, useState } from "react";
import { LatLngMapPicker } from "@/components/form/lat-lng-map-picker";
import {
  buildLatLngValue,
  parseLatLngInput,
} from "@/lib/fields/lat-lng";
import { inputClass } from "./field-wrapper";

interface LatLngFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

export function LatLngField({ value, onChange, required }: LatLngFieldProps) {
  const [lat, setLat] = useState(() => parseLatLngInput(value).lat);
  const [lng, setLng] = useState(() => parseLatLngInput(value).lng);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const parsed = parseLatLngInput(value);
    setLat(parsed.lat);
    setLng(parsed.lng);
  }, [value]);

  function emit(nextLat: string, nextLng: string) {
    const built = buildLatLngValue(nextLat, nextLng);
    if (built) {
      onChange(built);
      return;
    }
    if (!nextLat.trim() && !nextLng.trim()) {
      onChange(null);
    }
  }

  function applyPickedCoordinates(picked: { lat: number; lng: number }) {
    const latText = String(picked.lat);
    const lngText = String(picked.lng);
    setLat(latText);
    setLng(lngText);
    onChange(picked);
    setPickerOpen(false);
  }

  return (
    <div className="mt-1.5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <MapPinIcon />
          Chọn trên bản đồ
        </button>
        <span className="text-xs text-muted">
          Hoặc nhập toạ độ thủ công bên dưới
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted">
            Vĩ độ (lat)
          </label>
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            className={inputClass}
            value={lat}
            required={required}
            placeholder="10.0125"
            onChange={(e) => {
              setLat(e.target.value);
              emit(e.target.value, lng);
            }}
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
            value={lng}
            required={required}
            placeholder="105.785"
            onChange={(e) => {
              setLng(e.target.value);
              emit(lat, e.target.value);
            }}
          />
        </div>
      </div>

      <LatLngMapPicker
        open={pickerOpen}
        initialValue={value}
        onClose={() => setPickerOpen(false)}
        onConfirm={applyPickedCoordinates}
      />
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M11.54 22.351c.07.04.15.06.24.06.09 0 .18-.02.26-.06 2.57-1.44 4.74-3.55 6.33-6.09 1.59-2.54 2.43-5.45 2.43-8.41 0-5.22-4.2-9.45-9.38-9.45S1.74 2.581 1.74 7.801c0 2.96.84 5.87 2.43 8.41 1.59 2.54 3.76 4.65 6.33 6.09.08.04.17.06.26.06.09 0 .17-.02.24-.06ZM12 13.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
