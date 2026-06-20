"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DictionaryBatchValuesInput } from "@/components/admin/dictionary-values-input";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { inputClass } from "@/components/form/field-wrapper";
import {
  getDictionaryValues,
  normalizeDictionaryName,
  parseValueLabels,
  uniqueLabels,
} from "@/lib/dictionaries/utils";
import {
  createDictionaryItem,
  createDictionaryItemsBatch,
  deleteDictionaryItem,
  getDictionary,
  updateDictionaryItem,
} from "@/lib/api/dictionaries";
import type { Dictionary, DictionaryItem } from "@/types/api/dictionary";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActions,
} from "@/components/ui/data-table";

interface ValueFormState {
  label: string;
  sortOrder: number;
}

function emptyValueForm(sortOrder: number): ValueFormState {
  return { label: "", sortOrder };
}

interface DictionaryDetailPageProps {
  code: string;
}

export function DictionaryDetailPage({ code }: DictionaryDetailPageProps) {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editing, setEditing] = useState<DictionaryItem | null>(null);
  const [form, setForm] = useState<ValueFormState>(emptyValueForm(1));
  const [quickLabel, setQuickLabel] = useState("");
  const [batchText, setBatchText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDictionary(await getDictionary(code, { includeItems: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh mục");
      setDictionary(null);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const activeValues = dictionary
    ? getDictionaryValues(dictionary).filter((item) => item.isActive !== false)
    : [];

  const sortedValues = [...activeValues].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.label.localeCompare(b.label, "vi"),
  );

  function openEdit(item: DictionaryItem) {
    setEditing(item);
    setForm({
      label: item.label,
      sortOrder: item.sortOrder ?? 1,
    });
    setShowEditModal(true);
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = quickLabel.trim();
    if (!label) return;
    if (
      activeValues.some(
        (item) =>
          normalizeDictionaryName(item.label) ===
          normalizeDictionaryName(label),
      )
    ) {
      setError("Giá trị danh mục đã tồn tại trong nhóm này");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createDictionaryItem(code, {
        label,
        sortOrder: activeValues.length + 1,
      });
      setQuickLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm giá trị thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (
      activeValues.some(
        (item) =>
          item.id !== editing.id &&
          normalizeDictionaryName(item.label) ===
            normalizeDictionaryName(form.label),
      )
    ) {
      setError("Giá trị danh mục đã tồn tại trong nhóm này");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updateDictionaryItem(code, editing.id, {
        label: form.label,
        sortOrder: form.sortOrder,
      });
      setShowEditModal(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const labels = uniqueLabels(parseValueLabels(batchText));
    if (labels.length === 0) {
      setError("Nhập ít nhất một giá trị");
      return;
    }
    const existingLabels = new Set(
      activeValues.map((item) => normalizeDictionaryName(item.label)),
    );
    if (
      labels.some((label) => existingLabels.has(normalizeDictionaryName(label)))
    ) {
      setError("Giá trị danh mục đã tồn tại trong nhóm này");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createDictionaryItemsBatch(code, {
        values: labels.map((label, index) => ({
          label,
          sortOrder: activeValues.length + index + 1,
        })),
      });
      setBatchText("");
      setShowBatchModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm giá trị thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: DictionaryItem) {
    if (!confirm(`Ẩn giá trị "${item.label}"?`)) return;
    try {
      await deleteDictionaryItem(code, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ẩn giá trị thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          dictionary
            ? dictionary.name
            : isLoading
              ? "Đang tải..."
              : "Danh mục không tồn tại"
        }
        description={
          dictionary ? `${activeValues.length} giá trị lựa chọn` : undefined
        }
        backHref="/quan-tri/danh-muc"
        backLabel="Danh mục dùng chung"
        action={
          dictionary ? (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
            >
              Thêm nhiều giá trị
            </button>
          ) : undefined
        }
      />

      {dictionary?.description && (
        <p className="text-sm text-muted">{dictionary.description}</p>
      )}

      {dictionary && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">Cách dùng danh mục này</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
            <li>
              Gắn vào trường <strong>Chọn một</strong> hoặc{" "}
              <strong>Chọn nhiều</strong> khi thiết kế schema lớp dữ liệu
            </li>
            <li>
              Chọn danh mục <strong>{dictionary.name}</strong> trong cấu hình
              trường
            </li>
            <li>
              Form bản ghi hiển thị tên giá trị; hệ thống lưu nội bộ để đồng bộ
              dữ liệu
            </li>
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Giá trị lựa chọn</h2>
          <p className="text-sm text-muted">
            Các option trong select/checkbox khi nhập bản ghi
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {dictionary && (
            <form
              onSubmit={handleQuickAdd}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium">
                  Thêm giá trị nhanh
                </label>
                <input
                  className={inputClass}
                  value={quickLabel}
                  onChange={(e) => setQuickLabel(e.target.value)}
                  placeholder="vd. Trồng trọt"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !quickLabel.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                + Thêm
              </button>
            </form>
          )}

          {isLoading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : !dictionary ? (
            <p className="text-sm text-muted">
              Không tìm thấy danh mục.{" "}
              <Link
                href="/quan-tri/danh-muc"
                className="text-primary hover:underline"
              >
                Quay lại danh sách
              </Link>
            </p>
          ) : sortedValues.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có giá trị nào. Nhập ở ô phía trên hoặc dùng &quot;Thêm nhiều
              giá trị&quot;.
            </p>
          ) : (
            <DataTable minWidth="400px">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="w-16" align="center">
                    STT
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Tên giá trị</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {sortedValues.map((item, index) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell variant="index">
                      {item.sortOrder ?? index + 1}
                    </DataTableCell>
                    <DataTableCell variant="primary">
                      {item.label}
                    </DataTableCell>
                    <DataTableCell variant="actions" align="right">
                      <TableActions>
                        <TableActionButton onClick={() => openEdit(item)}>
                          Sửa
                        </TableActionButton>
                        <TableActionButton
                          variant="danger"
                          onClick={() => handleDelete(item)}
                        >
                          Ẩn
                        </TableActionButton>
                      </TableActions>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>

      {showEditModal && editing && (
        <Modal
          title="Sửa giá trị"
          onClose={() => {
            setShowEditModal(false);
            setEditing(null);
          }}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Tên giá trị</label>
              <input
                className={inputClass}
                required
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Thứ tự</label>
              <input
                type="number"
                className={inputClass}
                min={1}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Đang lưu..." : "Cập nhật"}
            </button>
          </form>
        </Modal>
      )}

      {showBatchModal && (
        <Modal
          title="Thêm nhiều giá trị"
          onClose={() => setShowBatchModal(false)}
        >
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <DictionaryBatchValuesInput
              value={batchText}
              onChange={setBatchText}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Đang thêm..." : "Thêm tất cả"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
