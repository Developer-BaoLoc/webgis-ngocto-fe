import type { NormalizedPreview } from "@/lib/import/preview";
import { formatPreviewValue } from "@/lib/import/preview";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableBadge,
} from "@/components/ui/data-table";

interface ImportPreviewTableProps {
  preview: NormalizedPreview;
}

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const displayHeaders = preview.headers.filter(
    (h) => h !== "_row" && h !== "_errors",
  );

  if (preview.rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Không có dòng preview. Kiểm tra sheet và template đã chọn.
      </p>
    );
  }

  const allHeaders =
    preview.rows.some((r) => r._errors) && !displayHeaders.includes("_errors")
      ? [...displayHeaders, "_errors"]
      : displayHeaders;

  return (
    <div className="space-y-3">
      {preview.totalRows !== undefined && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <TableBadge variant="default">
            {preview.totalRows} dòng trong file
          </TableBadge>
          <span>·</span>
          <span>Hiển thị {preview.rows.length} dòng preview</span>
        </div>
      )}

      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="w-14">#</DataTableHeaderCell>
            {allHeaders.map((h) => (
              <DataTableHeaderCell key={h}>
                {h === "_errors" ? "Lỗi" : h}
              </DataTableHeaderCell>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {preview.rows.map((row, idx) => (
            <DataTableRow key={idx}>
              <DataTableCell variant="index">
                {String(row._row ?? idx + 1)}
              </DataTableCell>
              {allHeaders.map((h) => (
                <DataTableCell
                  key={h}
                  variant={h === "_errors" ? "default" : "muted"}
                  className={h === "_errors" ? "text-red-600" : undefined}
                >
                  {formatPreviewValue(row[h])}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
