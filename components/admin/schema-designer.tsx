"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LayerBadge } from "@/components/ui/badge";
import { getLayerById } from "@/lib/api/layers-admin";
import { getFieldTypes, getFieldDisplayOptions } from "@/lib/api/metadata";
import { getDictionaries } from "@/lib/api/dictionaries";
import {
  addSchemaField,
  createSchemaDraft,
  deleteSchemaField,
  getLayerSchemaDraft,
  getSchemaDraft,
  updateSchemaField,
} from "@/lib/api/schema-drafts";
import {
  buildDisplaySchemaForSave,
  DEFAULT_FIELD_DISPLAY_OPTIONS,
} from "@/lib/fields/display-schema";
import { validateFieldDataSchema } from "@/lib/fields/field-config";
import { enrichFieldTypes } from "@/lib/i18n/vi";
import { cn } from "@/lib/utils";
import {
  FieldFormModalContent,
  fieldToFormPayload,
} from "@/components/admin/field-form-modal";
import { AdminSubNav } from "@/components/admin/admin-sub-nav";
import { SchemaFieldList } from "@/components/admin/schema-field-list";
import type {
  AdminLayer,
  CreateFieldPayload,
  SchemaDraft,
} from "@/types/api/admin";
import type {
  FieldDisplayOptionsCatalog,
  FieldTypeMeta,
} from "@/types/api/metadata";
import type { SchemaField } from "@/types/api/schema";
import { geometryKindLabels } from "@/types/layer.types";

const emptyField: CreateFieldPayload = {
  label: "",
  fieldType: "text",
  dataSchema: {},
  displaySchema: {},
  sortOrder: 1,
};

const toolbarBtn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors";

interface SchemaDesignerProps {
  layerId: string;
}

async function resolveDraft(
  layerId: string,
  layer: AdminLayer,
): Promise<SchemaDraft> {
  try {
    return await getLayerSchemaDraft(layerId);
  } catch {
    let schemaId = layer.draftSchemaId;
    if (!schemaId) {
      const newDraft = await createSchemaDraft(layerId);
      schemaId = newDraft.id;
    }
    return getSchemaDraft(schemaId);
  }
}

function schemaStatusLabel(status?: string): string | null {
  if (status === "published") return "Đã áp dụng";
  if (status === "draft") return "Đang chỉnh sửa";
  return null;
}

