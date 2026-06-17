"use client";

import { useMemo, useRef, useState } from "react";
import { LayerImportErrorsTable } from "@/components/import/layer-import-errors-table";
import { LayerImportPreviewTable } from "@/components/import/layer-import-preview-table";
import {
  buildNewFieldDrafts,
  ImportNewFieldsPanel,
  selectedNewFields,
  validateNewFieldDrafts,
  type ImportNewFieldDraft,
} from "@/components/import/import-new-fields-panel";
import { Modal } from "@/components/ui/modal";
import {
  executeLayerImport,
  LayerImportValidationFailedError,
  previewLayerImport,
  uploadLayerImportFile,
} from "@/lib/api/layer-imports";
import {
  normalizeLayerPreview,
  type LayerPreviewState,
} from "@/lib/import/preview";
import { cn } from "@/lib/utils";
import type {
  ImportColumnSuggestion,
  LayerImportExecuteResult,
  LayerImportStep,
} from "@/types/api/import";
import type { FieldTypeMeta } from "@/types/api/metadata";
import type { SchemaField } from "@/types/api/schema";

const EXCEL_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

interface LayerImportDialogProps {
  layerId: string;
  layerName: string;
  fields: SchemaField[];
  fieldTypes: FieldTypeMeta[];
  onClose: () => void;
  onSuccess: () => void;
}

function buildFieldLabelMap(fields: SchemaField[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of fields) {
    if (field.fieldType === "image" || field.fieldType === "file") continue;
    map[field.code] = field.label;
  }
  return map;
}

