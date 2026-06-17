"use client";

import { useState } from "react";
import { DynamicField } from "@/components/form/dynamic-field";
import { createRecord, updateRecord } from "@/lib/api/records";
import { getDisplayFields } from "@/lib/schema/display";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { normalizeAreaPolygonProperty, validateAreaPolygonProperty } from "@/lib/fields/area-polygon";
import { normalizeLatLngProperty } from "@/lib/fields/lat-lng";
import type { RecordItem } from "@/types/api/records";
import type { LayerSchema } from "@/types/api/schema";
import type { SchemaField } from "@/types/api/schema";

interface RecordFormProps {
  layerId: string;
  schema: LayerSchema;
  record?: RecordItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordForm({
  layerId,
  schema,
  record,
  onSuccess,
  onCancel,
}: RecordFormProps) {
  const fields = getDisplayFields(schema.fields);
  const isEdit = !!record;

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (record) return { ...record.properties };
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.fieldType === "boolean") init[f.code] = false;
      if (f.fieldType === "image" || f.fieldType === "file") {
        init[f.code] = [];
      }
    }
    return init;
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setFieldValue(code: string, value: unknown) {
    setValues((prev) => ({ ...prev, [code]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }

  function normalizeProperties(
    props: Record<string, unknown>,
    schemaFields: SchemaField[],
  ): Record<string, unknown> {
    const result = { ...props };
    for (const field of schemaFields) {
      if (field.fieldType === "lat_lng") {
        const normalized = normalizeLatLngProperty(result[field.code]);
        if (normalized === null) {
          delete result[field.code];
        } else {
          result[field.code] = normalized;
        }
        continue;
      }

      if (field.fieldType === "area_polygon") {
        const normalized = normalizeAreaPolygonProperty(result[field.code]);
        if (normalized === null) {
          delete result[field.code];
        } else {
          result[field.code] = normalized;
        }
        continue;
      }

      if (
        field.fieldType === "money" ||
        field.fieldType === "measurement" ||
        field.fieldType === "quantity"
      ) {
        const raw = result[field.code];
        if (raw === null || raw === undefined || raw === "") {
          delete result[field.code];
          continue;
        }
        if (typeof raw === "number") {
          result[field.code] = { value: raw };
          continue;
        }
        if (typeof raw === "object" && raw !== null && "value" in raw) {
          const obj = raw as { value: unknown };
          if (obj.value === null || obj.value === undefined || obj.value === "") {
            delete result[field.code];
          } else {
            result[field.code] = { value: Number(obj.value) };
          }
        }
      }

      if (field.fieldType === "relationship") {
        const raw = result[field.code];
        if (raw === null || raw === undefined || raw === "") {
          delete result[field.code];
          continue;
        }
        if (typeof raw === "object" && raw !== null) {
          const value =
            (raw as { value?: unknown; id?: unknown }).value ??
            (raw as { id?: unknown }).id;
          if (value === null || value === undefined || value === "") {
            delete result[field.code];
          } else {
            result[field.code] = String(value);
          }
        }
      }

      if (field.fieldType === "image" || field.fieldType === "file") {
        const attachments = normalizeAttachmentList(result[field.code]);
        if (attachments.length === 0) {
          delete result[field.code];
        } else {
          result[field.code] = attachments.map((item) => ({
            attachmentId: item.attachmentId,
            ...(item.url ? { url: item.url } : {}),
            ...(item.originalName ? { originalName: item.originalName } : {}),
          }));
        }
      }
    }
    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nextFieldErrors: Record<string, string> = {};
    for (const field of fields) {
      const required = Boolean(field.dataSchema?.required);
      if (field.fieldType === "area_polygon") {
        const message = validateAreaPolygonProperty(values[field.code], required);
        if (message) nextFieldErrors[field.code] = message;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Vui lòng kiểm tra lại các trường bắt buộc.");
      return;
    }

    setIsSubmitting(true);

    const properties = normalizeProperties(values, fields);

    try {
      if (isEdit && record) {
        await updateRecord(layerId, record.id, {
          rowVersion: record.rowVersion ?? 1,
          properties,
        });
      } else {
        await createRecord(layerId, { properties });
      }
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lưu thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.fieldId}
            className={
              field.fieldType === "textarea" ||
              field.fieldType === "lat_lng" ||
              field.fieldType === "area_polygon"
                ? "sm:col-span-2"
                : undefined
            }
          >
            <DynamicField
              field={field}
              value={values[field.code]}
              onChange={(v) => setFieldValue(field.code, v)}
              error={fieldErrors[field.code]}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo bản ghi"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-slate-50"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
