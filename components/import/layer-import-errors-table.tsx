import type { LayerImportValidationError } from "@/types/api/import";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableBadge,
} from "@/components/ui/data-table";

interface LayerImportErrorsTableProps {
  errors: LayerImportValidationError[];
}

function formatRawValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function LayerImportErrorsTable({ errors }: LayerImportErrorsTableProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Danh sách lỗi
        </h3>
        <TableBadge variant="danger">{errors.length} lỗi</TableBadge>
      </div>

      <div className="max-h-72 overflow-auto rounded-xl border border-border">
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell className="w-16">Dòng</DataTableHeaderCell>
              <DataTableHeaderCell className="min-w-[8rem]">Cột</DataTableHeaderCell>
              <DataTableHeaderCell className="min-w-[8rem]">Giá trị</DataTableHeaderCell>
              <DataTableHeaderCell>Lỗi</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {errors.map((item, index) => (
              <DataTableRow key={`${item.rowNumber}-${item.field ?? index}`}>
                <DataTableCell variant="index">{item.rowNumber}</DataTableCell>
                <DataTableCell variant="primary">
                  {item.fieldLabel ?? item.field ?? "—"}
                </DataTableCell>
                <DataTableCell variant="muted" className="max-w-[12rem] truncate">
                  {formatRawValue(item.rawValue)}
                </DataTableCell>
                <DataTableCell className="text-red-600">
                  {item.message}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