export function SchemaDesigner({ layerId }: SchemaDesignerProps) {
  const [layer, setLayer] = useState<AdminLayer | null>(null);
  const [draft, setDraft] = useState<SchemaDraft | null>(null);
  const [fieldTypes, setFieldTypes] = useState<FieldTypeMeta[]>([]);
  const [displayOptions, setDisplayOptions] =
    useState<FieldDisplayOptionsCatalog>(DEFAULT_FIELD_DISPLAY_OPTIONS);
  const [dictionaryNames, setDictionaryNames] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<SchemaField | null>(null);
  const [fieldForm, setFieldForm] = useState(emptyField);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [layerData, types, dictionaries, displayCatalog] =
        await Promise.all([
          getLayerById(layerId),
          getFieldTypes().catch(() => []),
          getDictionaries().catch(() => []),
          getFieldDisplayOptions().catch(() => DEFAULT_FIELD_DISPLAY_OPTIONS),
        ]);
      setLayer(layerData);
      setFieldTypes(enrichFieldTypes(types));
      setDisplayOptions(displayCatalog);
      setDictionaryNames(
        Object.fromEntries(dictionaries.map((d) => [d.code, d.name])),
      );
      setDraft(await resolveDraft(layerId, layerData));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không tải được cấu trúc dữ liệu",
      );
    } finally {
      setIsLoading(false);
    }
  }, [layerId]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddField() {
    setEditingField(null);
    setFieldForm(emptyField);
    setShowFieldModal(true);
    setError(null);
  }

  function openEditField(field: SchemaField) {
    setEditingField(field);
    setFieldForm(fieldToFormPayload(field));
    setShowFieldModal(true);
    setError(null);
  }

  function closeFieldModal() {
    setShowFieldModal(false);
    setEditingField(null);
    setFieldForm(emptyField);
  }

  async function handleSaveField(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    const selectedType = fieldTypes.find((t) => t.type === fieldForm.fieldType);
    const configError = validateFieldDataSchema(
      fieldForm.fieldType,
      fieldForm.dataSchema ?? {},
      selectedType?.configFields,
    );
    if (configError) {
      setError(configError);
      return;
    }

    setIsSubmitting(true);
    try {
      const dataSchema: Record<string, unknown> = { ...fieldForm.dataSchema };
      if (fieldForm.dataSchema?.required) {
        dataSchema.required = true;
      } else {
        delete dataSchema.required;
      }

      const displaySchema = buildDisplaySchemaForSave(fieldForm.displaySchema);

      if (editingField) {
        await updateSchemaField(draft.id, editingField.fieldId, {
          label: fieldForm.label,
          dataSchema,
          displaySchema,
        });
      } else {
        await addSchemaField(draft.id, {
          label: fieldForm.label,
          fieldType: fieldForm.fieldType,
          dataSchema,
          displaySchema,
          sortOrder: (draft.fields?.length ?? 0) + 1,
        });
      }

      closeFieldModal();
      setError(null);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingField
            ? "Sửa trường thất bại"
            : "Thêm trường thất bại",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteField(field: SchemaField) {
    if (!draft || !confirm(`Ẩn trường "${field.label}"?`)) return;
    try {
      await deleteSchemaField(draft.id, field.fieldId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ẩn trường thất bại");
    }
  }

  const activeFields = draft?.fields?.filter((f) => f.isActive !== false) ?? [];
  const status = schemaStatusLabel(draft?.status);

  return (
    <div className="space-y-4">
      <AdminSubNav />

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/quan-tri/lop-du-lieu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-slate-50 hover:text-foreground"
              aria-label="Quay lại quản lý lớp"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-foreground">
                  {layer ? layer.name : "Cấu trúc dữ liệu"}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {layer && (
              <Link
                href={`/lop-du-lieu/${layer.code}`}
                className={cn(
                  toolbarBtn,
                  "bg-sky-600 text-white hover:bg-sky-700",
                )}
              >
                <DataIcon />
                Xem dữ liệu
              </Link>
            )}
            <button
              type="button"
              onClick={openAddField}
              className={cn(
                toolbarBtn,
                "bg-violet-600 text-white hover:bg-violet-700",
              )}
            >
              <PlusIcon />
              Thêm trường
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="p-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Đang tải danh sách trường...
              </span>
            </div>
          ) : activeFields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-slate-50/50 px-6 py-10 text-center">
              <p className="font-medium text-foreground">Chưa có trường nào</p>
              <p className="mt-1 text-sm text-muted">
                Thêm trường đầu tiên để bắt đầu nhập liệu cho lớp này.
              </p>
              <button
                type="button"
                onClick={openAddField}
                className={cn(
                  "mt-4",
                  toolbarBtn,
                  "bg-violet-600 text-white hover:bg-violet-700",
                )}
              >
                <PlusIcon />
                Thêm trường
              </button>
            </div>
          ) : draft ? (
            <SchemaFieldList
              draft={draft}
              dictionaryNames={dictionaryNames}
              onDraftChange={setDraft}
              onEdit={openEditField}
              onDelete={handleDeleteField}
              onError={setError}
            />
          ) : null}
        </div>
      </section>

      {showFieldModal && (
        <Modal
          title={editingField ? "Sửa trường" : "Thêm trường"}
          onClose={closeFieldModal}
        >
          <FieldFormModalContent
            fieldTypes={fieldTypes}
            displayOptions={displayOptions}
            form={fieldForm}
            editingField={editingField}
            isSubmitting={isSubmitting}
            onChange={setFieldForm}
            onSubmit={handleSaveField}
          />
        </Modal>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  );
}
