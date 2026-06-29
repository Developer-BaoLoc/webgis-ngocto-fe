"use client";

import { useEffect, useState } from "react";
import type { ConfigFieldMeta } from "@/types/api/metadata";
import {
  getConfigFieldsForType,
  getVisibleConfigFields,
} from "@/lib/fields/field-config";
import { inputClass } from "@/components/form/field-wrapper";
import { DictionaryPicker } from "@/components/admin/dictionary-picker";
import {
  checkRelationship,
  resolveAgainRelationship,
} from "@/lib/api/metadata";
import { getAdminLayers } from "@/lib/api/layers-admin";
import { getLayerSchema } from "@/lib/api/layers";
import type { AdminLayer } from "@/types/api/admin";
import type {
  RelationshipCheckResult,
  RelationshipResolveAgainResult,
} from "@/types/api/metadata";
import type { SchemaField } from "@/types/api/schema";
import { useMessage } from "@/providers/message-provider";

interface FieldConfigFormProps {
  fieldType: string;
  dataSchema: Record<string, unknown>;
  configFields?: ConfigFieldMeta[];
  sourceLayerId?: string;
  fieldCode?: string;
  onChange: (dataSchema: Record<string, unknown>) => void;
}

export function FieldConfigForm({
  fieldType,
  dataSchema,
  configFields,
  sourceLayerId,
  fieldCode,
  onChange,
}: FieldConfigFormProps) {
  if (fieldType === "relationship") {
    return (
      <RelationshipConfigForm
        dataSchema={dataSchema}
        sourceLayerId={sourceLayerId}
        fieldCode={fieldCode}
        onChange={onChange}
      />
    );
  }

  const visibleFields = getVisibleConfigFields(
    fieldType,
    dataSchema,
    configFields,
  );

  if (visibleFields.length === 0) return null;

  function handleChange(key: string, value: string) {
    const next = { ...dataSchema, [key]: value };
    if (key === "measurementType") {
      delete next.unit;
    }
    onChange(next);
  }

  function handleNumberChange(key: string, value: string) {
    const next = { ...dataSchema };
    if (value === "") {
      delete next[key];
    } else {
      next[key] = Number(value);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-3">
      <p className="text-sm font-medium">Cấu hình kiểu dữ liệu</p>
      {visibleFields.map((field) => (
        <div key={`${field.key}-${field.label}`}>
          <label className="block text-sm font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.type === "dictionary" ? (
            <DictionaryPicker
              value={String(dataSchema[field.key] ?? "")}
              onChange={(code) => handleChange(field.key, code)}
              required={field.required}
            />
          ) : field.type === "number" ? (
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={
                dataSchema[field.key] === undefined
                  ? ""
                  : String(dataSchema[field.key])
              }
              onChange={(e) => handleNumberChange(field.key, e.target.value)}
              placeholder="20"
            />
          ) : (
            <select
              className={inputClass}
              required={field.required}
              value={String(dataSchema[field.key] ?? "")}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              <option value="">— Chọn —</option>
              {field.options?.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

function RelationshipConfigForm({
  dataSchema,
  sourceLayerId,
  fieldCode,
  onChange,
}: {
  dataSchema: Record<string, unknown>;
  sourceLayerId?: string;
  fieldCode?: string;
  onChange: (dataSchema: Record<string, unknown>) => void;
}) {
  const message = useMessage();
  const [layers, setLayers] = useState<AdminLayer[]>([]);
  const [targetFields, setTargetFields] = useState<SchemaField[]>([]);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const [checkResult, setCheckResult] =
    useState<RelationshipCheckResult | null>(null);
  const [resolveResult, setResolveResult] =
    useState<RelationshipResolveAgainResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const relationType = String(dataSchema.relationType ?? "many-to-one");
  const targetLayerId = String(dataSchema.targetLayerId ?? "");
  const sourceLayer = layers.find((layer) => layer.id === sourceLayerId);
  const targetLayer = layers.find((layer) => layer.id === targetLayerId);

  useEffect(() => {
    let cancelled = false;
    setLoadingLayers(true);
    getAdminLayers()
      .then((items) => {
        if (!cancelled) setLayers(items);
      })
      .catch(() => {
        if (!cancelled) setLayers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLayers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!targetLayerId) {
      setTargetFields([]);
      return;
    }
    let cancelled = false;
    setTargetFields([]);
    setLoadingFields(true);
    getLayerSchema(targetLayerId)
      .then((schema) => {
        if (!cancelled) setTargetFields(schema.fields ?? []);
      })
      .catch(() => {
        if (!cancelled) setTargetFields([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFields(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetLayerId]);

  useEffect(() => {
    if (!dataSchema.relationType) {
      onChange({
        ...dataSchema,
        relationType: "many-to-one",
        targetPrimaryKey: "id",
        notFoundAction: "error",
      });
    }
  }, [dataSchema, onChange]);

  function patch(patchData: Record<string, unknown>) {
    setCheckResult(null);
    setResolveResult(null);
    setActionError(null);
    onChange({
      ...dataSchema,
      targetPrimaryKey: "id",
      notFoundAction: dataSchema.notFoundAction ?? "error",
      ...patchData,
    });
  }

  function normalizeCode(value: string): string {
    const normalized = value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
    if (!normalized) return "entity";
    return /^[a-z]/.test(normalized) ? normalized : `l_${normalized}`;
  }

  function suggestedForeignKey(layer?: AdminLayer): string {
    if (!layer) return "entity_id";
    return `${normalizeCode(layer.code || layer.name)}_id`;
  }

  function relationshipTargetMatchesCurrentLayer(field: SchemaField): boolean {
    const schema = field.dataSchema ?? {};
    const targetId = String(schema.targetLayerId ?? "").trim();
    const targetCode = String(
      schema.targetLayerCode ?? schema.targetTable ?? "",
    ).trim();
    return (
      targetId === sourceLayerId ||
      (!!sourceLayer?.code && targetCode === sourceLayer.code)
    );
  }

  function reverseManyToOneField(): SchemaField | null {
    if (relationType !== "one-to-many" || !sourceLayerId) return null;
    return (
      targetFields.find(
        (field) =>
          field.fieldType === "relationship" &&
          String(field.dataSchema?.relationType ?? "") === "many-to-one" &&
          relationshipTargetMatchesCurrentLayer(field),
      ) ?? null
    );
  }

  function foreignKeyFromRelationshipField(field: SchemaField | null): string {
    if (!field) return "";
    return String(field.dataSchema?.foreignKey ?? "").trim() || field.code;
  }

  function shouldAutoReplaceForeignKey(current: string): boolean {
    if (!current) return true;
    return [
      suggestedForeignKey(sourceLayer),
      suggestedForeignKey(targetLayer),
      "entity_id",
    ].includes(current);
  }

  function handleTargetLayerChange(nextTargetLayerId: string) {
    const nextTarget = layers.find((layer) => layer.id === nextTargetLayerId);
    const currentForeignKey = String(dataSchema.foreignKey ?? "").trim();
    patch({
      targetLayerId: nextTargetLayerId,
      targetDisplayField: "",
      matchField: "",
      ...(shouldAutoReplaceForeignKey(currentForeignKey)
        ? {
            foreignKey:
              relationType === "one-to-many"
                ? suggestedForeignKey(sourceLayer)
                : suggestedForeignKey(nextTarget),
          }
        : {}),
    });
  }

  function handleRelationTypeChange(nextRelationType: string) {
    const currentForeignKey = String(dataSchema.foreignKey ?? "").trim();
    patch({
      relationType: nextRelationType,
      ...(shouldAutoReplaceForeignKey(currentForeignKey)
        ? {
            foreignKey:
              nextRelationType === "one-to-many"
                ? suggestedForeignKey(sourceLayer)
                : suggestedForeignKey(targetLayer),
          }
        : {}),
    });
  }

  function fieldLabel(code: string) {
    return fieldOptions.find((field) => field.code === code)?.label ?? code;
  }

  function selectedPopupFields(): string[] {
    return Array.isArray(dataSchema.popupFields)
      ? dataSchema.popupFields.map(String)
      : [];
  }

  function togglePopupField(code: string, checked: boolean) {
    const current = selectedPopupFields();
    const next = checked
      ? [...new Set([...current, code])]
      : current.filter((item) => item !== code);
    patch({ popupDisplayMode: "table", popupFields: next });
  }

  const reverseManyToOne = reverseManyToOneField();
  const reverseForeignKey = foreignKeyFromRelationshipField(reverseManyToOne);
  const effectiveForeignKey =
    String(dataSchema.foreignKey ?? "").trim() ||
    fieldCode ||
    reverseForeignKey ||
    (relationType === "one-to-many"
      ? suggestedForeignKey(sourceLayer)
      : suggestedForeignKey(targetLayer));

  const fieldOptions = [
    { code: "id", label: "ID bản ghi" },
    ...targetFields.map((field) => ({
      code: field.code,
      label: `${field.label} (${field.code})`,
    })),
  ];
  const effectiveFieldCode =
    fieldCode || effectiveForeignKey;
  const totalChildRecords =
    checkResult?.totalChildRecords ?? checkResult?.childWithForeignKey ?? 0;
  const linkedCount = checkResult ? checkResult.childWithForeignKey : 0;
  const missingLinkCount = checkResult
    ? Math.max(0, totalChildRecords - checkResult.childWithForeignKey)
    : 0;

  useEffect(() => {
    if (relationType !== "one-to-many" || !reverseForeignKey) return;
    const currentForeignKey = String(dataSchema.foreignKey ?? "").trim();
    if (!shouldAutoReplaceForeignKey(currentForeignKey)) return;
    if (currentForeignKey === reverseForeignKey) return;
    onChange({
      ...dataSchema,
      targetPrimaryKey: "id",
      notFoundAction: dataSchema.notFoundAction ?? "error",
      foreignKey: reverseForeignKey,
    });
  }, [
    dataSchema,
    onChange,
    relationType,
    reverseForeignKey,
    sourceLayer,
    targetLayer,
    fieldCode,
  ]);

  async function handleCheck() {
    if (!sourceLayerId) {
      setActionError("Thiếu source layer để kiểm tra liên kết.");
      return;
    }
    setChecking(true);
    setActionError(null);
    setCheckResult(null);
    try {
      const result = await checkRelationship({
        sourceLayerId,
        relationType,
        targetLayerId,
        foreignKey: effectiveForeignKey,
        targetDisplayField: String(dataSchema.targetDisplayField ?? ""),
        matchField: String(dataSchema.matchField ?? ""),
      });
      setCheckResult(result);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Kiểm tra liên kết thất bại",
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleResolveAgain() {
    if (!sourceLayerId || !effectiveFieldCode) {
      setActionError(
        "Cần lưu field hoặc nhập Foreign Key trước khi resolve lại relationship.",
      );
      return;
    }
    const confirmed = await message.confirm({
      title: "Resolve lại relationship?",
      description: `Trường “${effectiveFieldCode}” sẽ chuyển dữ liệu văn bản khớp thành ID đối tượng.`,
      confirmLabel: "Resolve lại",
    });
    if (!confirmed) return;
    setResolving(true);
    setActionError(null);
    setResolveResult(null);
    try {
      const result = await resolveAgainRelationship({
        sourceLayerId,
        fieldCode: effectiveFieldCode,
      });
      setResolveResult(result);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Resolve lại relationship thất bại",
      );
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Cấu hình relationship</p>
          <p className="text-xs text-muted">
            Dùng để liên kết bản ghi giữa các lớp dữ liệu động.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("basic")}
            className={`rounded-md px-3 py-1.5 ${
              mode === "basic"
                ? "bg-primary text-white"
                : "text-muted hover:bg-slate-50"
            }`}
          >
            Cơ bản
          </button>
          <button
            type="button"
            onClick={() => setMode("advanced")}
            className={`rounded-md px-3 py-1.5 ${
              mode === "advanced"
                ? "bg-primary text-white"
                : "text-muted hover:bg-slate-50"
            }`}
          >
            Nâng cao
          </button>
        </div>
      </div>

      {mode === "basic" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">
              {relationType === "one-to-many"
                ? "Lớp này có danh sách"
                : "Lớp này thuộc về"}{" "}
              *
            </label>
            <select
              className={inputClass}
              required
              disabled={loadingLayers}
              value={targetLayerId}
              onChange={(event) => handleTargetLayerChange(event.target.value)}
            >
              <option value="">— Chọn layer —</option>
              {layers
                .filter((layer) => layer.id !== sourceLayerId)
                .map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name} ({layer.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Kiểu quan hệ *</label>
            <select
              className={inputClass}
              required
              value={relationType}
              onChange={(event) =>
                handleRelationTypeChange(event.target.value)
              }
            >
              <option value="many-to-one">
                Nhiều {sourceLayer?.name ?? "bản ghi này"} thuộc một{" "}
                {targetLayer?.name ?? "bản ghi ở lớp kia"}
              </option>
              <option value="one-to-many">
                Một {sourceLayer?.name ?? "bản ghi này"} có nhiều{" "}
                {targetLayer?.name ?? "bản ghi ở lớp kia"}
              </option>
              <option value="many-to-many">Nhiều - nhiều (thiết kế trước)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              {relationType === "one-to-many"
                ? "Hiển thị mỗi dòng bằng"
                : "Trường hiển thị"}{" "}
              *
            </label>
            <select
              className={inputClass}
              required
              disabled={!targetLayerId || loadingFields}
              value={String(dataSchema.targetDisplayField ?? "")}
              onChange={(event) =>
                patch({
                  targetDisplayField: event.target.value,
                  matchField: dataSchema.matchField || event.target.value,
                })
              }
            >
              <option value="">— Chọn field hiển thị —</option>
              {fieldOptions.map((field) => (
                <option key={field.code} value={field.code}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {relationType !== "one-to-many" && (
            <div>
              <label className="block text-sm font-medium">
                Khi import thì dò{" "}
                {targetLayer?.name ? targetLayer.name : "layer đích"} theo
              </label>
              <select
                className={inputClass}
                disabled={!targetLayerId || loadingFields}
                value={String(dataSchema.matchField ?? "")}
                onChange={(event) => patch({ matchField: event.target.value })}
              >
                <option value="">
                  Theo field hiển thị
                  {dataSchema.targetDisplayField
                    ? ` (${fieldLabel(String(dataSchema.targetDisplayField))})`
                    : ""}
                </option>
                {fieldOptions.map((field) => (
                  <option key={field.code} value={field.code}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900 sm:col-span-2">
            {relationType === "one-to-many" ? (
              reverseManyToOne ? (
                <div className="space-y-1">
                  <p>
                    Hệ thống đã tìm thấy liên kết:{" "}
                    <strong>
                      {targetLayer?.name ?? "Lớp dữ liệu con"}.
                      {reverseManyToOne.label}
                    </strong>{" "}
                    → <strong>{sourceLayer?.name ?? "layer hiện tại"}</strong>
                  </p>
                  <p>
                    Khóa liên kết dùng chung:{" "}
                    <strong className="font-mono">{effectiveForeignKey}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-amber-900">
                  <p>
                    Chưa tìm thấy liên kết ngược từ{" "}
                    <strong>{targetLayer?.name ?? "layer con"}</strong> về{" "}
                    <strong>{sourceLayer?.name ?? "layer hiện tại"}</strong>.
                  </p>
                  <p>
                    Vui lòng tạo field Many-to-One ở{" "}
                    <strong>{targetLayer?.name ?? "lớp phụ"}</strong> trước.
                    Khóa gợi ý theo lớp chính là{" "}
                    <strong className="font-mono">{effectiveForeignKey}</strong>.
                  </p>
                </div>
              )
            ) : (
              <>
                Khóa liên kết sẽ được lưu tự động vào:{" "}
                <strong className="font-mono">{effectiveForeignKey}</strong>.
                Người dùng chỉ nhìn thấy label đã resolve, không phải ID thô.
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Relation Type *</label>
          <select
            className={inputClass}
            required
            value={relationType}
            onChange={(event) =>
              handleRelationTypeChange(event.target.value)
            }
          >
            <option value="many-to-one">Nhiều - một</option>
            <option value="one-to-many">Một - nhiều</option>
            <option value="many-to-many">Nhiều - nhiều</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Bảng / lớp dữ liệu đích *</label>
          <select
            className={inputClass}
            required
            disabled={loadingLayers}
            value={targetLayerId}
            onChange={(event) => handleTargetLayerChange(event.target.value)}
          >
            <option value="">— Chọn layer —</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name} ({layer.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Trường khóa ngoại</label>
          <input
            className={inputClass}
            value={String(dataSchema.foreignKey ?? "")}
            onChange={(event) => patch({ foreignKey: event.target.value })}
            placeholder={effectiveForeignKey}
          />
          <p className="mt-1 text-xs text-muted">
            Tên trường ẩn dùng để lưu ID bản ghi được liên kết. Người dùng thường không cần chỉnh.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Trường hiển thị *</label>
          <select
            className={inputClass}
            required
            disabled={!targetLayerId || loadingFields}
            value={String(dataSchema.targetDisplayField ?? "")}
            onChange={(event) =>
              patch({ targetDisplayField: event.target.value })
            }
          >
            <option value="">— Chọn trường hiển thị —</option>
            {fieldOptions.map((field) => (
              <option key={field.code} value={field.code}>
                {field.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Trường ở lớp đích dùng làm nhãn hiển thị thay cho ID.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Trường đối chiếu khi nhập dữ liệu</label>
          <select
            className={inputClass}
            disabled={!targetLayerId || loadingFields}
            value={String(dataSchema.matchField ?? "")}
            onChange={(event) => patch({ matchField: event.target.value })}
          >
            <option value="">Theo trường hiển thị</option>
            {fieldOptions.map((field) => (
              <option key={field.code} value={field.code}>
                {field.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Khi nhập văn bản, hệ thống dùng trường này để tìm bản ghi cha.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Nếu import không tìm thấy</label>
          <select
            className={inputClass}
            value={String(dataSchema.notFoundAction ?? "error")}
            onChange={(event) => patch({ notFoundAction: event.target.value })}
          >
            <option value="error">Báo lỗi</option>
            <option value="skip">Bỏ qua dòng</option>
            <option value="create_parent">Tự tạo bản ghi cha (thiết kế trước)</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            Mặc định báo lỗi để tránh liên kết sai hoặc mất dữ liệu âm thầm.
          </p>
        </div>
      </div>
      )}

      {relationType === "many-to-many" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Quan hệ nhiều - nhiều đã lưu được siêu dữ liệu để mở rộng, nhưng giao diện nhập dữ liệu hiện ưu tiên quan hệ nhiều - một và một - nhiều.
        </p>
      )}

      {relationType === "one-to-many" && (
        <div className="space-y-3 rounded-md border border-border bg-white px-3 py-3">
          <div>
            <p className="text-sm font-medium">Hiển thị danh sách con trong popup</p>
            <p className="mt-1 text-xs text-muted">
              Chọn các field của layer con muốn hiển thị. Nếu không chọn, popup tự lấy các field đầu tiên có dữ liệu.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Kiểu hiển thị</label>
              <select
                className={inputClass}
                value={String(dataSchema.popupDisplayMode ?? "table")}
                onChange={(event) =>
                  patch({ popupDisplayMode: event.target.value })
                }
              >
                <option value="table">Bảng trên máy tính, thẻ trên di động</option>
                <option value="cards">Danh sách thẻ</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Trường hiển thị</p>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-border bg-slate-50 p-2 sm:grid-cols-2">
                {targetFields
                  .filter((field) => field.code !== effectiveForeignKey)
                  .map((field) => {
                    const selected = selectedPopupFields().includes(field.code);
                    return (
                      <label
                        key={field.fieldId}
                        className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) =>
                            togglePopupField(field.code, event.target.checked)
                          }
                        />
                        <span>
                          {field.label}{" "}
                          <span className="font-mono text-muted">
                            ({field.code})
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-sky-200 bg-white px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={checking || !targetLayerId}
            onClick={handleCheck}
            className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "Đang kiểm tra..." : "Kiểm tra liên kết"}
          </button>
          <button
            type="button"
            disabled={
              resolving ||
              relationType !== "many-to-one" ||
              !sourceLayerId ||
              !effectiveFieldCode
            }
            onClick={handleResolveAgain}
            className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resolving ? "Đang resolve..." : "Resolve lại relationship"}
          </button>
        </div>

        {actionError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {actionError}
          </p>
        )}

        {checkResult && (
          <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-xs text-foreground">
            <p className="font-semibold">
              {checkResult.childLayer.name} → {checkResult.parentLayer.name}
            </p>
            {totalChildRecords === 0 ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                Chưa có dữ liệu để kiểm tra. Vui lòng import dữ liệu trước hoặc bấm "Resolve lại relationship".
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <span>
                  Tổng số bản ghi con: <strong>{totalChildRecords}</strong>
                </span>
                <span>
                  Đã có liên kết: <strong>{linkedCount}</strong>
                </span>
                <span>
                  Chưa có liên kết: <strong>{missingLinkCount}</strong>
                </span>
                <span>
                  Liên kết hợp lệ: <strong>{checkResult.matched}</strong>
                </span>
                <span>
                  Liên kết lỗi: <strong>{checkResult.unmatched}</strong>
                </span>
              </div>
            )}
            {relationType === "many-to-one" && checkResult.matched > 0 && (
              <p className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-800">
                Bạn có muốn tạo quan hệ ngược để hiển thị danh sách con trong popup bản đồ không?
              </p>
            )}
            <div className="mt-2 text-muted">
              Foreign key: <strong className="font-mono">{checkResult.foreignKey}</strong>
            </div>
            {checkResult.errors.length > 0 && (
              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-red-700">
                {checkResult.errors.map((item) => (
                  <li key={`${item.childId}-${item.rawValue}`}>
                    {item.childLabel}: {item.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {resolveResult && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <p className="font-semibold">Resolve lại hoàn tất</p>
            <p className="mt-1">
              Quét {resolveResult.scanned} bản ghi · đã là ID {resolveResult.alreadyIds} · cập nhật {resolveResult.updated} · chưa match {resolveResult.notMatched}
            </p>
            {resolveResult.errors.length > 0 && (
              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-amber-800">
                {resolveResult.errors.map((item) => (
                  <li key={`${item.recordId}-${item.rawValue}`}>
                    {item.rawValue}: {item.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function hasFieldConfig(
  fieldType: string,
  configFields?: ConfigFieldMeta[],
): boolean {
  return getConfigFieldsForType(fieldType, configFields).length > 0;
}
