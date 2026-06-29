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
import { getDictionaryItems } from "@/lib/api/dictionaries";
import {
  createSavedView,
  deleteSavedView,
  duplicateSavedView,
  getSavedViews,
  getSavedViewUsage,
  previewSavedView,
  updateSavedView,
} from "@/lib/api/saved-views";
import { isNumericField } from "@/lib/fields/field-types";
import { useMessage } from "@/providers/message-provider";
import type { DataSourceField, DataSourceLayer } from "@/types/api/dashboard";
import type { DictionaryItem } from "@/types/api/dictionary";
import type {
  SavedView,
  SavedViewConfig,
  SavedViewFilterOperator,
  SavedViewPayload,
  SavedViewPreviewResult,
  SavedViewSort,
} from "@/types/api/saved-view";

const TECHNICAL_FIELDS = new Set([
  "id",
  "geom",
  "geometry",
  "entity_id",
  "created_at",
  "updated_at",
  "deleted_at",
]);
const DATE_FIELD_TYPES = new Set(["date", "datetime", "timestamp"]);

const OPERATOR_LABELS: Record<SavedViewFilterOperator, string> = {
  eq: "Bằng",
  neq: "Khác",
  contains: "Chứa",
  not_contains: "Không chứa",
  gt: "Lớn hơn",
  gte: "Lớn hơn hoặc bằng",
  lt: "Nhỏ hơn",
  lte: "Nhỏ hơn hoặc bằng",
  empty: "Rỗng",
  not_empty: "Không rỗng",
};

function operatorLabel(
  field: DataSourceField | undefined,
  operator: SavedViewFilterOperator,
) {
  if (field && DATE_FIELD_TYPES.has(field.fieldType)) {
    const labels: Partial<Record<SavedViewFilterOperator, string>> = {
      eq: "Bằng ngày",
      neq: "Khác ngày",
      gt: "Sau",
      gte: "Từ ngày",
      lt: "Trước",
      lte: "Đến ngày",
      empty: "Rỗng",
      not_empty: "Không rỗng",
    };
    return labels[operator] ?? OPERATOR_LABELS[operator];
  }
  if (field?.fieldType === "boolean") {
    const labels: Partial<Record<SavedViewFilterOperator, string>> = {
      eq: "Là",
      neq: "Không là",
      empty: "Rỗng",
      not_empty: "Không rỗng",
    };
    return labels[operator] ?? OPERATOR_LABELS[operator];
  }
  return OPERATOR_LABELS[operator];
}

interface FilterFormRow {
  field: string;
  operator: SavedViewFilterOperator;
  value: string;
}

interface SavedViewFormState {
  name: string;
  description: string;
  layerId: string;
  filters: FilterFormRow[];
  sorts: SavedViewSort[];
  visibleFields: string[];
  limit: number;
  previewLimit: number;
  isPublic: boolean;
}

function emptyForm(): SavedViewFormState {
  return {
    name: "",
    description: "",
    layerId: "",
    filters: [],
    sorts: [],
    visibleFields: [],
    limit: 100,
    previewLimit: 20,
    isPublic: false,
  };
}

function operatorsForField(field?: DataSourceField): SavedViewFilterOperator[] {
  if (!field) return ["eq"] as SavedViewFilterOperator[];
  if (
    isNumericField(field) ||
    DATE_FIELD_TYPES.has(field.fieldType)
  ) {
    return [
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "empty",
      "not_empty",
    ] as SavedViewFilterOperator[];
  }
  if (
    field.fieldType === "boolean" ||
    field.fieldType === "category" ||
    field.fieldType === "multi_category"
  ) {
    return ["eq", "neq", "empty", "not_empty"];
  }
  return ["eq", "neq", "contains", "not_contains", "empty", "not_empty"];
}

function dictionaryCode(field?: DataSourceField) {
  const value = field?.dataSchema?.dictionary;
  return typeof value === "string" ? value : null;
}

function formatPreviewValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    const preferred =
      data.sourceValue ?? data.normalizedValue ?? data.amount ?? data.value;
    return preferred === undefined ? JSON.stringify(value) : String(preferred);
  }
  return String(value);
}

