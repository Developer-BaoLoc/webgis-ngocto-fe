"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { RecordItem } from "@/types/api/records";
import type { SchemaField } from "@/types/api/schema";
import { formatCellValue, getDisplayFields } from "@/lib/schema/display";
import { AttachmentImageGallery } from "@/components/ui/attachment-image-gallery";
import {
  buildDictionaryLabelMap,
  type DictionaryLabelMap,
} from "@/lib/dictionaries/labels";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeaderCell,
  DataTablePagination,
  DataTableRow,
  TableActionButton,
  TableActions,
} from "@/components/ui/data-table";

interface RecordsTableProps {
  fields: SchemaField[];
  records: RecordItem[];
  total: number;
  totalPages?: number;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (record: RecordItem) => void;
  onDelete?: (record: RecordItem) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  emptyAction?: ReactNode;
}

function TableCellContent({
  field,
  value,
  dictionaryLabels,
}: {
  field: SchemaField;
  value: unknown;
  dictionaryLabels: DictionaryLabelMap;
}) {
  if (field.fieldType === "image") {
    return <AttachmentImageGallery value={value} compact />;
  }

  const text = formatCellValue(value, field, dictionaryLabels);
  if (text === "—") {
    return <span className="text-muted">—</span>;
  }

  const relationshipStatus =
    field.fieldType === "relationship" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? String((value as { status?: unknown }).status ?? "")
      : "";
  const isMultiLine =
    field.fieldType === "multi_category" ||
    (field.fieldType === "relationship" && text.includes("\n"));
  const isRelationshipWarning =
    relationshipStatus === "empty" || relationshipStatus === "not_found";

  return (
    <span
      className={
        [
          isMultiLine ? "whitespace-pre-line text-sm" : "whitespace-nowrap text-sm",
          relationshipStatus === "empty" ? "text-amber-700" : "",
          relationshipStatus === "not_found" ? "text-red-700" : "",
          isRelationshipWarning ? "font-medium" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {text}
    </span>
  );
}

export function RecordsTable({
  fields,
  records,
  total,
  totalPages: totalPagesProp,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  isLoading,
  isRefreshing,
  emptyAction,
}: RecordsTableProps) {
  const displayFields = getDisplayFields(fields);
  const totalPages =
    totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  const [dictionaryLabels, setDictionaryLabels] = useState<DictionaryLabelMap>(
    new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    buildDictionaryLabelMap(fields)
      .then((map) => {
        if (!cancelled) setDictionaryLabels(map);
      })
      .catch(() => {
        if (!cancelled) setDictionaryLabels(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [fields]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Đang tải...
        </span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <DataTableEmpty
        title="Chưa có bản ghi"
        description="Tải mẫu Excel, import hoặc thêm bản ghi mới."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        {isRefreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Đang tải...
            </span>
          </div>
        )}

        <DataTable
        scrollable
        stickyHeader
        stickyActions
        maxHeight="min(68vh, 720px)"
        className="border-0 shadow-none"
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="w-12 px-3" align="center">
              STT
            </DataTableHeaderCell>
            {displayFields.map((field) => (
              <DataTableHeaderCell
                key={field.fieldId}
                className="whitespace-nowrap px-3"
              >
                {field.label}
              </DataTableHeaderCell>
            ))}
            {(onEdit || onDelete) && (
              <DataTableHeaderCell align="right" className="w-28 px-3">
                Thao tác
              </DataTableHeaderCell>
            )}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {records.map((record, index) => (
            <DataTableRow key={record.id}>
              <DataTableCell variant="index" className="px-3 py-2.5">
                {(page - 1) * pageSize + index + 1}
              </DataTableCell>
              {displayFields.map((field) => (
                <DataTableCell key={field.fieldId} className="px-3 py-2.5">
                  <TableCellContent
                    field={field}
                    value={record.properties[field.code]}
                    dictionaryLabels={dictionaryLabels}
                  />
                </DataTableCell>
              ))}
              {(onEdit || onDelete) && (
                <DataTableCell
                  variant="actions"
                  align="right"
                  className="px-3 py-2.5"
                >
                  <TableActions>
                    {onEdit && (
                      <TableActionButton
                        variant="primary"
                        size="sm"
                        onClick={() => onEdit(record)}
                      >
                        Sửa
                      </TableActionButton>
                    )}
                    {onDelete && (
                      <TableActionButton
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(record)}
                      >
                        Xóa
                      </TableActionButton>
                    )}
                  </TableActions>
                </DataTableCell>
              )}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      </div>

      {onPageChange && (
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
