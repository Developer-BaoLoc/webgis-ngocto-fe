"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AttachmentImageGallery } from "@/components/ui/attachment-image-gallery";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { Modal } from "@/components/ui/modal";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
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
import { logAuditAction } from "@/lib/audit/audit-log";
import {
  buildDictionaryLabelMap,
  type DictionaryLabelMap,
} from "@/lib/dictionaries/labels";
import {
  exportToCSV,
  exportToExcel,
  type ExportColumn,
} from "@/lib/export/data-export";
import {
  recordMatchesFilters,
  recordMatchesSearch,
  type RecordFilters,
} from "@/lib/records/record-filter";
import {
  formatRecordValue,
  getRecordNumericValue,
  isMeasurementRecordValue,
  resolveMeasurementRecordValue,
  type MeasurementUnitMode,
} from "@/lib/records/format-record-value";
import {
  clearTablePreferences,
  loadTablePreferences,
  saveTablePreferences,
  tablePreferencesKey,
} from "@/lib/table/table-preferences";
import { useAuth } from "@/providers/auth-provider";
import { useMessage } from "@/providers/message-provider";
import type { RecordItem } from "@/types/api/records";
import type { SchemaField } from "@/types/api/schema";

interface RecordsTableProps {
  fields: SchemaField[];
  records: RecordItem[];
  total?: number;
  onEdit?: (record: RecordItem) => void;
  onDelete?: (record: RecordItem) => void;
  onRowClick?: (record: RecordItem) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  emptyAction?: ReactNode;
  tableName?: string;
  layerId?: string;
  tableId?: string;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;
type ExportScope = "all" | "filtered" | "selected";
type ExportFormat = "csv" | "excel";

function fieldKind(field: SchemaField) {
  const type = field.fieldType.toLowerCase();
  if (/number|integer|decimal|currency|float|double|numeric|money|measurement|quantity/.test(type)) return "number";
  if (/date|time/.test(type)) return "date";
  if (/select|enum|category|dictionary|boolean|status/.test(type)) return "select";
  return "text";
}

function fieldOptions(field: SchemaField, records: RecordItem[]) {
  const metadata =
    field.dictionaryItems?.flatMap((item) => {
      const value = item.value ?? item.code;
      return value === undefined
        ? []
        : [{ value: String(value), label: item.label ?? item.name ?? String(value) }];
    }) ?? [];
  if (metadata.length) return metadata;
  return Array.from(
    new Set(
      records
        .map((record) => record.properties[field.code])
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map(String),
    ),
  )
    .slice(0, 100)
    .map((value) => ({ value, label: value }));
}

function isMeasurementField(field: SchemaField, records: RecordItem[]) {
  return (
    field.fieldType === "measurement" ||
    field.fieldType === "quantity" ||
    records.some((record) =>
      isMeasurementRecordValue(record.properties[field.code], field),
    )
  );
}

function measurementModeLabels(field: SchemaField, records: RecordItem[]) {
  const sample = records
    .map((record) => record.properties[field.code])
    .find((value) => isMeasurementRecordValue(value, field));
  const source = resolveMeasurementRecordValue(sample, field, "source");
  const normalized = resolveMeasurementRecordValue(sample, field, "normalized");
  return {
    source: `Dùng đơn vị gốc${source?.unit ? ` (${source.unit})` : ""}`,
    normalized: `Dùng đơn vị chuẩn${normalized?.unit ? ` (${normalized.unit})` : ""}`,
  };
}

function TableCellContent({
  field,
  value,
  dictionaryLabels,
  measurementUnitMode,
}: {
  field: SchemaField;
  value: unknown;
  dictionaryLabels: DictionaryLabelMap;
  measurementUnitMode?: MeasurementUnitMode;
}) {
  if (field.fieldType === "image") {
    return <AttachmentImageGallery value={value} compact />;
  }
  const text = formatRecordValue(value, field, {
    dictionaryLabels,
    measurementUnitMode,
  });
  if (text === "—") return <span className="text-muted">—</span>;
  return (
    <span className="block max-w-[22rem] truncate text-sm" title={text}>
      {text}
    </span>
  );
}

function RecordValue({
  field,
  value,
  dictionaryLabels,
  measurementUnitMode,
}: {
  field: SchemaField;
  value: unknown;
  dictionaryLabels: DictionaryLabelMap;
  measurementUnitMode?: MeasurementUnitMode;
}) {
  if (field.fieldType === "image") {
    return <AttachmentImageGallery value={value} />;
  }
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
        {value}
      </a>
    );
  }
  const measurement = isMeasurementRecordValue(value, field);
  const formatted = formatRecordValue(value, field, {
    dictionaryLabels,
    measurementUnitMode,
    objectFallback: "json",
  });
  const summary = formatRecordValue(value, field, {
    dictionaryLabels,
    measurementUnitMode,
    objectFallback: "summary",
  });
  if (
    value &&
    typeof value === "object" &&
    field.fieldType !== "relationship" &&
    !measurement &&
    summary === "Dữ liệu cấu trúc"
  ) {
    return (
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
        {formatted}
      </pre>
    );
  }
  if (fieldKind(field) === "select" && formatted !== "—") {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{formatted}</span>;
  }
  return <span className="whitespace-pre-wrap break-words text-sm text-slate-800">{formatted}</span>;
}