function normalizeViewConfig(
  config: Partial<SavedViewConfig>,
): SavedViewConfig {
  return {
    filterMode: "and",
    filters: config.filters ?? [],
    sorts: config.sorts ?? [],
    visibleFields: config.visibleFields ?? [],
    limit: config.limit ?? 100,
    previewLimit: config.previewLimit ?? 20,
  };
}

export function SavedViewsAdminPage() {
  const message = useMessage();
  const [views, setViews] = useState<SavedView[]>([]);
  const [layers, setLayers] = useState<DataSourceLayer[]>([]);
  const [form, setForm] = useState<SavedViewFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<SavedViewPreviewResult | null>(null);
  const [showListPreview, setShowListPreview] = useState(false);
  const [dictionaryOptions, setDictionaryOptions] = useState<
    Record<string, DictionaryItem[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.layerId === form.layerId),
    [form.layerId, layers],
  );
  const selectableFields = useMemo(
    () =>
      selectedLayer?.fields.filter(
        (field) => !TECHNICAL_FIELDS.has(field.code),
      ) ?? [],
    [selectedLayer],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [savedViews, dataSources] = await Promise.all([
        getSavedViews(),
        getDashboardDataSources(),
      ]);
      setViews(savedViews);
      setLayers(dataSources);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được chế độ xem đã lưu",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side API load
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setPreview(null);
    setShowModal(true);
  }

  async function ensureDictionaryOptions(field?: DataSourceField) {
    const code = dictionaryCode(field);
    if (!code || dictionaryOptions[code]) return;
    try {
      const items = await getDictionaryItems(code);
      setDictionaryOptions((current) => ({ ...current, [code]: items }));
    } catch {
      setDictionaryOptions((current) => ({ ...current, [code]: [] }));
    }
  }

  async function openEdit(view: SavedView) {
    const config = normalizeViewConfig(view.config);
    const nextForm: SavedViewFormState = {
      name: view.name,
      description: view.description ?? "",
      layerId: view.layerId,
      filters: config.filters.map((filter) => ({
        field: filter.field,
        operator: filter.operator,
        value:
          filter.value === undefined || filter.value === null
            ? ""
            : String(filter.value),
      })),
      sorts: config.sorts,
      visibleFields: config.visibleFields,
      limit: config.limit,
      previewLimit: config.previewLimit,
      isPublic: view.isPublic,
    };
    const layer = layers.find((item) => item.layerId === view.layerId);
    await Promise.all(
      nextForm.filters.map((filter) =>
        ensureDictionaryOptions(
          layer?.fields.find((field) => field.code === filter.field),
        ),
      ),
    );
    setEditingId(view.id);
    setForm(nextForm);
    setPreview(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
    setPreview(null);
  }

  function buildConfig(source = form): SavedViewConfig {
    return {
      filterMode: "and",
      filters: source.filters
        .filter((filter) => filter.field)
        .map((filter) => ({
          field: filter.field,
          operator: filter.operator,
          ...(!["empty", "not_empty"].includes(filter.operator)
            ? { value: filter.value }
            : {}),
        })),
      sorts: source.sorts.filter((sort) => sort.field),
      visibleFields: source.visibleFields,
      limit: source.limit,
      previewLimit: source.previewLimit,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: SavedViewPayload = {
      name: form.name,
      description: form.description || null,
      layerId: form.layerId,
      viewType: "table",
      config: buildConfig(),
      isPublic: form.isPublic,
    };
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingId) await updateSavedView(editingId, payload);
      else await createSavedView(payload);
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu chế độ xem thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runPreview(layerId: string, config: SavedViewConfig) {
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await previewSavedView({ layerId, config });
      setPreview(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xem trước thất bại");
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handlePreviewCurrent() {
    if (!form.layerId) {
      setError("Chọn lớp dữ liệu trước khi xem trước");
      return;
    }
    await runPreview(form.layerId, buildConfig());
  }

  async function handlePreviewSaved(view: SavedView) {
    const result = await runPreview(
      view.layerId,
      normalizeViewConfig(view.config),
    );
    if (result) setShowListPreview(true);
  }

  async function handleDuplicate(view: SavedView) {
    setError(null);
    try {
      await duplicateSavedView(view.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate View thất bại");
    }
  }

  async function handleDelete(view: SavedView) {
    setError(null);
    try {
      const usage = await getSavedViewUsage(view.id);
      if (usage.widgetCount > 0) {
        const dashboardNames = usage.dashboards
          .map((item) => item.name)
          .join(", ");
        setError(
          `Chế độ xem này đang được sử dụng bởi ${usage.widgetCount} tiện ích trong ${usage.dashboards.length} dashboard${dashboardNames ? ` (${dashboardNames})` : ""}. Vui lòng đổi nguồn dữ liệu tiện ích trước khi xóa.`,
        );
        return;
      }
      if (!(await message.confirm({ title: `Xóa chế độ xem “${view.name}”?`, description: "Chế độ xem đã lưu sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa chế độ xem", danger: true }))) return;
      await deleteSavedView(view.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa chế độ xem thất bại");
    }
  }

  async function updateFilterField(index: number, code: string) {
    const field = selectableFields.find((item) => item.code === code);
    const operators = operatorsForField(field);
    setForm((current) => ({
      ...current,
      filters: current.filters.map((filter, filterIndex) =>
        filterIndex === index
          ? { field: code, operator: operators[0], value: "" }
          : filter,
      ),
    }));
    await ensureDictionaryOptions(field);
  }

  function updateFilter(index: number, patch: Partial<FilterFormRow>) {
    setForm((current) => ({
      ...current,
      filters: current.filters.map((filter, filterIndex) =>
        filterIndex === index ? { ...filter, ...patch } : filter,
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chế độ xem đã lưu"
        description="Nguồn dữ liệu đã lọc, sắp xếp và chọn cột để dùng lại trong tiện ích bảng điều khiển."
        backHref="/quan-tri"
        backLabel="Quản trị"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo chế độ xem
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <AdminListPanel
        title="Danh sách chế độ xem đã lưu"
        description="Chế độ xem riêng chỉ người tạo hoặc quản trị viên thấy; chế độ xem công khai có thể dùng trong toàn đơn vị."
        isLoading={isLoading}
        isEmpty={!isLoading && views.length === 0}
        emptyTitle="Chưa có chế độ xem đã lưu"
        emptyDescription="Tạo chế độ xem đầu tiên để làm nguồn dữ liệu đáng tin cậy cho tiện ích."
        emptyAction={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Tạo chế độ xem
          </button>
        }
      >
        <DataTable minWidth="980px">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Tên chế độ xem</DataTableHeaderCell>
              <DataTableHeaderCell>Lớp dữ liệu</DataTableHeaderCell>
              <DataTableHeaderCell>Công khai</DataTableHeaderCell>
              <DataTableHeaderCell>Bộ lọc</DataTableHeaderCell>
              <DataTableHeaderCell>Sắp xếp</DataTableHeaderCell>
              <DataTableHeaderCell>Trường hiển thị</DataTableHeaderCell>
              <DataTableHeaderCell>Cập nhật</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Hành động</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {views.map((view) => {
              const config = normalizeViewConfig(view.config);
              return (
                <DataTableRow key={view.id}>
                  <DataTableCell variant="primary">{view.name}</DataTableCell>
                  <DataTableCell>{view.layerName}</DataTableCell>
                  <DataTableCell>
                    <TableBadge variant={view.isPublic ? "success" : "muted"}>
                      {view.isPublic ? "Có" : "Không"}
                    </TableBadge>
                  </DataTableCell>
                  <DataTableCell>{config.filters.length}</DataTableCell>
                  <DataTableCell>{config.sorts.length}</DataTableCell>
                  <DataTableCell>
                    {config.visibleFields.length || "Mặc định"}
                  </DataTableCell>
                  <DataTableCell variant="muted">
                    {view.updatedAt
                      ? new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(view.updatedAt))
                      : "—"}
                  </DataTableCell>
                  <DataTableCell variant="actions" align="right">
                    <TableActions>
                      <TableActionButton
                        variant="primary"
                        onClick={() => void openEdit(view)}
                      >
                        Sửa
                      </TableActionButton>
                      <TableActionButton
                        variant="neutral"
                        onClick={() => void handleDuplicate(view)}
                      >
                        Duplicate
                      </TableActionButton>
                      <TableActionButton
                        variant="neutral"
                        onClick={() => void handlePreviewSaved(view)}
                      >
                        Preview
                      </TableActionButton>
                      <TableActionButton
                        variant="danger"
                        onClick={() => void handleDelete(view)}
                      >
                        Xóa
                      </TableActionButton>
                    </TableActions>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </AdminListPanel>

      {showModal && (
        <Modal
          title={editingId ? "Xem/sửa chế độ xem" : "Tạo chế độ xem"}
          onClose={closeModal}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">1. Tên chế độ xem</label>
                <input
                  className={inputClass}
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="HTX đang hoạt động"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">2. Lớp dữ liệu</label>
                <select
                  className={inputClass}
                  required
                  value={form.layerId}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      layerId: event.target.value,
                      filters: [],
                      sorts: [],
                      visibleFields: [],
                    });
                    setPreview(null);
                  }}
                >
                  <option value="">— Chọn lớp dữ liệu —</option>
                  {layers.map((layer) => (
                    <option key={layer.layerId} value={layer.layerId}>
                      {layer.layerName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium">Mô tả</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </div>
            </section>

            {selectedLayer && (
              <>
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">
                        3. Field hiển thị
                      </h3>
                      <p className="text-xs text-muted">
                        Preview chỉ trả các field đã chọn. Bỏ trống để dùng
                        field mặc định.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() =>
                          setForm({
                            ...form,
                            visibleFields: selectableFields.map(
                              (field) => field.code,
                            ),
                          })
                        }
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setForm({ ...form, visibleFields: [] })}
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-3">
                    {selectableFields.map((field) => (
                      <label key={field.code} className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.visibleFields.includes(field.code)}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              visibleFields: event.target.checked
                                ? [...form.visibleFields, field.code]
                                : form.visibleFields.filter(
                                    (code) => code !== field.code,
                                  ),
                            })
                          }
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">4. Bộ lọc</h3>
                      <p className="text-xs text-muted">
                        Tất cả điều kiện được kết hợp bằng AND.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm({
                          ...form,
                          filters: [
                            ...form.filters,
                            { field: "", operator: "eq", value: "" },
                          ],
                        })
                      }
                    >
                      + Thêm filter
                    </button>
                  </div>
                  {form.filters.map((filter, index) => {
                    const field = selectableFields.find(
                      (item) => item.code === filter.field,
                    );
                    const operators = operatorsForField(field);
                    const options = dictionaryCode(field)
                      ? (dictionaryOptions[dictionaryCode(field)!] ?? [])
                      : [];
                    const noValue = ["empty", "not_empty"].includes(
                      filter.operator,
                    );
                    return (
                      <div
                        key={index}
                        className="grid gap-2 rounded-lg border border-border bg-slate-50/50 p-3 sm:grid-cols-[1fr_180px_1fr_auto]"
                      >
                        <select
                          className={inputClass}
                          required
                          value={filter.field}
                          onChange={(event) =>
                            void updateFilterField(index, event.target.value)
                          }
                        >
                          <option value="">Chọn trường</option>
                          {selectableFields.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className={inputClass}
                          value={filter.operator}
                          onChange={(event) =>
                            updateFilter(index, {
                              operator: event.target
                                .value as SavedViewFilterOperator,
                            })
                          }
                        >
                          {operators.map((operator) => (
                            <option key={operator} value={operator}>
                              {operatorLabel(field, operator)}
                            </option>
                          ))}
                        </select>
                        <FilterValueInput
                          field={field}
                          value={filter.value}
                          options={options}
                          disabled={noValue}
                          onChange={(value) => updateFilter(index, { value })}
                        />
                        <button
                          type="button"
                          aria-label="Xóa bộ lọc"
                          className="px-2 text-red-600"
                          onClick={() =>
                            setForm({
                              ...form,
                              filters: form.filters.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">5. Sắp xếp</h3>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm({
                          ...form,
                          sorts: [
                            ...form.sorts,
                            { field: "", direction: "asc" },
                          ],
                        })
                      }
                    >
                      + Thêm sắp xếp
                    </button>
                  </div>
                  {form.sorts.map((sort, index) => (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"
                    >
                      <select
                        className={inputClass}
                        required
                        value={sort.field}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            sorts: form.sorts.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, field: event.target.value }
                                : item,
                            ),
                          })
                        }
                      >
                        <option value="">Sắp xếp theo trường</option>
                        {selectableFields.map((field) => (
                          <option key={field.code} value={field.code}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={inputClass}
                        value={sort.direction}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            sorts: form.sorts.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    direction: event.target.value as
                                      | "asc"
                                      | "desc",
                                  }
                                : item,
                            ),
                          })
                        }
                      >
                        <option value="asc">Tăng dần</option>
                        <option value="desc">Giảm dần</option>
                      </select>
                      <button
                        type="button"
                        aria-label="Xóa sắp xếp"
                        className="px-2 text-red-600"
                        onClick={() =>
                          setForm({
                            ...form,
                            sorts: form.sorts.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </section>
              </>
            )}

            <section className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">
                  Giới hạn bản ghi
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className={inputClass}
                  value={form.limit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      limit: Number(event.target.value) || 100,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Preview limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={form.previewLimit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      previewLimit: Number(event.target.value) || 20,
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) =>
                    setForm({ ...form, isPublic: event.target.checked })
                  }
                />
                <span>
                  <strong className="block">Chế độ xem công khai trong đơn vị</strong>
                  <span className="text-xs text-muted">
                    Nếu bật, mọi người trong tenant có thể thấy và dùng view này
                    khi tạo dashboard/widget. Nếu tắt, view chỉ dành cho người
                    tạo hoặc admin.
                  </span>
                </span>
              </label>
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPreviewing || !form.layerId}
                onClick={() => void handlePreviewCurrent()}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {isPreviewing ? "Đang preview..." : "6. Xem trước dữ liệu"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSubmitting ? "Đang lưu..." : "7. Lưu chế độ xem"}
              </button>
            </div>
            {preview && <PreviewTable result={preview} />}
          </form>
        </Modal>
      )}

      {showListPreview && preview && (
        <Modal
          title="Xem trước chế độ xem đã lưu"
          onClose={() => {
            setShowListPreview(false);
            setPreview(null);
          }}
          size="xl"
        >
          <PreviewTable result={preview} />
        </Modal>
      )}
    </div>
  );
}

function FilterValueInput({
  field,
  value,
  options,
  disabled,
  onChange,
}: {
  field?: DataSourceField;
  value: string;
  options: DictionaryItem[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (disabled)
    return (
      <input
        className={inputClass}
        disabled
        value="Không cần giá trị"
        readOnly
      />
    );
  if (options.length > 0)
    return (
      <select
        className={inputClass}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— Chọn giá trị —</option>
        {options.map((item) => (
          <option key={item.id} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    );
  if (field?.fieldType === "boolean")
    return (
      <select
        className={inputClass}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— Chọn —</option>
        <option value="true">Đúng</option>
        <option value="false">Sai</option>
      </select>
    );
  const type = isNumericField(field)
    ? "number"
    : DATE_FIELD_TYPES.has(field?.fieldType ?? "")
      ? "date"
      : "text";
  return (
    <input
      type={type}
      step={type === "number" ? "any" : undefined}
      className={inputClass}
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Giá trị"
    />
  );
}

function PreviewTable({ result }: { result: SavedViewPreviewResult }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Xem trước dữ liệu</h3>
          <p className="text-sm text-muted">
            Tìm thấy {result.total} bản ghi. Đang hiển thị {result.rows.length}{" "}
            dòng đầu tiên.
          </p>
        </div>
      </div>
      <DataTable
        minWidth={`${Math.max(560, result.fields.length * 180)}px`}
        scrollable
        stickyHeader
        maxHeight="360px"
      >
        <DataTableHead>
          <tr>
            {result.fields.map((field) => (
              <DataTableHeaderCell key={field.code}>
                {field.label}
              </DataTableHeaderCell>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.rows.map((row, index) => (
            <DataTableRow key={index}>
              {result.fields.map((field) => (
                <DataTableCell key={field.code}>
                  {formatPreviewValue(row[field.code])}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      {result.rows.length === 0 && (
        <p className="text-center text-sm text-muted">
          Không có bản ghi phù hợp.
        </p>
      )}
    </section>
  );
}
