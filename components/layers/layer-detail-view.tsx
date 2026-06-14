"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayerImportDialog } from "@/components/import/layer-import-dialog";
import { LayerImportToolbar } from "@/components/layers/layer-import-toolbar";
import { RecordsTable } from "@/components/records/records-table";
import { RecordForm } from "@/components/records/record-form";
import { LayerBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  getLayerDetailByCode,
  getLayerSchema,
} from "@/lib/api/layers";
import { downloadLayerImportTemplate } from "@/lib/api/layer-imports";
import { deleteRecord, getLayerRecords } from "@/lib/api/records";
import { toLayer } from "@/lib/layers/adapter";
import type { LayerSchema } from "@/types/api/schema";
import type { RecordItem } from "@/types/api/records";
import { geometryKindLabels } from "@/types/layer.types";

interface LayerDetailViewProps {
  code: string;
}

export function LayerDetailView({ code }: LayerDetailViewProps) {
  const [layerName, setLayerName] = useState("");
  const [layerId, setLayerId] = useState("");
  const [geometryType, setGeometryType] = useState("");
  const [color, setColor] = useState("#64748b");
  const [schema, setSchema] = useState<LayerSchema | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initializedRef = useRef(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (initializedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const detail = await getLayerDetailByCode(code);
      const layer = toLayer(detail);
      setLayerId(layer.id);
      setLayerName(layer.name);
      setGeometryType(layer.geometryType);
      setColor(layer.color);

      const [schemaData, recordsData] = await Promise.all([
        getLayerSchema(layer.id),
        getLayerRecords(layer.id, {
          page,
          pageSize,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      ]);

      setSchema(schemaData);
      setRecords(recordsData.records);
      const recordTotal = recordsData.meta.total ?? recordsData.records.length;
      const pages =
        recordsData.meta.totalPages ??
        Math.max(1, Math.ceil(recordTotal / pageSize));
      setTotal(recordTotal);
      setTotalPages(pages);

      if (recordsData.records.length === 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu lớp");
    } finally {
      initializedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [code, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function openCreate() {
    setEditingRecord(null);
    setFormMode("create");
  }

  function openEdit(record: RecordItem) {
    setEditingRecord(record);
    setFormMode("edit");
  }

  async function handleDelete(record: RecordItem) {
    if (!layerId || !confirm("Xóa bản ghi này?")) return;
    try {
      await deleteRecord(layerId, record.id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại");
    }
  }

  function closeForm() {
    setFormMode(null);
    setEditingRecord(null);
  }

  function handleFormSuccess() {
    closeForm();
    loadData();
  }

  async function handleDownloadTemplate() {
    if (!layerId) return;
    setTemplateLoading(true);
    setError(null);
    try {
      await downloadLayerImportTemplate(layerId, layerName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được file mẫu");
    } finally {
      setTemplateLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/lop-du-lieu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-slate-50 hover:text-foreground"
              aria-label="Quay lại danh sách lớp"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-foreground">
                  {layerName || "Lớp dữ liệu"}
                </h1>
                <LayerBadge
                  label={geometryKindLabels[geometryType] ?? geometryType}
                  color={color}
                />
              </div>
              {schema && (
                <p className="mt-0.5 text-xs text-muted">
                  {total} bản ghi
                  {!isLoading && total > 0 && totalPages > 1 && ` · Trang ${page}/${totalPages}`}
                </p>
              )}
            </div>
          </div>

          {schema && (
            <LayerImportToolbar
              templateLoading={templateLoading}
              onDownloadTemplate={handleDownloadTemplate}
              onImport={() => setImportOpen(true)}
              onAddRecord={openCreate}
            />
          )}
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="p-4">
          {!schema && !isLoading ? (
            <p className="text-sm text-muted">
              Lớp chưa có cấu trúc dữ liệu.{" "}
              <Link
                href="/quan-tri/lop-du-lieu"
                className="font-medium text-primary hover:underline"
              >
                Thiết kế cấu trúc
              </Link>
            </p>
          ) : (
            <RecordsTable
              fields={schema?.fields ?? []}
              records={records}
              total={total}
              totalPages={totalPages}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onEdit={openEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              emptyAction={
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                >
                  + Thêm bản ghi
                </button>
              }
            />
          )}
        </div>
      </section>

      {importOpen && schema && layerId && (
        <LayerImportDialog
          layerId={layerId}
          layerName={layerName}
          fields={schema.fields}
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {formMode && schema && layerId && (
        <Modal
          title={formMode === "create" ? "Thêm bản ghi" : "Sửa bản ghi"}
          onClose={closeForm}
        >
          <RecordForm
            key={editingRecord?.id ?? "create"}
            layerId={layerId}
            schema={schema}
            record={editingRecord}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  );
}
