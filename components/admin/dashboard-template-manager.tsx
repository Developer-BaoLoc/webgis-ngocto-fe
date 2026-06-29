"use client";

import { useMemo, useState } from "react";
import {
  dashboardToTemplate,
  deleteCustomDashboardTemplate,
  templateToJson,
  upsertCustomDashboardTemplate,
  validateDashboardTemplateJson,
} from "@/lib/dashboard/templates/custom-templates";
import { hasUnresolvedPlaceholders, type DashboardTemplate } from "@/lib/dashboard/templates";
import type { DashboardDetail } from "@/types/api/dashboard";
import { useMessage } from "@/providers/message-provider";
import { logAuditAction } from "@/lib/audit/audit-log";

interface DashboardTemplateManagerProps {
  dashboard: DashboardDetail;
  customTemplates: DashboardTemplate[];
  initialTab?: ManagerTab;
  onTemplatesChange: (templates: DashboardTemplate[]) => void;
}

type ManagerTab = "save" | "export" | "import" | "custom";

export function DashboardTemplateManager({
  dashboard,
  customTemplates,
  initialTab = "save",
  onTemplatesChange,
}: DashboardTemplateManagerProps) {
  const messageApi = useMessage();
  const [tab, setTab] = useState<ManagerTab>(initialTab);
  const [templateName, setTemplateName] = useState(`${dashboard.name} template`);
  const [templateDescription, setTemplateDescription] = useState(
    dashboard.description ?? "",
  );
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportTemplate = useMemo(
    () =>
      dashboardToTemplate({
        dashboardName: dashboard.name,
        description: dashboard.description,
        widgets: dashboard.widgets,
        name: templateName,
        templateDescription,
      }),
    [dashboard, templateDescription, templateName],
  );
  const exportJson = useMemo(() => templateToJson(exportTemplate), [exportTemplate]);
  const exportBlocked = hasUnresolvedPlaceholders(exportTemplate);

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  function saveTemplate() {
    clearFeedback();
    if (exportBlocked) {
      setError("Bảng điều khiển hiện tại còn vị trí chưa được liên kết, không thể lưu mẫu.");
      return;
    }
    try {
      const next = upsertCustomDashboardTemplate(exportTemplate);
      onTemplatesChange(next);
      setMessage("Đã lưu mẫu vào trình duyệt.");
      messageApi.success("Đã lưu mẫu vào trình duyệt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được mẫu.");
    }
  }

  async function copyJson() {
    clearFeedback();
    if (exportBlocked) {
      setError("Bảng điều khiển hiện tại còn vị trí chưa được liên kết, không thể xuất mẫu.");
      return;
    }
    try {
      await navigator.clipboard.writeText(exportJson);
      setMessage("Đã copy JSON template.");
      messageApi.success("Đã copy JSON template.");
    } catch {
      setError("Không copy được JSON. Hãy copy thủ công trong ô bên dưới.");
    }
  }

  function downloadJson() {
    clearFeedback();
    if (exportBlocked) {
      setError("Bảng điều khiển hiện tại còn vị trí chưa được liên kết, không thể xuất mẫu.");
      return;
    }
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportTemplate.code}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Đã tải JSON template.");
    messageApi.success("Đã tải JSON template.");
  }

  function importTemplateFromText(text: string) {
    clearFeedback();
    try {
      const parsed = JSON.parse(text);
      const result = validateDashboardTemplateJson(parsed);
      if (!result.valid || !result.template) {
        setError(result.errors.join(" "));
        return;
      }
      const template: DashboardTemplate = {
        ...result.template,
        id: result.template.id.startsWith("custom-")
          ? result.template.id
          : `custom-${result.template.id}`,
        code: result.template.code.startsWith("custom_")
          ? result.template.code
          : `custom_${result.template.code}`,
        category: "custom",
        tags: Array.from(new Set([...(result.template.tags ?? []), "custom"])),
      };
      const next = upsertCustomDashboardTemplate(template);
      onTemplatesChange(next);
      setImportText(templateToJson(template));
      setMessage(`Đã nhập mẫu "${template.name}".`);
      logAuditAction({ action: "template.import", objectType: "template", objectName: template.name, metadata: { widgets: template.widgets.length } });
      messageApi.success(`Đã nhập mẫu “${template.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON template không hợp lệ.");
    }
  }

  function handleFile(file?: File | null) {
    if (!file) return;
    file
      .text()
      .then((text) => {
        setImportText(text);
        importTemplateFromText(text);
      })
      .catch(() => setError("Không đọc được file JSON."));
  }

  async function deleteTemplate(templateId: string) {
    clearFeedback();
    const template = customTemplates.find((item) => item.id === templateId);
    if (!template) return;
    if (!(await messageApi.confirm({ title: `Xóa mẫu “${template.name}”?`, description: "Mẫu local sẽ bị xóa khỏi trình duyệt này.", confirmLabel: "Xóa mẫu", danger: true }))) return;
    try {
      const next = deleteCustomDashboardTemplate(templateId);
      onTemplatesChange(next);
      setMessage("Đã xóa mẫu tùy chỉnh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được mẫu.");
    }
  }

  const tabs: Array<{ id: ManagerTab; label: string }> = [
    { id: "save", label: "Lưu thành mẫu" },
    { id: "export", label: "Xuất JSON" },
    { id: "import", label: "Nhập JSON" },
    { id: "custom", label: "Mẫu tự tạo" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              clearFeedback();
              setTab(item.id);
            }}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tab === item.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {(tab === "save" || tab === "export") && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Tên mẫu</span>
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Ví dụ: Tổng quan thủy sản"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Mô tả</span>
            <input
              value={templateDescription}
              onChange={(event) => setTemplateDescription(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Mô tả ngắn cho mẫu"
            />
          </label>
        </div>
      )}

      {tab === "save" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Lưu dashboard hiện tại thành mẫu local trong trình duyệt. Mẫu tự tạo
            sẽ xuất hiện trong wizard cùng mẫu mặc định.
          </p>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={dashboard.widgets.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Lưu thành mẫu
          </button>
        </div>
      )}

      {tab === "export" && (
        <div className="space-y-3">
          <textarea
            value={exportJson}
            readOnly
            className="h-72 w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyJson()}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Tải file JSON
            </button>
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="space-y-3">
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="h-72 w-full rounded-lg border border-border p-3 font-mono text-xs"
            placeholder='Dán JSON template vào đây, ví dụ {"id":"...","name":"...","widgets":[...]}'
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => importTemplateFromText(importText)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Nhập mẫu
            </button>
            <label className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-slate-50">
              Upload JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}

      {tab === "custom" && (
        <div className="space-y-2">
          {customTemplates.length === 0 ? (
            <p className="rounded-lg border border-border bg-slate-50 px-3 py-3 text-sm text-muted">
              Chưa có mẫu tự tạo trong trình duyệt này.
            </p>
          ) : (
            customTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted">
                    Tự tạo · {template.widgets.length} widget
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTemplate(template.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
