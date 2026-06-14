"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ImportPreviewTable } from "@/components/import/import-preview-table";
import { ImportProgress } from "@/components/import/import-progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  executeImport,
  getImportTemplates,
  getJob,
  isJobFinished,
  previewImport,
  uploadImportFile,
} from "@/lib/api/imports";
import { normalizePreview, type NormalizedPreview } from "@/lib/import/preview";
import { cn } from "@/lib/utils";
import type {
  ImportJob,
  ImportTemplate,
  ImportWizardStep,
} from "@/types/api/import";

const STEPS: { id: ImportWizardStep; label: string }[] = [
  { id: "template", label: "Chọn template" },
  { id: "upload", label: "Upload file" },
  { id: "preview", label: "Preview" },
  { id: "importing", label: "Import" },
  { id: "done", label: "Hoàn tất" },
];

const TEMPLATE_HINTS: Record<string, string> = {
  htx: "Sheet HTX → economic_collective",
  to_hop_tac: "Sheet Tổ hợp tác → economic_collective",
  thuy_loi: "Sheet Thủy Lợi → pump_station",
  vung_san_xuat: "Sheet Vùng sản xuất → production_zone",
  sp_ocop: "Sheet SP OCOP → ocop_subject + ocop_product",
};

const TEMPLATE_LAYER_LINK: Record<string, string> = {
  htx: "economic_collective",
  to_hop_tac: "economic_collective",
  thuy_loi: "pump_station",
  vung_san_xuat: "production_zone",
  sp_ocop: "ocop_subject",
};

function stepIndex(step: ImportWizardStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function ImportWizard() {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [step, setStep] = useState<ImportWizardStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<NormalizedPreview | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getImportTemplates()
      .then(setTemplates)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Không tải được templates"),
      );
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      setIsPolling(true);

      const poll = async () => {
        try {
          const jobData = await getJob(id);
          setJob(jobData);
          if (isJobFinished(jobData.status)) {
            stopPolling();
            setStep("done");
          }
        } catch (e) {
          stopPolling();
          setError(
            e instanceof Error ? e.message : "Không theo dõi được tiến trình",
          );
        }
      };

      poll();
      pollRef.current = setInterval(poll, 2000);
    },
    [stopPolling],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const selectedTemplateInfo = templates.find((t) => t.code === selectedTemplate);

  async function handleUpload() {
    if (!file || !selectedTemplate) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await uploadImportFile(file);
      setImportId(result.importId);
      if (result.jobId) setJobId(result.jobId);

      const previewData = await previewImport(
        result.importId,
        selectedTemplate,
      );
      setPreview(normalizePreview(previewData));
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExecute() {
    if (!importId || !selectedTemplate) return;
    setError(null);
    setIsLoading(true);
    setStep("importing");

    try {
      const result = await executeImport(importId, selectedTemplate);
      const activeJobId = result.jobId ?? jobId;
      if (!activeJobId) throw new Error("Không nhận được jobId từ server");
      setJobId(activeJobId);
      startPolling(activeJobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import thất bại");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    stopPolling();
    setStep("template");
    setSelectedTemplate(null);
    setFile(null);
    setImportId(null);
    setJobId(null);
    setPreview(null);
    setJob(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(uploaded: File | null) {
    setFile(uploaded);
    setPreview(null);
    setImportId(null);
    setJobId(null);
    setJob(null);
    if (uploaded) setStep("upload");
  }

  const currentStepIdx = stepIndex(step);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import dữ liệu"
        description="Upload Excel → preview 20 dòng → thực hiện import nền"
      />

      {/* Stepper */}
      <nav className="flex flex-wrap gap-2">
        {STEPS.map((s, idx) => (
          <div
            key={s.id}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
              idx <= currentStepIdx
                ? "bg-primary/10 text-primary"
                : "bg-slate-100 text-muted",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                idx < currentStepIdx
                  ? "bg-primary text-white"
                  : idx === currentStepIdx
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-muted",
              )}
            >
              {idx < currentStepIdx ? "✓" : idx + 1}
            </span>
            {s.label}
          </div>
        ))}
      </nav>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Template */}
      <Card className={step !== "template" && selectedTemplate ? "opacity-80" : ""}>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            1. Chọn template
          </h2>
          <p className="mt-1 text-sm text-muted">
            Chọn sheet Excel tương ứng với loại dữ liệu cần import
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có template. Chạy BE seed và Redis.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  disabled={step === "importing" || step === "done"}
                  onClick={() => {
                    setSelectedTemplate(t.code);
                    setStep(file ? "upload" : "template");
                    setError(null);
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    selectedTemplate === t.code
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                    (step === "importing" || step === "done") &&
                      "cursor-not-allowed opacity-60",
                  )}
                >
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {TEMPLATE_HINTS[t.code] ?? t.description ?? t.sheetName ?? ""}
                  </p>
                  {t.sheetName && (
                    <p className="mt-1 text-xs text-muted">
                      Sheet: {t.sheetName}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
      {selectedTemplate && step !== "done" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              2. Upload file Excel
            </h2>
            <p className="mt-1 text-sm text-muted">
              Template: <strong>{selectedTemplateInfo?.name}</strong> (
              {selectedTemplate})
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                file ? "border-primary/40 bg-primary/5" : "border-border",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                disabled={step === "importing"}
                onChange={(e) =>
                  handleFileChange(e.target.files?.[0] ?? null)
                }
              />
              {file ? (
                <div className="text-center">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  {step !== "importing" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFileChange(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="mt-3 text-sm text-primary hover:underline"
                    >
                      Chọn file khác
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center"
                >
                  <p className="font-medium text-foreground">
                    Chọn file Excel (.xlsx)
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    BẢNG TỔNG HỢP SỐ LIỆU NÔNG NGHIỆP...
                  </p>
                </button>
              )}
            </div>

            {file && step !== "preview" && step !== "importing" && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleUpload}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {isLoading ? "Đang upload & preview..." : "Upload và xem preview"}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {preview && (step === "preview" || step === "importing" || step === "done") && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              3. Preview dữ liệu
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {preview.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            {preview.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {preview.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <ImportPreviewTable preview={preview} />

            {step === "preview" && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleExecute}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {isLoading ? "Đang thực hiện..." : "Thực hiện import"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Hủy
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {(step === "importing" || (step === "done" && job)) && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              4. Tiến trình import
            </h2>
          </CardHeader>
          <CardContent>
            <ImportProgress job={job} isPolling={isPolling} />
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === "done" && job && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              {job.status.toLowerCase() === "failed" ||
              job.status.toLowerCase() === "error"
                ? "Import thất bại"
                : "Import hoàn tất"}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.progress && (
              <p className="text-sm text-muted">
                Đã xử lý {job.progress.processed}/{job.progress.total} dòng
                {job.progress.errors > 0 &&
                  ` · ${job.progress.errors} lỗi`}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {selectedTemplate && TEMPLATE_LAYER_LINK[selectedTemplate] && (
                <Link
                  href={`/lop-du-lieu/${TEMPLATE_LAYER_LINK[selectedTemplate]}`}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Xem lớp {TEMPLATE_LAYER_LINK[selectedTemplate]}
                </Link>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
              >
                Import file khác
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
