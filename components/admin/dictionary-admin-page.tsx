"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminSubNav } from "@/components/admin/admin-sub-nav";
import { DictionaryValuesInput } from "@/components/admin/dictionary-values-input";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { inputClass } from "@/components/form/field-wrapper";
import { uniqueLabels } from "@/lib/dictionaries/utils";
import {
  createDictionary,
  deleteDictionary,
  getDictionaries,
  updateDictionary,
} from "@/lib/api/dictionaries";
import type { Dictionary } from "@/types/api/dictionary";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableCountBadge,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActionLink,
  TableActions,
} from "@/components/ui/data-table";

interface DictionaryFormState {
  name: string;
  description: string;
  valueLabels: string[];
}

function emptyForm(): DictionaryFormState {
  return { name: "", description: "", valueLabels: [""] };
}

export function DictionaryAdminPage() {
  const router = useRouter();
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Dictionary | null>(null);
  const [form, setForm] = useState<DictionaryFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDictionaries(await getDictionaries());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(dict: Dictionary) {
    setEditing(dict);
    setForm({
      name: dict.name,
      description: dict.description ?? "",
      valueLabels: [""],
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateDictionary(editing.code, {
          name: form.name,
          description: form.description || null,
        });
        setShowForm(false);
        await load();
      } else {
        const labels = uniqueLabels(form.valueLabels);
        const created = await createDictionary({
          name: form.name,
          description: form.description || undefined,
          isHierarchical: false,
          values: labels.map((label) => ({ label })),
        });
        setShowForm(false);
        await load();
        router.push(`/quan-tri/danh-muc/${created.code}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(dict: Dictionary) {
    if (
      !confirm(
        `Xóa danh mục "${dict.name}" và mọi giá trị bên trong? Các trường đang dùng danh mục này có thể bị lỗi.`,
      )
    )
      return;
    try {
      await deleteDictionary(dict.code);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <AdminSubNav />

      <PageHeader
        title="Danh mục dùng chung"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Thêm danh mục
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : dictionaries.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có danh mục nào. Tạo danh mục (vd. &quot;Ngành nghề sản
              xuất&quot;) và thêm các giá trị (vd. Trồng trọt, Chăn nuôi).
            </p>
          ) : (
            <DataTable minWidth="480px">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Tên danh mục</DataTableHeaderCell>
                  <DataTableHeaderCell align="center">
                    Số giá trị
                  </DataTableHeaderCell>
                  <DataTableHeaderCell align="right">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {dictionaries.map((dict) => (
                  <DataTableRow key={dict.id}>
                    <DataTableCell variant="primary">{dict.name}</DataTableCell>
                    <DataTableCell align="center">
                      <DataTableCountBadge count={dict.itemCount ?? 0} />
                    </DataTableCell>
                    <DataTableCell variant="actions" align="right">
                      <TableActions>
                        <TableActionLink
                          href={`/quan-tri/danh-muc/${dict.code}`}
                        >
                          Quản lý giá trị
                        </TableActionLink>
                        <TableActionButton onClick={() => openEdit(dict)}>
                          Sửa
                        </TableActionButton>
                        <TableActionButton
                          variant="danger"
                          onClick={() => handleDelete(dict)}
                        >
                          Xóa
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

      {showForm && (
        <Modal
          title={editing ? "Sửa danh mục" : "Thêm danh mục mới"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && (
              <p className="text-xs text-muted">
                Sửa giá trị tại màn{" "}
                <Link
                  href={`/quan-tri/danh-muc/${editing.code}`}
                  className="text-primary hover:underline"
                >
                  Quản lý giá trị
                </Link>
              </p>
            )}

            <div>
              <label className="block text-sm font-medium">Tên danh mục</label>
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ngành nghề sản xuất"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Mô tả</label>
              <input
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Phân loại ngành nghề HTX"
              />
            </div>

            {!editing && (
              <div className="rounded-lg border border-border bg-slate-50 p-3">
                <label className="block text-sm font-medium">
                  Giá trị lựa chọn ban đầu
                </label>
                <p className="mb-3 text-xs text-muted">
                  Các option hiển thị trong select/checkbox khi nhập bản ghi. Có
                  thể thêm sau ở màn chi tiết.
                </p>
                <DictionaryValuesInput
                  labels={form.valueLabels}
                  onChange={(valueLabels) =>
                    setForm((f) => ({ ...f, valueLabels }))
                  }
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : editing
                    ? "Cập nhật"
                    : "Tạo danh mục"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
