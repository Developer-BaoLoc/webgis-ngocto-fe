"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { inputClass } from "@/components/form/field-wrapper";
import { Modal } from "@/components/ui/modal";
import { AdminListPanel } from "@/components/ui/admin-list-panel";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";
import { getDashboardDataSources } from "@/lib/api/dashboards";
import { getSavedViews } from "@/lib/api/saved-views";
import {
  createDataset,
  deleteDataset,
  duplicateDataset,
  getDatasets,
  getDatasetUsage,
  previewDataset,
  updateDataset,
} from "@/lib/api/datasets";
import type { DataSourceLayer } from "@/types/api/dashboard";
import type {
  Dataset,
  DatasetConfig,
  DatasetField,
  DatasetFieldType,
  DatasetPreviewResult,
  DatasetSource,
} from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";

const FIELD_TYPES: Array<{ value: DatasetFieldType; label: string }> = [
  { value: "text", label: "Văn bản" },
  { value: "number", label: "Số" },
  { value: "integer", label: "Số nguyên" },
  { value: "decimal", label: "Số thập phân" },
  { value: "currency", label: "Tiền tệ" },
  { value: "date", label: "Ngày" },
  { value: "boolean", label: "Đúng/Sai" },
  { value: "select", label: "Danh sách chọn" },
];

const NUMERIC_DATASET_TYPES = new Set<DatasetFieldType>([
  "number",
  "integer",
  "decimal",
  "currency",
]);

interface FormState {
  name: string;
  description: string;
  isPublic: boolean;
  fields: DatasetField[];
  sources: DatasetSource[];
  previewLimit: number;
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    isPublic: false,
    fields: [],
    sources: [],
    previewLimit: 20,
  };
}

function formatValue(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-relaxed text-muted">{children}</p>;
}

function ConfigNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
      {children}
    </p>
  );
}

