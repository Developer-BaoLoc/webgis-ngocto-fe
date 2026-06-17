"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { LayerStyleFields } from "@/components/admin/layer-style-fields";
import { Modal } from "@/components/ui/modal";
import { AdminListPanel } from "@/components/ui/admin-list-panel";
import { inputClass } from "@/components/form/field-wrapper";
import {
  createLayer,
  deleteLayer,
  getAdminLayers,
  updateLayer,
} from "@/lib/api/layers-admin";
import { getLayerGeometryTypes } from "@/lib/api/metadata";
import {
  buildStylePayload,
  extractStyleFromLayer,
  findGeometryMeta,
  getDefaultStyle,
} from "@/lib/layers/style";
import { getLayerSchemaStatusBadge } from "@/lib/layers/schema-admin";
import {
  enrichGeometryTypes,
  FALLBACK_GEOMETRY_TYPES,
} from "@/lib/layers/geometry-types";
import type { AdminLayer, LayerStyle } from "@/types/api/admin";
import type { LayerGeometryTypeMeta } from "@/types/api/metadata";
import { geometryKindLabels } from "@/types/layer.types";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  TableActionButton,
  TableActionLink,
  TableActions,
  TableBadge,
} from "@/components/ui/data-table";

interface LayerFormState {
  name: string;
  description: string;
  geometryType: string;
  sortOrder: number;
  style: LayerStyle;
}

function emptyForm(sortOrder: number, geometryType = "point"): LayerFormState {
  return {
    name: "",
    description: "",
    geometryType,
    sortOrder,
    style: getDefaultStyle(geometryType),
  };
}

export function LayerAdminPage() {
  const router = useRouter();
  const [layers, setLayers] = useState<AdminLayer[]>([]);
  const [geometryTypes, setGeometryTypes] = useState<LayerGeometryTypeMeta[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminLayer | null>(null);
  const [form, setForm] = useState<LayerFormState>(emptyForm(1));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [adminLayers, types] = await Promise.all([
        getAdminLayers(),
        getLayerGeometryTypes().catch(() => []),
      ]);
      setLayers(adminLayers.filter((layer) => layer.isActive !== false));
      setGeometryTypes(enrichGeometryTypes(types));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const typeOptions =
    geometryTypes.length > 0 ? geometryTypes : FALLBACK_GEOMETRY_TYPES;

  const selectedMeta = findGeometryMeta(typeOptions, form.geometryType);
  const isSubLayer = form.geometryType === "sub_layer";

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(layers.length + 1));
    setShowForm(true);
  }

  function openEdit(layer: AdminLayer) {
    setEditing(layer);
    setForm({
      name: layer.name,
      description: layer.description ?? "",
      geometryType: layer.geometryType,
      sortOrder: layer.sortOrder,
      style: extractStyleFromLayer(layer),
    });
    setShowForm(true);
  }

  function handleGeometryTypeChange(geometryType: string) {
    setForm((f) => ({
      ...f,
      geometryType,
      style: getDefaultStyle(geometryType),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateLayer(editing.id, {
          name: form.name,
          description: form.description || null,
          sortOrder: form.sortOrder,
          style: buildStylePayload(form.geometryType, form.style),
        });
      } else {
        await createLayer({
          name: form.name,
          description: form.description || null,
          geometryType: form.geometryType,
          sortOrder: form.sortOrder,
          style: buildStylePayload(form.geometryType, form.style),
        });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(layer: AdminLayer) {
    const confirmed = confirm(
      `Xóa vĩnh viễn lớp "${layer.name}"?\n\nToàn bộ cấu trúc, bản ghi và dữ liệu trên bản đồ sẽ bị xóa. Không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await deleteLayer(layer.id);
      setLayers((prev) => prev.filter((item) => item.id !== layer.id));

      const recordsNote =
        result.recordsDeleted && result.recordsDeleted > 0
          ? ` (${result.recordsDeleted} bản ghi đã xóa)`
          : "";

      setSuccess(`Đã xóa lớp "${layer.name}"${recordsNote}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại");
    }
  }

  function layerTypeLabel(layer: AdminLayer) {
    const meta = findGeometryMeta(typeOptions, layer.geometryType);
    return (
      meta?.label ??
      geometryKindLabels[layer.geometryType] ??
      layer.geometryType
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý lớp dữ liệu"
        backHref="/quan-tri"
        backLabel="Quản trị"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Tạo lớp mới
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <AdminListPanel
        title="Danh sách lớp"
        description="Quản lý loại hình học, icon hiển thị và liên kết tới thiết kế cấu trúc trường."
        isLoading={isLoading}
        isEmpty={!isLoading && layers.length === 0}
        emptyTitle="Chưa có lớp nào"
        emptyDescription='Nhấn "Tạo lớp mới" để bắt đầu thiết lập dữ liệu GIS.'
        emptyAction={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Tạo lớp mới
          </button>
        }
      >
        <DataTable scrollable stickyHeader stickyActions>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Tên</DataTableHeaderCell>
                  <DataTableHeaderCell>Loại</DataTableHeaderCell>
                  <DataTableHeaderCell>Cấu trúc</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {layers.map((layer) => {
                  const schemaBadge = getLayerSchemaStatusBadge(layer);

                  return (
                  <DataTableRow key={layer.id}>
                    <DataTableCell variant="primary">
                      {layer.name}
                    </DataTableCell>
                    <DataTableCell variant="muted">
                      {layerTypeLabel(layer)}
                    </DataTableCell>
                    <DataTableCell>
                      <TableBadge variant={schemaBadge.variant}>
                        {schemaBadge.label}
                      </TableBadge>
                    </DataTableCell>
                    <DataTableCell variant="actions" align="right">
                      <TableActions>
                        <TableActionLink
                          href={`/quan-tri/lop-du-lieu/${layer.id}/schema`}
                        >
                          Cấu trúc
                        </TableActionLink>
                        <TableActionLink href={`/lop-du-lieu/${layer.code}`}>
                          Dữ liệu
                        </TableActionLink>
                        <TableActionButton onClick={() => openEdit(layer)}>
                          Sửa
                        </TableActionButton>
                        <TableActionButton
                          variant="danger"
                          onClick={() => handleDelete(layer)}
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

      {showForm && (
        <Modal
          title={editing ? "Sửa lớp" : "Tạo lớp mới"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Tên lớp</label>
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Chủ thể kinh tế tập thể"
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
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Loại lớp</label>
                <select
                  className={inputClass}
                  value={form.geometryType}
                  disabled={!!editing}
                  onChange={(e) => handleGeometryTypeChange(e.target.value)}
                >
                  {typeOptions.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {editing && (
                  <p className="mt-1 text-xs text-muted">
                    Không đổi loại sau khi tạo
                  </p>
                )}
                {isSubLayer && !editing && (
                  <p className="mt-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs text-blue-800">
                    Lớp phụ không yêu cầu icon, marker hoặc tọa độ. Lớp này dùng
                    làm bảng con/import danh sách và không hiển thị trực tiếp trên bản đồ.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium">Thứ tự</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {selectedMeta && selectedMeta.styleFields.length > 0 && (
              <LayerStyleFields
                fields={selectedMeta.styleFields}
                style={form.style}
                onChange={(style) => setForm((f) => ({ ...f, style }))}
              />
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
                    : "Tạo lớp"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
