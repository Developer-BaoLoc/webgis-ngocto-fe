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
  const [layers, setLayers] = useState<AdminLayer[]>([]);
  const [targetFields, setTargetFields] = useState<SchemaField[]>([]);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [checkResult, setCheckResult] =
    useState<RelationshipCheckResult | null>(null);
  const [resolveResult, setResolveResult] =
    useState<RelationshipResolveAgainResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const relationType = String(dataSchema.relationType ?? "many-to-one");
  const targetLayerId = String(dataSchema.targetLayerId ?? "");

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

  const fieldOptions = [
    { code: "id", label: "ID bản ghi" },
    ...targetFields.map((field) => ({
      code: field.code,
      label: `${field.label} (${field.code})`,
    })),
  ];
  const effectiveFieldCode =
    fieldCode || String(dataSchema.foreignKey ?? "").trim();

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
        fieldCode: effectiveFieldCode || undefined,
        relationType,
        targetLayerId,
        foreignKey: String(dataSchema.foreignKey ?? effectiveFieldCode),
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
    if (
      !confirm(
        `Resolve lại relationship cho field "${effectiveFieldCode}"? Dữ liệu text khớp sẽ được chuyển thành feature id.`,
      )
    ) {
      return;
    }
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
      <p className="text-sm font-medium">Cấu hình relationship</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Relation Type *</label>
          <select
            className={inputClass}
            required
            value={relationType}
            onChange={(event) =>
              patch({ relationType: event.target.value })
            }
          >
            <option value="many-to-one">Many-to-One</option>
            <option value="one-to-many">One-to-Many</option>
            <option value="many-to-many">Many-to-Many</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Target Table / Layer *</label>
          <select
            className={inputClass}
            required
            disabled={loadingLayers}
            value={targetLayerId}
            onChange={(event) =>
              patch({
                targetLayerId: event.target.value,
                targetDisplayField: "",
                matchField: "",
              })
            }
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
          <label className="block text-sm font-medium">Foreign Key field</label>
          <input
            className={inputClass}
            value={String(dataSchema.foreignKey ?? "")}
            onChange={(event) => patch({ foreignKey: event.target.value })}
            placeholder={relationType === "one-to-many" ? "entity_id" : "entity_id"}
          />
          <p className="mt-1 text-xs text-muted">
            Many-to-One: dùng làm field code lưu ID. One-to-Many: field ở layer con.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Display Field *</label>
          <select
            className={inputClass}
            required
            disabled={!targetLayerId || loadingFields}
            value={String(dataSchema.targetDisplayField ?? "")}
            onChange={(event) =>
              patch({ targetDisplayField: event.target.value })
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

        <div>
          <label className="block text-sm font-medium">Match Field khi import</label>
          <select
            className={inputClass}
            disabled={!targetLayerId || loadingFields}
            value={String(dataSchema.matchField ?? "")}
            onChange={(event) => patch({ matchField: event.target.value })}
          >
            <option value="">Theo Display Field</option>
            {fieldOptions.map((field) => (
              <option key={field.code} value={field.code}>
                {field.label}
              </option>
            ))}
          </select>
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
        </div>
      </div>

      {relationType === "many-to-many" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Many-to-Many đã lưu được metadata để mở rộng, nhưng UI nhập liệu/import hiện ưu tiên Many-to-One và One-to-Many.
        </p>
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
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <span>Có khóa ngoại: <strong>{checkResult.childWithForeignKey}</strong></span>
              <span>Match được: <strong>{checkResult.matched}</strong></span>
              <span>Không match: <strong>{checkResult.unmatched}</strong></span>
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
