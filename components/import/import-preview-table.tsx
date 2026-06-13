import type { NormalizedPreview } from "@/lib/import/preview";
import { formatPreviewValue } from "@/lib/import/preview";

interface ImportPreviewTableProps {
  preview: NormalizedPreview;
}

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const displayHeaders = preview.headers.filter((h) => h !== "_row" && h !== "_errors");

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
        <p className="text-sm text-muted">
          Tổng {preview.totalRows} dòng trong file · Hiển thị{" "}
          {preview.rows.length} dòng preview
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 font-medium text-foreground">#</th>
              {allHeaders.map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium text-foreground">
                  {h === "_errors" ? "Lỗi" : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="px-3 py-2 text-muted">
                  {String(row._row ?? idx + 1)}
                </td>
                {allHeaders.map((h) => (
                  <td
                    key={h}
                    className={`px-3 py-2 ${h === "_errors" ? "text-red-600" : "text-muted"}`}
                  >
                    {formatPreviewValue(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
