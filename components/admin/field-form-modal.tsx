"use client";

import { inputClass } from "@/components/form/field-wrapper";
import { FieldConfigForm } from "@/components/admin/field-config-form";
import { FieldDisplayForm } from "@/components/admin/field-display-form";
import { normalizeDisplaySchema } from "@/lib/fields/display-schema";
import { getFieldTypeLabel } from "@/lib/i18n/vi";
import type { CreateFieldPayload } from "@/types/api/admin";
import type { FieldDisplayOptionsCatalog, FieldTypeMeta } from "@/types/api/metadata";
import type { SchemaField } from "@/types/api/schema";

interface FieldFormModalContentProps {
  fieldTypes: FieldTypeMeta[];
  displayOptions: FieldDisplayOptionsCatalog;
  form: CreateFieldPayload;
  editingField: SchemaField | null;
  sourceLayerId?: string;
  isSubmitting: boolean;
  onChange: (form: CreateFieldPayload) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FieldFormModalContent({
  fieldTypes,
  displayOptions,
  form,
  editingField,
  sourceLayerId,
  isSubmitting,
  onChange,
  onSubmit,
}: FieldFormModalContentProps) {
  const isEdit = !!editingField;
  const selectedType = fieldTypes.find((t) => t.type === form.fieldType);
  const displaySchema = normalizeDisplaySchema(form.displaySchema);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Nhãn hiển thị</label>
        <input
          className={inputClass}
          required
          value={form.label}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          placeholder="Tên chủ thể"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Kiểu dữ liệu</label>
        {isEdit ? (
          <p className="mt-1 rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
            {getFieldTypeLabel(form.fieldType)}
          </p>
        ) : (
          <select
            className={inputClass}
            value={form.fieldType}
            onChange={(e) => {
              const nextType = e.target.value;
              const base: Record<string, unknown> = form.dataSchema?.required
                ? { required: true }
                : {};
              if (nextType === "image" || nextType === "file") {
                base.maxCount = 20;
              }
              if (nextType === "relationship") {
                base.relationType = "many-to-one";
                base.targetPrimaryKey = "id";
                base.notFoundAction = "error";
              }
              onChange({
                ...form,
                fieldType: nextType,
                dataSchema: base,
              });
            }}
          >
            {fieldTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label ?? getFieldTypeLabel(t.type)}
              </option>
            ))}
          </select>
        )}
      </div>

      <FieldConfigForm
        fieldType={form.fieldType}
        dataSchema={form.dataSchema ?? {}}
        configFields={selectedType?.configFields}
        sourceLayerId={sourceLayerId}
        fieldCode={editingField?.code}
        onChange={(dataSchema) =>
          onChange({
            ...form,
            dataSchema: {
              ...dataSchema,
              required: form.dataSchema?.required,
            },
          })
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(form.dataSchema?.required)}
          onChange={(e) =>
            onChange({
              ...form,
              dataSchema: {
                ...form.dataSchema,
                required: e.target.checked,
              },
            })
          }
        />
        Bắt buộc nhập
      </label>

      <FieldDisplayForm
        catalog={displayOptions}
        displaySchema={displaySchema}
        onChange={(nextDisplaySchema) =>
          onChange({ ...form, displaySchema: nextDisplaySchema })
        }
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSubmitting
          ? isEdit
            ? "Đang lưu..."
            : "Đang thêm..."
          : isEdit
            ? "Lưu thay đổi"
            : "Thêm trường"}
      </button>
    </form>
  );
}

export function fieldToFormPayload(field: SchemaField): CreateFieldPayload {
  return {
    label: field.label,
    fieldType: field.fieldType,
    dataSchema: { ...field.dataSchema },
    displaySchema: normalizeDisplaySchema(field.displaySchema),
    sortOrder: field.sortOrder,
  };
}
