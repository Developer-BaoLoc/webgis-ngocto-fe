import { logAuditAction } from "@/lib/audit/audit-log";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface DataExportOptions {
  fileName: string;
  title: string;
  rows: Array<Record<string, unknown>>;
  columns?: ExportColumn[];
  includeGeometry?: boolean;
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "du-lieu"
  );
}

function isGeometryKey(key: string) {
  return /^(geometry|geom|geojson|wkt)$/i.test(key);
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString("vi-VN");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function exportColumns(options: DataExportOptions) {
  const inferred = Array.from(
    new Set(options.rows.flatMap((row) => Object.keys(row))),
  ).map((key) => ({ key, label: key }));
  return (options.columns?.length ? options.columns : inferred).filter(
    (column) => options.includeGeometry || !isGeometryKey(column.key),
  );
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  let text = String(normalizeCell(value));
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportToCSV(options: DataExportOptions) {
  const columns = exportColumns(options);
  const lines = [
    ["Tên bảng/layer", options.title],
    ["Thời gian xuất", new Date().toLocaleString("vi-VN")],
    ["Tổng số bản ghi", options.rows.length],
    [],
    columns.map((column) => column.label),
    ...options.rows.map((row) => columns.map((column) => row[column.key])),
  ].map((row) => row.map(csvCell).join(","));
  const fileName = `${safeFileName(options.fileName)}-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(
    new Blob(["\uFEFF", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    fileName,
  );
  logAuditAction({
    action: "data.export",
    objectType: "csv",
    objectName: options.title,
    metadata: { records: options.rows.length },
  });
  return fileName;
}

export async function exportToExcel(options: DataExportOptions) {
  const columns = exportColumns(options);
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const data = [
    [{ value: options.title, fontWeight: "bold" as const, fontSize: 16 }],
    [{ value: `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}` }],
    [{ value: `Tổng số bản ghi: ${options.rows.length}` }],
    columns.map((column) => ({ value: column.label, fontWeight: "bold" as const, backgroundColor: "#E2E8F0" })),
    ...options.rows.map((row) =>
      columns.map((column) => {
        const value = normalizeCell(row[column.key]);
        return { value: typeof value === "number" || typeof value === "boolean" ? value : String(value) };
      }),
    ),
  ];
  const fileName = `${safeFileName(options.fileName)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await writeXlsxFile(data, {
    columns: columns.map((column) => ({
      width: Math.min(40, Math.max(14, column.label.length + 4)),
    })),
  }).toFile(fileName);
  logAuditAction({
    action: "data.export",
    objectType: "excel",
    objectName: options.title,
    metadata: { records: options.rows.length },
  });
  return fileName;
}
