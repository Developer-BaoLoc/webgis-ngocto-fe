"use client";

import type { RecordItem } from "@/types/api/records";
import type { SchemaField } from "@/types/api/schema";
import { formatCellValue, getDisplayFields } from "@/lib/schema/display";

interface RecordsTableProps {
  fields: SchemaField[];
  records: RecordItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

const locationStatusLabels: Record<string, string> = {
  unlocated: "Chưa ghim",
  point_placed: "Đã ghim điểm",
  polygon_drawn: "Đã vẽ vùng",
  imported: "Import",
};

export function RecordsTable({
  fields,
  records,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
}: RecordsTableProps) {
  const displayFields = getDisplayFields(fields);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
        <p className="font-medium text-foreground">Chưa có bản ghi</p>
        <p className="mt-1 text-sm text-muted">
          Import Excel hoặc tạo bản ghi mới để bắt đầu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50">
            <tr>
              {displayFields.map((field) => (
                <th
                  key={field.fieldId}
                  className="px-4 py-3 font-medium text-foreground"
                >
                  {field.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-foreground">Vị trí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50/80">
                {displayFields.map((field) => (
                  <td key={field.fieldId} className="px-4 py-3 text-muted">
                    {formatCellValue(record.properties[field.code])}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {record.locationStatus
                      ? (locationStatusLabels[record.locationStatus] ??
                        record.locationStatus)
                      : record.geometry
                        ? "Có tọa độ"
                        : "Chưa ghim"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && onPageChange && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {total} bản ghi · Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
