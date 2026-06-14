"use client";

import { useEffect, useState } from "react";
import { reorderSchemaFields } from "@/lib/api/schema-drafts";
import { getFieldUnitLabel } from "@/lib/fields/units";
import { getFieldTypeLabel } from "@/lib/i18n/vi";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";
import type { SchemaDraft } from "@/types/api/admin";
import type { SchemaField } from "@/types/api/schema";

function sortActiveFields(fields: SchemaField[]): SchemaField[] {
  return fields
    .filter((field) => field.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

interface SchemaFieldListProps {
  draft: SchemaDraft;
  dictionaryNames: Record<string, string>;
  onDraftChange: (draft: SchemaDraft) => void;
  onEdit: (field: SchemaField) => void;
  onDelete: (field: SchemaField) => void;
  onError: (message: string | null) => void;
}

export function SchemaFieldList({
  draft,
  dictionaryNames,
  onDraftChange,
  onEdit,
  onDelete,
  onError,
}: SchemaFieldListProps) {
  const [orderedFields, setOrderedFields] = useState<SchemaField[]>(() =>
    sortActiveFields(draft.fields ?? []),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    setOrderedFields(sortActiveFields(draft.fields ?? []));
  }, [draft]);

  async function persistOrder(nextFields: SchemaField[]) {
    const previous = orderedFields;
    setOrderedFields(nextFields);
    setIsReordering(true);
    onError(null);

    try {
      const updated = await reorderSchemaFields(
        draft.id,
        nextFields.map((field) => field.fieldId),
      );
      onDraftChange(updated);
      setOrderedFields(sortActiveFields(updated.fields ?? []));
    } catch (error) {
      setOrderedFields(previous);
      onError(
        error instanceof Error ? error.message : "Sắp xếp trường thất bại",
      );
    } finally {
      setIsReordering(false);
      setDraggingId(null);
      setDropTargetId(null);
    }
  }

  function moveField(fieldId: string, direction: "up" | "down") {
    const index = orderedFields.findIndex((field) => field.fieldId === fieldId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedFields.length) return;

    const next = [...orderedFields];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    void persistOrder(next);
  }

  function handleDragStart(fieldId: string) {
    if (isReordering) return;
    setDraggingId(fieldId);
    setDropTargetId(null);
  }

  function handleDragOver(event: React.DragEvent, fieldId: string) {
    event.preventDefault();
    if (!draggingId || draggingId === fieldId) return;
    setDropTargetId(fieldId);
  }

  function handleDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    if (!draggingId || draggingId === targetId) return;

    const fromIndex = orderedFields.findIndex(
      (field) => field.fieldId === draggingId,
    );
    const toIndex = orderedFields.findIndex(
      (field) => field.fieldId === targetId,
    );
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...orderedFields];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void persistOrder(next);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  return (
    <div>
      <DataTable
        minWidth="640px"
        scrollable
        stickyHeader
        stickyActions
        maxHeight="min(68vh, 720px)"
        className="border-0 shadow-none"
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="w-12 px-3">
              <span className="sr-only">Kéo thả</span>
            </DataTableHeaderCell>
            <DataTableHeaderCell className="w-14 px-3">#</DataTableHeaderCell>
            <DataTableHeaderCell className="px-3">Tên trường</DataTableHeaderCell>
            <DataTableHeaderCell className="px-3">Kiểu</DataTableHeaderCell>
            <DataTableHeaderCell className="px-3">Cấu hình</DataTableHeaderCell>
            <DataTableHeaderCell align="right" className="w-36 px-3">
              Thao tác
            </DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {orderedFields.map((field, index) => {
            const unitLabel = getFieldUnitLabel(
              field.fieldType,
              field.dataSchema ?? {},
            );
            const dictCode = field.dataSchema?.dictionary
              ? String(field.dataSchema.dictionary)
              : null;
            const maxCount = field.dataSchema?.maxCount
              ? Number(field.dataSchema.maxCount)
              : null;
            const isDragging = draggingId === field.fieldId;
            const isDropTarget =
              dropTargetId === field.fieldId && draggingId !== field.fieldId;

            return (
              <DataTableRow
                key={field.fieldId}
                className={
                  isDragging
                    ? "opacity-50"
                    : isDropTarget
                      ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      : undefined
                }
                onDragOver={(event) => handleDragOver(event, field.fieldId)}
                onDrop={(event) => handleDrop(event, field.fieldId)}
              >
                <DataTableCell className="w-12 px-2 py-2.5">
                  <button
                    type="button"
                    draggable={!isReordering}
                    disabled={isReordering}
                    onDragStart={() => handleDragStart(field.fieldId)}
                    onDragEnd={handleDragEnd}
                    className="flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted transition hover:bg-slate-100 hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Kéo để sắp xếp ${field.label}`}
                    title="Kéo để sắp xếp"
                  >
                    <GripIcon />
                  </button>
                </DataTableCell>
                <DataTableCell variant="index" className="px-3 py-2.5">
                  {index + 1}
                </DataTableCell>
                <DataTableCell variant="primary" className="px-3 py-2.5">
                  {field.label}
                </DataTableCell>
                <DataTableCell className="px-3 py-2.5">
                  <TableBadge variant="default">
                    {getFieldTypeLabel(field.fieldType)}
                  </TableBadge>
                </DataTableCell>
                <DataTableCell variant="muted" className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {unitLabel && (
                      <TableBadge variant="muted">{unitLabel}</TableBadge>
                    )}
                    {dictCode && (
                      <TableBadge variant="muted">
                        {dictionaryNames[dictCode] ?? "Danh mục"}
                      </TableBadge>
                    )}
                    {maxCount && (
                      <TableBadge variant="muted">Tối đa {maxCount}</TableBadge>
                    )}
                    {Boolean(field.dataSchema?.required) && (
                      <TableBadge variant="warning">Bắt buộc</TableBadge>
                    )}
                    {Boolean(field.displaySchema?.showOnMapPopup) && (
                      <TableBadge variant="success">Hiện trên bản đồ</TableBadge>
                    )}
                    {!unitLabel &&
                      !dictCode &&
                      !maxCount &&
                      !field.dataSchema?.required &&
                      !field.displaySchema?.showOnMapPopup && <span>—</span>}
                  </div>
                </DataTableCell>
                <DataTableCell
                  variant="actions"
                  align="right"
                  className="px-3 py-2.5"
                >
                  <TableActions>
                    <TableActionButton
                      variant="neutral"
                      disabled={index === 0 || isReordering}
                      onClick={() => moveField(field.fieldId, "up")}
                    >
                      ↑
                    </TableActionButton>
                    <TableActionButton
                      variant="neutral"
                      disabled={
                        index === orderedFields.length - 1 || isReordering
                      }
                      onClick={() => moveField(field.fieldId, "down")}
                    >
                      ↓
                    </TableActionButton>
                    <TableActionButton
                      variant="primary"
                      onClick={() => onEdit(field)}
                    >
                      Sửa
                    </TableActionButton>
                    <TableActionButton
                      variant="danger"
                      onClick={() => onDelete(field)}
                    >
                      Ẩn
                    </TableActionButton>
                  </TableActions>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      {isReordering && (
        <p className="mt-2 text-xs text-muted">Đang lưu thứ tự...</p>
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}
