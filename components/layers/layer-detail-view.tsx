"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJsonImportDialog } from "@/components/import/geojson-import-dialog";
import { LayerImportDialog } from "@/components/import/layer-import-dialog";
import { LayerImportToolbar } from "@/components/layers/layer-import-toolbar";
import { LayerSymbol } from "@/components/layers/layer-symbol";
import { PageBackLink } from "@/components/layout/page-back-link";
import { RecordsTable } from "@/components/records/records-table";
import { RecordForm } from "@/components/records/record-form";
import { LayerBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import {
  getLayerDetailByCode,
  getLayerSchema,
} from "@/lib/api/layers";
import { getFieldTypes, getRelationshipSuggestions } from "@/lib/api/metadata";
import { downloadLayerImportTemplate } from "@/lib/api/layer-imports";
import { deleteRecord, getAllLayerRecords } from "@/lib/api/records";
import { useMessage } from "@/providers/message-provider";
import { getFieldTypesForLayerGeometry } from "@/lib/fields/field-types";
import { enrichFieldTypes } from "@/lib/i18n/vi";
import { toLayer } from "@/lib/layers/adapter";
import type { LayerSchema } from "@/types/api/schema";
import type { FieldTypeMeta, RelationshipSuggestion } from "@/types/api/metadata";
import type { RecordItem } from "@/types/api/records";
import type { Layer } from "@/types/layer.types";
import { geometryKindLabels } from "@/types/layer.types";

interface LayerDetailViewProps {
  code: string;
}

export function LayerDetailView({ code }: LayerDetailViewProps) {
  const message = useMessage();
  const [layer, setLayer] = useState<Layer | null>(null);
  const [layerName, setLayerName] = useState("");
  const [layerId, setLayerId] = useState("");
  const [geometryType, setGeometryType] = useState("");
  const [fieldTypes, setFieldTypes] = useState<FieldTypeMeta[]>([]);
  const [color, setColor] = useState("#64748b");
  const [schema, setSchema] = useState<LayerSchema | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [relationshipSuggestions, setRelationshipSuggestions] = useState<
    RelationshipSuggestion[]
  >([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initializedRef = useRef(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [geoJsonImportOpen, setGeoJsonImportOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (initializedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [detail, typeCatalog] = await Promise.all([
        getLayerDetailByCode(code),
        getFieldTypes().catch(() => []),
      ]);
      const layerData = toLayer(detail);
      const enrichedTypes = enrichFieldTypes(typeCatalog);
      setLayer(layerData);
      setLayerId(layerData.id);
      setLayerName(layerData.name);
      setGeometryType(layerData.geometryType);
      setColor(layerData.color);
      setFieldTypes(
        getFieldTypesForLayerGeometry(layerData.geometryType, enrichedTypes),
      );

      const [schemaData, recordsData, suggestionsData] = await Promise.all([
        getLayerSchema(layerData.id),
        getAllLayerRecords(layerData.id, {
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        getRelationshipSuggestions(layerData.id).catch(() => []),
      ]);

      setSchema(schemaData);
      setRecords(recordsData);
      setRelationshipSuggestions(suggestionsData);
      setTotal(recordsData.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu lớp");
      setRelationshipSuggestions([]);
    } finally {
      initializedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function openCreate() {
    setEditingRecord(null);
    setFormMode("create");
  }

  function openEdit(record: RecordItem) {
    setEditingRecord(record);
    setFormMode("edit");
  }

  async function handleDelete(record: RecordItem) {
    if (!layerId) return;
    const confirmed = await message.confirm({
      title: "Xóa bản ghi?",
      description: "Bản ghi sẽ bị xóa khỏi hệ thống. API hiện chưa hỗ trợ khôi phục sau khi xóa.",
      confirmLabel: "Xóa bản ghi",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteRecord(layerId, record.id);
      await loadData();
      message.warning("Đã xóa bản ghi. Không thể hoàn tác sau khi lưu trên server.");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Xóa thất bại";
      setError(detail);
      message.error(detail);
    }
  }

  function closeForm() {
    setFormMode(null);
    setEditingRecord(null);
  }

  function handleFormSuccess() {
    closeForm();
    loadData();
    message.success("Đã lưu bản ghi.");
  }

  async function handleDownloadTemplate() {
    if (!layerId) return;
    setTemplateLoading(true);
    setError(null);
    try {
      await downloadLayerImportTemplate(layerId, layerName);
      message.success("Đã tải file mẫu import.");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Không tải được file mẫu";
      setError(detail);
      message.error(detail);
    } finally {
      setTemplateLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div
          className="h-1.5"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="border-b border-border bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
          <PageBackLink href="/lop-du-lieu" label="Danh sách lớp" className="mb-4" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {layer && <LayerSymbol layer={layer} size="md" />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {layerName || "Lớp dữ liệu"}
                  </h1>
                  <LayerBadge
                    label={geometryKindLabels[geometryType] ?? geometryType}
                    color={color}
                  />
                </div>
                {schema && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-foreground">
                      {total} bản ghi
                    </span>
                    <span className="font-mono uppercase tracking-wide">
                      {code}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {schema && (
              <LayerImportToolbar
                templateLoading={templateLoading}
                onDownloadTemplate={handleDownloadTemplate}
                onImport={() => setImportOpen(true)}
                onGeoJsonImport={() => setGeoJsonImportOpen(true)}
                onAddRecord={openCreate}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="p-5">
          {relationshipSuggestions.length > 0 && layerId && (
            <RelationshipSuggestionsPanel
              layerId={layerId}
              suggestions={relationshipSuggestions}
            />
          )}

          {!schema && !isLoading ? (
            <EmptyState
              title="Lớp chưa có cấu trúc dữ liệu"
              description="Thiết kế các trường biểu mẫu trước khi thêm hoặc import bản ghi."
              action={
                <Link
                  href="/quan-tri/lop-du-lieu"
                  className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Thiết kế cấu trúc
                </Link>
              }
              className="py-10"
            />
          ) : (
            <RecordsTable
              fields={schema?.fields ?? []}
              records={records}
              total={total}
              onEdit={openEdit}
              onDelete={handleDelete}
              tableName={layerName || code}
              layerId={layerId}
              tableId="layer-records"
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
          fieldTypes={fieldTypes}
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {geoJsonImportOpen && schema && layerId && (
        <GeoJsonImportDialog
          layerId={layerId}
          layerName={layerName}
          fields={schema.fields}
          fieldTypes={fieldTypes}
          onClose={() => setGeoJsonImportOpen(false)}
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

function RelationshipSuggestionsPanel({
  layerId,
  suggestions,
}: {
  layerId: string;
  suggestions: RelationshipSuggestion[];
}) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Gợi ý relationship chiều ngược</p>
      <div className="mt-2 space-y-2">
        {suggestions.slice(0, 3).map((item) => (
          <div
            key={`${item.sourceLayerId}-${item.foreignKey}`}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>
              {item.message}
            </p>
            <Link
              href={`/quan-tri/lop-du-lieu/${layerId}/schema`}
              className="inline-flex shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Tạo field One-to-Many
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