function RecordViewDialog({
  record,
  fields,
  dictionaryLabels,
  measurementUnitModes,
  onClose,
}: {
  record: RecordItem;
  fields: SchemaField[];
  dictionaryLabels: DictionaryLabelMap;
  measurementUnitModes: Record<string, MeasurementUnitMode>;
  onClose: () => void;
}) {
  return (
    <Modal title="Chi tiết đối tượng" onClose={onClose} size="lg">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.fieldId} className="min-w-0 border-b border-slate-100 py-3">
            <p className="mb-1 text-xs font-semibold text-slate-500">{field.label}</p>
            <RecordValue
              field={field}
              value={record.properties[field.code]}
              dictionaryLabels={dictionaryLabels}
              measurementUnitMode={measurementUnitModes[field.code]}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function RecordsTable({
  fields,
  records,
  onEdit,
  onDelete,
  onRowClick,
  isLoading,
  isRefreshing,
  emptyAction,
  tableName = "Dữ liệu layer",
  layerId = "unknown-layer",
  tableId = "records",
}: RecordsTableProps) {
  const { user } = useAuth();
  const message = useMessage();
  const displayFields = useMemo(
    () =>
      [...fields]
        .filter((field) => field.isActive !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fields],
  );
  const defaultCodes = useMemo(
    () => displayFields.map((field) => field.code),
    [displayFields],
  );
  const preferenceKey = useMemo(
    () =>
      tablePreferencesKey({
        userId: user?.id ?? "anonymous",
        layerId,
        tableId,
      }),
    [layerId, tableId, user?.id],
  );
  const preferencesReady = useRef(false);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const [dictionaryLabels, setDictionaryLabels] = useState<DictionaryLabelMap>(new Map());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RecordFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(() => new Set(defaultCodes));
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultCodes);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [showGeometry, setShowGeometry] = useState(process.env.NODE_ENV === "development");
  const [measurementUnitModes, setMeasurementUnitModes] = useState<
    Record<string, MeasurementUnitMode>
  >({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exportScope, setExportScope] = useState<ExportScope>("filtered");
  const [exportRequest, setExportRequest] = useState<{ format: ExportFormat; scope: ExportScope } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<RecordItem | null>(null);

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

  useEffect(() => {
    preferencesReady.current = false;
    const timer = window.setTimeout(() => {
      const saved = loadTablePreferences(preferenceKey);
      const available = new Set(defaultCodes);
      if (saved) {
        setVisibleCodes(new Set(saved.visibleColumns.filter((code) => available.has(code))));
        setColumnWidths(saved.columnWidths);
        setSort(saved.sort && available.has(saved.sort.key) ? saved.sort : null);
        setPageSize(saved.pageSize);
        setColumnOrder([
          ...saved.columnOrder.filter((code) => available.has(code)),
          ...defaultCodes.filter((code) => !saved.columnOrder.includes(code)),
        ]);
        setShowGeometry(saved.showGeometry);
        setMeasurementUnitModes(saved.measurementUnitModes);
      } else {
        setVisibleCodes(new Set(defaultCodes));
        setColumnOrder(defaultCodes);
        setShowGeometry(process.env.NODE_ENV === "development");
        setMeasurementUnitModes({});
      }
      preferencesReady.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultCodes, preferenceKey]);

  useEffect(() => {
    if (!preferencesReady.current) return;
    const timer = window.setTimeout(
      () =>
        saveTablePreferences(preferenceKey, {
          visibleColumns: Array.from(visibleCodes),
          columnWidths,
          sort,
          pageSize,
          columnOrder,
          showGeometry,
          measurementUnitModes,
        }),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [columnOrder, columnWidths, measurementUnitModes, pageSize, preferenceKey, showGeometry, sort, visibleCodes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      if (searchInput.trim()) {
        logAuditAction({
          action: "layer.search",
          objectType: "layer",
          objectName: tableName,
          metadata: { queryLength: searchInput.trim().length },
        });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, tableName]);

  const orderedFields = useMemo(() => {
    const order = new Map(columnOrder.map((code, index) => [code, index]));
    return [...displayFields].sort(
      (a, b) =>
        (order.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.code) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [columnOrder, displayFields]);
  const visibleFields = orderedFields.filter((field) => visibleCodes.has(field.code));

  const filtered = useMemo(() => {
    const next = records.filter(
      (record) =>
        recordMatchesSearch(record, search, displayFields, {
          dictionaryLabels,
          measurementUnitModes,
        }) &&
        recordMatchesFilters(record, displayFields, filters, {
          measurementUnitModes,
        }),
    );
    if (!sort) return next;
    return [...next].sort((a, b) => {
      const left = a.properties[sort.key];
      const right = b.properties[sort.key];
      const sortField = displayFields.find((field) => field.code === sort.key);
      const numericLeft = sortField
        ? getRecordNumericValue(
            left,
            sortField,
            measurementUnitModes[sortField.code],
          )
        : null;
      const numericRight = sortField
        ? getRecordNumericValue(
            right,
            sortField,
            measurementUnitModes[sortField.code],
          )
        : null;
      const result =
        numericLeft !== null && numericRight !== null
          ? numericLeft - numericRight
          : String(left ?? "").localeCompare(String(right ?? ""), "vi");
      return sort.direction === "asc" ? result : -result;
    });
  }, [dictionaryLabels, displayFields, filters, measurementUnitModes, records, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = records.filter((record) => selectedIds.has(record.id));
  const activeFilterCount = Object.values(filters).filter((filter) =>
    Object.values(filter).some(Boolean),
  ).length;

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setFilters({});
    setPage(1);
    logAuditAction({
      action: "layer.filter",
      objectType: "layer",
      objectName: tableName,
      metadata: { reset: true },
    });
  }

  function updateFilter(code: string, patch: Record<string, string>) {
    setFilters((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }));
    setPage(1);
  }

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  function resetPreferences() {
    clearTablePreferences(preferenceKey);
    setVisibleCodes(new Set(defaultCodes));
    setColumnOrder(defaultCodes);
    setColumnWidths({});
    setSort(null);
    setPageSize(20);
    setShowGeometry(process.env.NODE_ENV === "development");
    setMeasurementUnitModes({});
    message.info("Đã khôi phục cấu hình bảng mặc định.");
  }

  function startColumnResize(event: React.MouseEvent, code: string) {
    event.preventDefault();
    event.stopPropagation();
    const header = event.currentTarget.parentElement;
    const startWidth = header?.getBoundingClientRect().width ?? 160;
    const startX = event.clientX;
    function resize(moveEvent: MouseEvent) {
      setColumnWidths((current) => ({
        ...current,
        [code]: Math.max(100, Math.min(520, startWidth + moveEvent.clientX - startX)),
      }));
    }
    function finish() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", finish);
    }
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", finish);
  }

  function recordsForScope(scope: ExportScope) {
    if (scope === "all") return records;
    if (scope === "selected") return selected;
    return filtered;
  }

  function formattedExportData(source: RecordItem[]) {
    const columns: ExportColumn[] = [
      { key: "stt", label: "STT" },
      ...visibleFields.map((field, index) => ({
        key: `field_${index}`,
        label: field.label,
      })),
    ];
    const rows = source.map((record, rowIndex) =>
      Object.fromEntries([
        ["stt", rowIndex + 1],
        ...visibleFields.map((field, fieldIndex) => [
          `field_${fieldIndex}`,
          formatRecordValue(record.properties[field.code], field, {
            dictionaryLabels,
            measurementUnitMode: measurementUnitModes[field.code],
          }),
        ]),
      ]),
    );
    return { columns, rows };
  }

  async function confirmExport() {
    if (!exportRequest) return;
    const source = recordsForScope(exportRequest.scope);
    if (!source.length) {
      message.warning(
        exportRequest.scope === "selected"
          ? "Chưa chọn đối tượng để xuất."
          : "Không có dữ liệu để xuất.",
      );
      setExportRequest(null);
      return;
    }
    const formatted = formattedExportData(source);
    setIsExporting(true);
    try {
      const options = {
        fileName: tableName,
        title: tableName,
        rows: formatted.rows,
        columns: formatted.columns,
      };
      const fileName =
        exportRequest.format === "csv"
          ? exportToCSV(options)
          : await exportToExcel(options);
      message.success(`Đã xuất ${source.length} đối tượng: ${fileName}`);
      setExportRequest(null);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không xuất được dữ liệu.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function copySelected() {
    if (!selected.length) return;
    const formatted = formattedExportData(selected);
    const text = [
      formatted.columns.map((column) => column.label).join("\t"),
      ...formatted.rows.map((row) =>
        formatted.columns.map((column) => String(row[column.key] ?? "")).join("\t"),
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      message.success(`Đã copy ${selected.length} đối tượng.`);
    } catch {
      message.error("Không copy được dữ liệu vào clipboard.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }
  if (!records.length) {
    return (
      <DataTableEmpty
        title="Chưa có bản ghi"
        description="Tải mẫu Excel, nhập dữ liệu hoặc thêm bản ghi mới."
        action={emptyAction}
      />
    );
  }

  const exportSource = exportRequest ? recordsForScope(exportRequest.scope) : [];
  const exportScopeLabel =
    exportRequest?.scope === "all"
      ? "Toàn bộ dữ liệu"
      : exportRequest?.scope === "selected"
        ? `${exportSource.length} đối tượng đã chọn`
        : "Dữ liệu sau lọc";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm ID, tên, mã, địa chỉ hoặc nội dung..."
            className="min-w-[15rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
          <button
            ref={columnButtonRef}
            type="button"
            onClick={() => setColumnsOpen((open) => !open)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cột hiển thị
          </button>
          <select
            value={exportScope}
            onChange={(event) => setExportScope(event.target.value as ExportScope)}
            className="ioc-select w-auto min-w-[10rem]"
          >
            <option value="filtered">Dữ liệu sau lọc</option>
            <option value="all">Toàn bộ</option>
            <option value="selected">Đối tượng đã chọn</option>
          </select>
          <button
            type="button"
            onClick={() => setExportRequest({ format: "csv", scope: exportScope })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={() => setExportRequest({ format: "excel", scope: exportScope })}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Xuất Excel
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Đang hiển thị {filtered.length.toLocaleString("vi-VN")} /{" "}
          {records.length.toLocaleString("vi-VN")} đối tượng
          {selected.length ? ` · Đã chọn ${selected.length}` : ""}
        </p>
      </div>

      <FloatingPanel
        open={columnsOpen}
        anchorRef={columnButtonRef}
        onClose={() => setColumnsOpen(false)}
        ariaLabel="Chọn cột hiển thị"
      >
        <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 border-b border-slate-200 bg-white px-3 py-3">
          <p className="text-sm font-semibold text-slate-900">Cột hiển thị</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setVisibleCodes(new Set(defaultCodes))} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Chọn tất cả</button>
            <button type="button" onClick={() => setVisibleCodes(new Set())} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Bỏ chọn tất cả</button>
            <button type="button" onClick={resetPreferences} className="rounded border border-sky-200 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50">Khôi phục mặc định</button>
          </div>
        </div>
        <div className="space-y-0.5">
          {orderedFields.map((field) => {
            const measurement = isMeasurementField(field, records);
            const labels = measurement
              ? measurementModeLabels(field, records)
              : null;
            return (
              <div key={field.code} className="rounded px-2 py-2 hover:bg-slate-50">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={visibleCodes.has(field.code)}
                    onChange={() =>
                      setVisibleCodes((current) => {
                        const next = new Set(current);
                        if (next.has(field.code)) next.delete(field.code);
                        else next.add(field.code);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{field.label}</span>
                </label>
                {measurement ? (
                  <select
                    value={measurementUnitModes[field.code] ?? "source"}
                    onChange={(event) =>
                      setMeasurementUnitModes((current) => ({
                        ...current,
                        [field.code]: event.target.value as MeasurementUnitMode,
                      }))
                    }
                    className="ioc-select-sm mt-2 text-[11px] text-slate-600"
                  >
                    <option value="source">{labels?.source}</option>
                    <option value="normalized">{labels?.normalized}</option>
                  </select>
                ) : null}
              </div>
            );
          })}
          <label className="mt-2 flex items-center gap-2 border-t border-slate-100 px-2 pt-3 text-xs text-slate-500">
            <input type="checkbox" checked={showGeometry} onChange={(event) => setShowGeometry(event.target.checked)} />
            Hình học (kỹ thuật)
          </label>
        </div>
      </FloatingPanel>

      <FloatingPanel
        open={filterOpen}
        anchorRef={filterButtonRef}
        onClose={() => setFilterOpen(false)}
        ariaLabel="Bộ lọc dữ liệu"
        className="w-[min(42rem,calc(100vw-2rem))]"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {displayFields.map((field) => {
            const kind = fieldKind(field);
            const filter = filters[field.code] ?? {};
            return (
              <div key={field.code} className="rounded-lg bg-slate-50 p-2">
                <p className="mb-1 truncate text-xs font-medium text-slate-700">{field.label}</p>
                {kind === "number" ? (
                  <div>
                    <div className="grid grid-cols-2 gap-1">
                      <input type="number" value={filter.min ?? ""} onChange={(event) => updateFilter(field.code, { min: event.target.value })} placeholder="Từ" className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
                      <input type="number" value={filter.max ?? ""} onChange={(event) => updateFilter(field.code, { max: event.target.value })} placeholder="Đến" className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
                    </div>
                    {isMeasurementField(field, records) ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Lọc theo {measurementUnitModes[field.code] === "normalized" ? "đơn vị chuẩn" : "đơn vị gốc"}.
                      </p>
                    ) : null}
                  </div>
                ) : kind === "date" ? (
                  <div className="grid grid-cols-2 gap-1">
                    <input type="date" value={filter.from ?? ""} onChange={(event) => updateFilter(field.code, { from: event.target.value })} className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
                    <input type="date" value={filter.to ?? ""} onChange={(event) => updateFilter(field.code, { to: event.target.value })} className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
                  </div>
                ) : kind === "select" ? (
                  <select value={filter.selected ?? ""} onChange={(event) => updateFilter(field.code, { selected: event.target.value })} className="ioc-select-sm">
                    <option value="">Tất cả</option>
                    {fieldOptions(field, records).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input value={filter.text ?? ""} onChange={(event) => updateFilter(field.code, { text: event.target.value })} placeholder="Chứa..." className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs" />
                )}
              </div>
            );
          })}
        </div>
        <div className="sticky bottom-0 -mx-3 -mb-3 mt-3 flex justify-end gap-2 border-t border-slate-200 bg-white px-3 py-3">
          <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Đặt lại bộ lọc</button>
          <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white">Áp dụng</button>
        </div>
      </FloatingPanel>

      {selected.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
          <span className="mr-auto text-sm font-semibold text-sky-900">{selected.length} đối tượng</span>
          <button type="button" onClick={() => setExportRequest({ format: "excel", scope: "selected" })} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm">Xuất dữ liệu</button>
          <button type="button" onClick={() => void copySelected()} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm">Sao chép</button>
          <button type="button" disabled title="Máy chủ chưa hỗ trợ xóa hàng loạt" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60">Xóa</button>
          <button type="button" disabled title="Sắp hỗ trợ" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60">Đổi trạng thái</button>
          <button type="button" disabled title="Sắp hỗ trợ" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60">Gắn nhãn</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="px-2 py-1 text-xs font-medium text-sky-700">Bỏ chọn</button>
        </div>
      ) : null}

      <div className="relative">
        {isRefreshing ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
            <LoadingIndicator label="Đang làm mới dữ liệu" />
          </div>
        ) : null}
        <DataTable scrollable stickyHeader stickyActions maxHeight="min(68vh,720px)" className="border-0 shadow-none">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell className="w-10 px-2" align="center">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every((record) => selectedIds.has(record.id))}
                  onChange={(event) =>
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      pageRows.forEach((record) =>
                        event.target.checked ? next.add(record.id) : next.delete(record.id),
                      );
                      return next;
                    })
                  }
                  aria-label="Chọn trang hiện tại"
                />
              </DataTableHeaderCell>
              <DataTableHeaderCell className="w-12 px-3" align="center">STT</DataTableHeaderCell>
              {visibleFields.map((field) => (
                <DataTableHeaderCell
                  key={field.fieldId}
                  className="relative min-w-[6.5rem] whitespace-nowrap px-3"
                  style={columnWidths[field.code] ? { width: columnWidths[field.code], minWidth: columnWidths[field.code] } : undefined}
                >
                  <button type="button" onClick={() => toggleSort(field.code)} className="inline-flex max-w-[calc(100%-8px)] items-center gap-1 font-semibold">
                    <span className="truncate">{field.label}</span>
                    <span className="text-[10px] text-slate-400">{sort?.key === field.code ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                  <span role="separator" aria-orientation="vertical" onMouseDown={(event) => startColumnResize(event, field.code)} className="absolute inset-y-1 right-0 w-1.5 cursor-col-resize rounded hover:bg-primary/30" />
                </DataTableHeaderCell>
              ))}
              {showGeometry ? <DataTableHeaderCell className="w-28 px-3">Hình học</DataTableHeaderCell> : null}
              <DataTableHeaderCell align="right" className="w-40 px-3">Thao tác</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {pageRows.map((record, index) => {
              const selectedRow = selectedIds.has(record.id);
              return (
                <DataTableRow
                  key={record.id}
                  onClick={() => onRowClick?.(record)}
                  onDoubleClick={() => setViewingRecord(record)}
                  className={`${onRowClick ? "cursor-pointer" : ""} ${selectedRow ? "!bg-sky-50 hover:!bg-sky-100" : ""}`}
                >
                  <DataTableCell className="px-2 py-2.5" align="center">
                    <input
                      type="checkbox"
                      checked={selectedRow}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() =>
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (next.has(record.id)) next.delete(record.id);
                          else next.add(record.id);
                          return next;
                        })
                      }
                      aria-label={`Chọn bản ghi ${record.id}`}
                    />
                  </DataTableCell>
                  <DataTableCell variant="index" className="px-3 py-2.5">
                    {(safePage - 1) * pageSize + index + 1}
                  </DataTableCell>
                  {visibleFields.map((field) => (
                    <DataTableCell
                      key={field.fieldId}
                      className="max-w-[22rem] px-3 py-2.5"
                    >
                      <TableCellContent
                        field={field}
                        value={record.properties[field.code]}
                        dictionaryLabels={dictionaryLabels}
                        measurementUnitMode={measurementUnitModes[field.code]}
                      />
                    </DataTableCell>
                  ))}
                  {showGeometry ? (
                    <DataTableCell className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-xs ${record.geometry ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {record.geometry ? "Có geometry" : "Không có geometry"}
                      </span>
                    </DataTableCell>
                  ) : null}
                  <DataTableCell variant="actions" align="right" className="px-3 py-2.5">
                    <TableActions>
                      <TableActionButton size="sm" onClick={() => setViewingRecord(record)}>Xem</TableActionButton>
                      {onEdit ? <TableActionButton variant="primary" size="sm" onClick={() => onEdit(record)}>Sửa</TableActionButton> : null}
                      {onDelete ? <TableActionButton variant="danger" size="sm" onClick={() => onDelete(record)}>Xóa</TableActionButton> : null}
                    </TableActions>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </div>

      {!filtered.length ? (
        <DataTableEmpty title="Không có kết quả phù hợp" description="Thử đổi từ khóa hoặc đặt lại bộ lọc." action={<button type="button" onClick={resetFilters} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">Đặt lại bộ lọc</button>} />
      ) : (
        <DataTablePagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      )}

      {exportRequest ? (
        <Modal title={`Xuất ${exportRequest.format === "excel" ? "Excel" : "CSV"}`} onClose={() => setExportRequest(null)} size="sm">
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">Bạn sắp xuất</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{exportSource.length.toLocaleString("vi-VN")} đối tượng</p>
              <p className="mt-1 text-xs text-slate-500">Nguồn: {exportScopeLabel}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Các trường</p>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                <p className="rounded px-2 py-1 text-xs text-slate-600">✓ STT</p>
                {visibleFields.map((field) => <p key={field.code} className="rounded px-2 py-1 text-xs text-slate-600">✓ {field.label}{isMeasurementField(field, records) ? ` · ${measurementUnitModes[field.code] === "normalized" ? "Đơn vị chuẩn" : "Đơn vị gốc"}` : ""}</p>)}
              </div>
              <p className="mt-2 text-xs text-slate-500">Giá trị được xuất theo đúng định dạng đang hiển thị. Không kèm ID, field code, JSON hoặc geometry thô.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setExportRequest(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button type="button" disabled={isExporting || exportSource.length === 0} onClick={() => void confirmExport()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isExporting ? "Đang xuất..." : "Xuất"}</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {viewingRecord ? (
        <RecordViewDialog
          record={viewingRecord}
          fields={fields}
          dictionaryLabels={dictionaryLabels}
          measurementUnitModes={measurementUnitModes}
          onClose={() => setViewingRecord(null)}
        />
      ) : null}
    </div>
  );
}