export function LayerImportDialog({
  layerId,
  layerName,
  fields,
  fieldTypes,
  onClose,
  onSuccess,
}: LayerImportDialogProps) {
  const [step, setStep] = useState<LayerImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<LayerPreviewState | null>(
    null,
  );
  const [result, setResult] = useState<LayerImportExecuteResult | null>(null);
  const [newFieldDrafts, setNewFieldDrafts] = useState<ImportNewFieldDraft[]>(
    [],
  );
  const [newFieldSuggestions, setNewFieldSuggestions] = useState<
    ImportColumnSuggestion[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldLabels = useMemo(() => buildFieldLabelMap(fields), [fields]);

  function resetFile() {
    setFile(null);
    setImportId(null);
    setPreviewState(null);
    setResult(null);
    setNewFieldDrafts([]);
    setNewFieldSuggestions([]);
    setError(null);
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadAndPreview() {
    if (!file) return;
    setError(null);
    setIsLoading(true);

    try {
      const uploaded = await uploadLayerImportFile(layerId, file);
      setImportId(uploaded.importId);

      const previewData = await previewLayerImport(layerId, uploaded.importId);
      setPreviewState(normalizeLayerPreview(previewData));
      setNewFieldSuggestions(previewData.columnSuggestions ?? []);
      setNewFieldDrafts((previous) =>
        buildNewFieldDrafts(
          previewData.unknownColumns ?? [],
          previewData.columnSuggestions ?? [],
          previous,
        ),
      );
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExecute() {
    if (
      !importId ||
      (!previewState?.canImport && selectedNewFields(newFieldDrafts).length === 0)
    ) {
      return;
    }
    setError(null);
    setIsLoading(true);
    setStep("executing");

    try {
      const newFields = selectedNewFields(newFieldDrafts);
      const configError = validateNewFieldDrafts(newFieldDrafts, fieldTypes);
      if (configError) {
        setError(configError);
        setStep("preview");
        return;
      }

      const executeResult = await executeLayerImport(layerId, importId, {
        newFields,
      });
      setResult(executeResult);
      setStep("done");
      onSuccess();
    } catch (e) {
      if (e instanceof LayerImportValidationFailedError) {
        setPreviewState((prev) =>
          prev
            ? {
                ...prev,
                canImport: false,
                validationErrors: e.validationErrors,
                message: e.message,
              }
            : prev,
        );
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Import thất bại");
      }
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  }

  const canImport = previewState?.canImport === true;
  const canCreateFields = selectedNewFields(newFieldDrafts).length > 0;
  const canExecute = canImport || canCreateFields;
  const validationErrors = previewState?.validationErrors ?? [];
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <Modal title={`Import Excel — ${layerName}`} size="xl" onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "upload" && (
          <section className="space-y-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                file ? "border-primary/40 bg-primary/5" : "border-border",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={EXCEL_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreviewState(null);
                  setImportId(null);
                  setResult(null);
                  setError(null);
                }}
              />

              {file ? (
                <div className="text-center">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={resetFile}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Chọn file khác
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center"
                >
                  <p className="font-medium text-foreground">
                    Chọn file Excel/CSV (.xlsx, .csv)
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Ưu tiên file mẫu tải từ hệ thống; CSV dùng hàng đầu làm header.
                  </p>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!file || isLoading}
                onClick={handleUploadAndPreview}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {isLoading
                  ? "Đang upload & preview..."
                  : "Upload và xem preview"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </section>
        )}

        {previewState && (step === "preview" || step === "executing") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {previewState.normalized.totalRows !== undefined && (
                <span>
                  Tổng{" "}
                  <strong className="text-foreground">
                    {previewState.normalized.totalRows}
                  </strong>{" "}
                  dòng
                </span>
              )}
              {previewState.validRows !== undefined && (
                <>
                  <span>·</span>
                  <span className="text-emerald-700">
                    {previewState.validRows} hợp lệ
                  </span>
                </>
              )}
              {previewState.errorRows !== undefined &&
                previewState.errorRows > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600">
                      {previewState.errorRows} lỗi
                    </span>
                  </>
                )}
            </div>

            {hasValidationErrors && (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-medium">
                    {previewState.message ??
                      "File có lỗi — sửa các dòng bên dưới rồi upload lại."}
                  </p>
                  <p className="mt-1">Sửa file Excel và tải lên lại.</p>
                </div>
                <LayerImportErrorsTable errors={validationErrors} />
              </div>
            )}

            {canImport && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {previewState.message ?? "File hợp lệ — có thể import."}
              </div>
            )}

            <ImportNewFieldsPanel
              unknownColumns={newFieldDrafts.map((field) => field.sourceColumn)}
              suggestions={newFieldSuggestions}
              fieldTypes={fieldTypes}
              value={newFieldDrafts}
              onChange={setNewFieldDrafts}
            />

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Xem trước dữ liệu
              </h3>
              <LayerImportPreviewTable
                preview={previewState.normalized}
                fields={fields}
                fieldLabels={fieldLabels}
              />
            </div>

            {step === "preview" && (
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={!canExecute || isLoading}
                  onClick={handleExecute}
                  title={
                    !canExecute
                      ? "Sửa file Excel và tải lên lại trước khi import"
                      : undefined
                  }
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Đang import..." : "Xác nhận import"}
                </button>
                <button
                  type="button"
                  onClick={resetFile}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Tải file khác
                </button>
              </div>
            )}

            {step === "executing" && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Đang import dữ liệu...
              </div>
            )}
          </section>
        )}

        {step === "done" && result && (
          <section className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="font-semibold text-emerald-900">Import hoàn tất</p>
              {result.message && (
                <p className="mt-1 text-sm text-emerald-800">
                  {result.message}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                <li>
                  Đã tạo: <strong>{result.created}</strong> bản ghi
                </li>
                <li>
                  Trùng lặp (bỏ qua): <strong>{result.duplicates}</strong>
                </li>
                <li>
                  Tổng xử lý: <strong>{result.processed}</strong>/{result.total}
                </li>
              </ul>
            </div>

            {result.duplicateRows && result.duplicateRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Dòng trùng đã bỏ qua
                </h3>
                <LayerImportErrorsTable errors={result.duplicateRows} />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={resetFile}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
              >
                Import file khác
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