export function DatasetsAdminPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [views, setViews] = useState<SavedView[]>([]);
  const [layers, setLayers] = useState<DataSourceLayer[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<DatasetPreviewResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewMap = useMemo(
    () => new Map(views.map((view) => [view.id, view])),
    [views],
  );
  const layerMap = useMemo(
    () => new Map(layers.map((layer) => [layer.layerId, layer])),
    [layers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [datasetRows, savedViews, dataSources] = await Promise.all([
        getDatasets(),
        getSavedViews(),
        getDashboardDataSources(),
      ]);
      setDatasets(datasetRows);
      setViews(savedViews);
      setLayers(dataSources);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được bộ dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial API load
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setPreview(null);
    setShowForm(true);
  }

  function openEdit(dataset: Dataset) {
    setEditingId(dataset.id);
    setForm({
      name: dataset.name,
      description: dataset.description ?? "",
      isPublic: dataset.isPublic,
      fields: dataset.config.fields,
      sources: dataset.config.sources,
      previewLimit: dataset.config.previewLimit ?? 20,
    });
    setPreview(null);
    setShowForm(true);
  }

  function config(): DatasetConfig {
    return {
      fields: form.fields,
      sources: form.sources,
      previewLimit: form.previewLimit,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        isPublic: form.isPublic,
        config: config(),
      };
      if (editingId) await updateDataset(editingId, payload);
      else await createDataset(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu bộ dữ liệu thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function runPreview(datasetConfig: DatasetConfig, list = false) {
    setBusy(true);
    setError(null);
    try {
      setPreview(await previewDataset(datasetConfig));
      setShowPreview(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xem trước bộ dữ liệu thất bại",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(dataset: Dataset) {
    try {
      const usage = await getDatasetUsage(dataset.id);
      if (usage.widgetCount > 0) {
        setError(
          `Bộ dữ liệu đang được dùng bởi ${usage.widgetCount} widget trong ${usage.dashboards.length} dashboard.`,
        );
        return;
      }
      if (!confirm(`Xóa bộ dữ liệu “${dataset.name}”?`)) return;
      await deleteDataset(dataset.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa bộ dữ liệu thất bại");
    }
  }

  function addField() {
    setForm({
      ...form,
      fields: [
        ...form.fields,
        { key: `field_${form.fields.length + 1}`, label: "", type: "text" },
      ],
    });
  }

  function updateField(index: number, next: DatasetField) {
    const previous = form.fields[index];
    setForm({
      ...form,
      fields: form.fields.map((field, i) => (i === index ? next : field)),
      sources: form.sources.map((source) => {
        if (previous.key === next.key) return source;
        const mapping = { ...source.mapping };
        mapping[next.key] = mapping[previous.key] ?? "";
        delete mapping[previous.key];
        return { ...source, mapping };
      }),
    });
  }

  function addSource() {
    setForm({
      ...form,
      sources: [
        ...form.sources,
        {
          viewId: "",
          sourceLabel: "",
          mapping: Object.fromEntries(
            form.fields.map((field) => [field.key, ""]),
          ),
        },
      ],
    });
  }

  function updateSource(index: number, next: DatasetSource) {
    setForm({
      ...form,
      sources: form.sources.map((source, i) => (i === index ? next : source)),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bộ dữ liệu"
        description="Gộp nhiều Saved View thành các trường chuẩn hóa dùng chung cho phân tích và widget."
        backHref="/quan-tri"
        backLabel="Quản trị"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo bộ dữ liệu
          </button>
        }
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <AdminListPanel
        title="Danh sách bộ dữ liệu"
        isLoading={loading}
        isEmpty={!loading && datasets.length === 0}
        emptyTitle="Chưa có bộ dữ liệu"
        emptyDescription="Tạo bộ dữ liệu từ một hoặc nhiều Saved View."
        emptyAction={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo bộ dữ liệu
          </button>
        }
      >
        <DataTable minWidth="850px">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Tên bộ dữ liệu</DataTableHeaderCell>
              <DataTableHeaderCell>Công khai</DataTableHeaderCell>
              <DataTableHeaderCell>Nguồn dữ liệu</DataTableHeaderCell>
              <DataTableHeaderCell>Trường chuẩn hóa</DataTableHeaderCell>
              <DataTableHeaderCell>Cập nhật</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Hành động</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {datasets.map((dataset) => (
              <DataTableRow key={dataset.id}>
                <DataTableCell variant="primary">{dataset.name}</DataTableCell>
                <DataTableCell>
                  <TableBadge variant={dataset.isPublic ? "success" : "muted"}>
                    {dataset.isPublic ? "Có" : "Không"}
                  </TableBadge>
                </DataTableCell>
                <DataTableCell>{dataset.config.sources.length}</DataTableCell>
                <DataTableCell>{dataset.config.fields.length}</DataTableCell>
                <DataTableCell variant="muted">
                  {dataset.updatedAt
                    ? new Date(dataset.updatedAt).toLocaleString("vi-VN")
                    : "—"}
                </DataTableCell>
                <DataTableCell variant="actions" align="right">
                  <TableActions>
                    <TableActionButton
                      variant="primary"
                      onClick={() => openEdit(dataset)}
                    >
                      Sửa
                    </TableActionButton>
                    <TableActionButton
                      variant="neutral"
                      onClick={() =>
                        void duplicateDataset(dataset.id)
                          .then(load)
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Nhân bản thất bại",
                            ),
                          )
                      }
                    >
                      Nhân bản
                    </TableActionButton>
                    <TableActionButton
                      variant="neutral"
                      onClick={() => void runPreview(dataset.config, true)}
                    >
                      Xem trước
                    </TableActionButton>
                    <TableActionButton
                      variant="danger"
                      onClick={() => void remove(dataset)}
                    >
                      Xóa
                    </TableActionButton>
                  </TableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </AdminListPanel>

      {showForm && (
        <Modal
          title={editingId ? "Sửa bộ dữ liệu" : "Tạo bộ dữ liệu"}
          onClose={() => setShowForm(false)}
          size="xl"
        >
          <form onSubmit={save} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">
                  Tên bộ dữ liệu
                </label>
                <input
                  className={inputClass}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <FieldHelp>Tên dùng để chọn trong thiết kế widget.</FieldHelp>
              </div>
              <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm({ ...form, isPublic: e.target.checked })
                    }
                  />
                  Công khai trong xã/phường
                </label>
                <FieldHelp>
                  Cho phép các dashboard trong xã/phường này sử dụng bộ dữ liệu.
                </FieldHelp>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium">Mô tả</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Trường chuẩn hóa</h3>
                  <FieldHelp>
                    Định nghĩa các cột chung sau khi gộp nhiều Saved View.
                  </FieldHelp>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={addField}
                >
                  + Thêm trường
                </button>
              </div>
              {form.fields.map((field, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr_180px_auto]">
                    <div>
                      <label className="block text-sm font-medium">
                        Mã trường
                      </label>
                      <input
                        className={inputClass}
                        required
                        value={field.key}
                        onChange={(e) =>
                          updateField(index, { ...field, key: e.target.value })
                        }
                        placeholder="loi_nhuan"
                      />
                      <FieldHelp>
                        Dùng nội bộ cho truy vấn, viết không dấu, không khoảng
                        trắng. Ví dụ: loi_nhuan.
                      </FieldHelp>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Tên hiển thị
                      </label>
                      <input
                        className={inputClass}
                        required
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, {
                            ...field,
                            label: e.target.value,
                          })
                        }
                        placeholder="Lợi nhuận"
                      />
                      <FieldHelp>
                        Tên dễ đọc hiển thị cho người quản trị và dashboard.
                      </FieldHelp>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Kiểu dữ liệu
                      </label>
                      <select
                        className={inputClass}
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, {
                            ...field,
                            type: e.target.value as DatasetFieldType,
                          })
                        }
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <FieldHelp>
                        Chọn đúng kiểu để hệ thống biết trường này dùng làm chỉ
                        số hay nhóm phân loại.
                      </FieldHelp>
                    </div>
                    <button
                      type="button"
                      className="px-2 text-red-600"
                      onClick={() =>
                        setForm({
                          ...form,
                          fields: form.fields.filter((_, i) => i !== index),
                          sources: form.sources.map((source) => {
                            const mapping = { ...source.mapping };
                            delete mapping[field.key];
                            return { ...source, mapping };
                          }),
                        })
                      }
                    >
                      <span aria-label="Xóa trường">×</span>
                    </button>
                  </div>
                </div>
              ))}
              {form.fields.length === 0 && (
                <ConfigNotice>
                  Cần thêm ít nhất một trường chuẩn hóa.
                </ConfigNotice>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Nguồn dữ liệu</h3>
                  <FieldHelp>
                    Chọn một hoặc nhiều Saved View để gộp thành cùng một bộ dữ
                    liệu.
                  </FieldHelp>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={addSource}
                >
                  + Thêm nguồn
                </button>
              </div>
              {form.sources.map((source, sourceIndex) => {
                const view = viewMap.get(source.viewId);
                const layer = view ? layerMap.get(view.layerId) : undefined;
                return (
                  <div
                    key={sourceIndex}
                    className="space-y-3 rounded-xl border border-border p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
                      <div>
                        <label className="block text-sm font-medium">
                          Saved View nguồn
                        </label>
                        <select
                          className={inputClass}
                          required
                          value={source.viewId}
                          onChange={(e) =>
                            updateSource(sourceIndex, {
                              ...source,
                              viewId: e.target.value,
                              mapping: Object.fromEntries(
                                form.fields.map((field) => [field.key, ""]),
                              ),
                            })
                          }
                        >
                          <option value="">Chọn Saved View</option>
                          {views.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.layerName} / {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Nhãn nguồn
                        </label>
                        <input
                          className={inputClass}
                          required
                          value={source.sourceLabel}
                          onChange={(e) =>
                            updateSource(sourceIndex, {
                              ...source,
                              sourceLabel: e.target.value,
                            })
                          }
                          placeholder="Lúa"
                        />
                        <FieldHelp>
                          Tên ngắn để nhận biết nguồn, ví dụ: Lúa, Thủy sản, Hoa
                          màu.
                        </FieldHelp>
                      </div>
                      <button
                        type="button"
                        className="px-2 text-red-600"
                        onClick={() =>
                          setForm({
                            ...form,
                            sources: form.sources.filter(
                              (_, i) => i !== sourceIndex,
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                    {view && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="p-2 text-left">
                                Trường chuẩn hóa
                              </th>
                              <th className="p-2 text-left">
                                Trường nguồn
                                <FieldHelp>
                                  Chọn trường từ Saved View tương ứng để map vào
                                  trường chuẩn hóa.
                                </FieldHelp>
                              </th>
                              <th className="p-2 text-left">
                                Giá trị cố định
                                <FieldHelp>
                                  Gán cùng một giá trị cho toàn bộ dòng của
                                  nguồn này. Ví dụ: Lúa.
                                </FieldHelp>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.fields.map((field) => {
                              const value = source.mapping[field.key] ?? "";
                              const isConstant =
                                value.startsWith("__constant:");
                              return (
                                <tr key={field.key}>
                                  <td className="p-2">
                                    {field.label || field.key}
                                  </td>
                                  <td className="p-2">
                                    <select
                                      className={inputClass}
                                      required
                                      value={isConstant ? "__constant" : value}
                                      onChange={(e) =>
                                        updateSource(sourceIndex, {
                                          ...source,
                                          mapping: {
                                            ...source.mapping,
                                            [field.key]:
                                              e.target.value === "__constant"
                                                ? "__constant:"
                                                : e.target.value,
                                          },
                                        })
                                      }
                                    >
                                      <option value="">Chưa ánh xạ</option>
                                      {layer?.fields.map((sourceField) => (
                                        <option
                                          key={sourceField.code}
                                          value={sourceField.code}
                                        >
                                          {sourceField.label}
                                        </option>
                                      ))}
                                      <option value="__constant">
                                        Dùng giá trị cố định
                                      </option>
                                    </select>
                                    {field.type === "text" && !value && (
                                      <p className="mt-1 text-xs text-amber-700">
                                        Trường này sẽ trống nếu không chọn
                                        trường nguồn hoặc giá trị cố định.
                                      </p>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {isConstant && (
                                      <input
                                        className={inputClass}
                                        required
                                        value={value.slice(
                                          "__constant:".length,
                                        )}
                                        onChange={(e) =>
                                          updateSource(sourceIndex, {
                                            ...source,
                                            mapping: {
                                              ...source.mapping,
                                              [field.key]: `__constant:${e.target.value}`,
                                            },
                                          })
                                        }
                                        placeholder="Nhập giá trị cố định"
                                      />
                                    )}
                                    {isConstant &&
                                      NUMERIC_DATASET_TYPES.has(field.type) &&
                                      value.slice("__constant:".length) !==
                                        "" &&
                                      !Number.isFinite(
                                        Number(
                                          value.slice("__constant:".length),
                                        ),
                                      ) && (
                                        <p className="mt-1 text-xs text-amber-700">
                                          Trường số không nên nhận giá trị văn
                                          bản.
                                        </p>
                                      )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {form.sources.length === 0 && (
                <ConfigNotice>
                  Cần thêm ít nhất một nguồn Saved View.
                </ConfigNotice>
              )}
            </section>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium">
                  Số dòng xem trước
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={form.previewLimit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      previewLimit: Number(e.target.value) || 20,
                    })
                  }
                />
                <FieldHelp>
                  Giới hạn số dòng hiển thị trong bảng kiểm tra.
                </FieldHelp>
              </div>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-primary px-4 py-2 text-sm text-primary"
                onClick={() => void runPreview(config())}
              >
                Xem trước bộ dữ liệu
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                Lưu bộ dữ liệu
              </button>
            </div>
            {preview && !showPreview && <DatasetPreview result={preview} />}
          </form>
        </Modal>
      )}
      {showPreview && preview && (
        <Modal
          title="Xem trước bộ dữ liệu"
          onClose={() => setShowPreview(false)}
          size="xl"
        >
          <DatasetPreview result={preview} />
        </Modal>
      )}
    </div>
  );
}

function DatasetPreview({ result }: { result: DatasetPreviewResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-sky-950">
            Tổng số dòng: {result.total.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-sky-800">
            Đang hiển thị {result.rows.length.toLocaleString("vi-VN")} dòng đầu
            tiên.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-sky-700 shadow-sm">
          Xem trước
        </span>
      </div>
      <p className="text-xs text-muted">
        Xem trước bộ dữ liệu: kiểm tra kết quả gộp dữ liệu trước khi lưu hoặc
        dùng trong widget. Ô “Chưa có dữ liệu” có thể do dữ liệu nguồn trống
        hoặc chưa ánh xạ.
      </p>
      <DataTable
        minWidth={`${Math.max(560, result.fields.length * 170)}px`}
        scrollable
        stickyHeader
        maxHeight="360px"
      >
        <DataTableHead>
          <tr>
            {result.fields.map((field) => (
              <DataTableHeaderCell key={field.key}>
                {field.label}
              </DataTableHeaderCell>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.rows.map((row, index) => (
            <DataTableRow key={index}>
              {result.fields.map((field) => (
                <DataTableCell key={field.key}>
                  {isEmptyValue(row[field.key]) ? (
                    <span
                      className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500"
                      title="Chưa có dữ liệu hoặc mapping trống"
                    >
                      Chưa có dữ liệu
                    </span>
                  ) : (
                    formatValue(row[field.key])
                  )}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
