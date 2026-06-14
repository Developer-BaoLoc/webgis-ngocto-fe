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

interface LayerImportPreviewTableProps {
  preview: NormalizedPreview;
  fieldLabels?: Record<string, string>;
  maxColumns?: number;
}

export function LayerImportPreviewTable({
  preview,
  fieldLabels = {},
  maxColumns = 6,
}: LayerImportPreviewTableProps) {
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

                  return (
                    <DataTableCell key={key} variant="muted">
                      {formatPreviewValue(row[key])}
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
