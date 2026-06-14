"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedPreview } from "@/lib/import/preview";
import { formatPreviewValue } from "@/lib/import/preview";
import {
  buildDictionaryLabelMap,
  type DictionaryLabelMap,
} from "@/lib/dictionaries/labels";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableBadge,
} from "@/components/ui/data-table";
import type { SchemaField } from "@/types/api/schema";

interface LayerImportPreviewTableProps {
  preview: NormalizedPreview;
  fields?: SchemaField[];
  fieldLabels?: Record<string, string>;
  maxColumns?: number;
}

export function LayerImportPreviewTable({
  preview,
  fields = [],
  fieldLabels = {},
  maxColumns = 6,
}: LayerImportPreviewTableProps) {
  const [dictionaryLabels, setDictionaryLabels] = useState<DictionaryLabelMap>(
    new Map(),
  );

  const fieldByCode = useMemo(
    () => new Map(fields.map((field) => [field.code, field])),
    [fields],
  );

  useEffect(() => {
    if (!fields.length) {
      setDictionaryLabels(new Map());
      return;
    }

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

  const dataHeaders = preview.headers
    .filter((key) => key !== "_row" && key !== "_errors" && key !== "_valid")
    .slice(0, maxColumns);

  const headers = ["_valid", ...dataHeaders, "_errors"];

  if (preview.rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Không có dòng preview. Kiểm tra sheet Du_lieu (dữ liệu từ dòng 4).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {preview.totalRows !== undefined && (
          <TableBadge variant="default">{preview.totalRows} dòng trong file</TableBadge>
        )}
        {preview.previewCount !== undefined && (
          <>
            <span>·</span>
            <span>Preview {preview.previewCount} dòng</span>
          </>
        )}
        {preview.validCount !== undefined && (
          <>
            <span>·</span>
            <TableBadge variant="success">{preview.validCount} hợp lệ</TableBadge>
          </>
        )}
        {preview.errorCount !== undefined && preview.errorCount > 0 && (
          <>
            <span>·</span>
            <TableBadge variant="danger">{preview.errorCount} lỗi</TableBadge>
          </>
        )}
      </div>

      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="w-14">Dòng</DataTableHeaderCell>
            {headers.map((key) => (
              <DataTableHeaderCell key={key}>
                {key === "_valid"
                  ? "Trạng thái"
                  : key === "_errors"
                    ? "Lỗi"
                    : (fieldLabels[key] ?? key)}
              </DataTableHeaderCell>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {preview.rows.map((row, idx) => {
            const isValid = row._valid !== false;
            return (
              <DataTableRow key={idx}>
                <DataTableCell variant="index">
                  {String(row._row ?? idx + 1)}
                </DataTableCell>
                {headers.map((key) => {
                  if (key === "_valid") {
                    return (
                      <DataTableCell key={key}>
                        <TableBadge variant={isValid ? "success" : "danger"}>
                          {isValid ? "Hợp lệ" : "Lỗi"}
                        </TableBadge>
                      </DataTableCell>
                    );
                  }

                  if (key === "_errors") {
                    return (
                      <DataTableCell
                        key={key}
                        className="max-w-xs text-red-600"
                      >
                        {formatPreviewValue(row._errors)}
                      </DataTableCell>
                    );
                  }

                  const field = fieldByCode.get(key);
                  const text = formatPreviewValue(
                    row[key],
                    field,
                    dictionaryLabels,
                  );

                  return (
                    <DataTableCell key={key} variant="muted">
                      <span
                        className={
                          field?.fieldType === "multi_category"
                            ? "whitespace-pre-line text-sm"
                            : undefined
                        }
                      >
                        {text}
                      </span>
                    </DataTableCell>
                  );
                })}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      {preview.headers.length > maxColumns && (
        <p className="text-xs text-muted">
          Hiển thị {maxColumns} cột đầu trong bảng preview.
        </p>
      )}
    </div>
  );
}
