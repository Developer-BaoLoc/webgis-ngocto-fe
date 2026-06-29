"use client";

import { useMemo, useRef, useState } from "react";
import { AreaPolygonMapPicker } from "@/components/form/area-polygon-map-picker";
import {
  buildNewFieldDrafts,
  ImportNewFieldsPanel,
  newFieldMappingRows,
  selectedNewFields,
  validateNewFieldDrafts,
  type ImportNewFieldDraft,
} from "@/components/import/import-new-fields-panel";
import type { AreaPolygonValue } from "@/lib/fields/area-polygon";
import { Modal } from "@/components/ui/modal";
import { wardConfig } from "@/config/ward.config";
import {
  executeGeoJsonImport,
  previewGeoJsonImport,
  uploadGeoJsonImportFile,
  type GeoJsonFilterMode,
  type GeoJsonImportSummary,
} from "@/lib/api/geojson-imports";
import { cn } from "@/lib/utils";
import type { SchemaField } from "@/types/api/schema";
import type { GeoJsonGeometry } from "@/types/gis.types";
import type { ImportColumnSuggestion } from "@/types/api/import";
import type { FieldTypeMeta } from "@/types/api/metadata";
import { useMessage } from "@/providers/message-provider";

const GEOJSON_ACCEPT = ".geojson,.json,application/geo+json,application/json";
const LOCAL_PARSE_LIMIT = 25 * 1024 * 1024;
const HISTORY_LIMIT = 20;
const COMMON_OSM_KEYS = [
  "name",
  "name:vi",
  "official_name",
  "highway",
  "waterway",
  "surface",
  "lanes",
  "bridge",
  "oneway",
  "class",
];

type Step = "upload" | "preview" | "filter" | "execute" | "done" | "history";
type FilterChoice = "none" | "current_ward" | "polygon";

interface GeoJsonImportDialogProps {
  layerId: string;
  layerName: string;
  fields: SchemaField[];
  fieldTypes: FieldTypeMeta[];
  onClose: () => void;
  onSuccess: () => void;
}

interface LocalFileInfo {
  featureCount?: number;
  geometryTypes: string[];
  propertyKeys: string[];
  warning?: string;
}

interface MappingRow {
  sourceKey: string;
  fieldCode: string;
}

interface HistoryItem {
  id: string;
  time: string;
  fileName: string;
  filterLabel: string;
  inserted: number;
  rejected: number;
  status: "Success" | "Failed";
  durationMs: number;
}

interface Notice {
  kind: "success" | "error" | "info";
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function aliasesForField(fieldCode: string): string[] {
  const aliases: Record<string, string[]> = {
    ten: ["name", "name:vi", "official_name"],
    loai_duong: ["highway", "road", "class"],
    mat_duong: ["surface"],
    so_lan: ["lanes"],
    cau: ["bridge"],
    mot_chieu: ["oneway"],
    loai_song: ["waterway"],
  };
  return aliases[fieldCode] ?? [];
}

function isLineField(field: Pick<SchemaField, "fieldType">): boolean {
  return field.fieldType === "line" || field.fieldType === "linestring";
}

function isPolygonField(field: Pick<SchemaField, "fieldType">): boolean {
  return field.fieldType === "area_polygon";
}

function isEditableGeometryField(field: Pick<SchemaField, "fieldType">): boolean {
  return isLineField(field) || isPolygonField(field);
}

function isLineGeometryType(type: string): boolean {
  return type === "LineString" || type === "MultiLineString";
}

function isPolygonGeometryType(type: string): boolean {
  return type === "Polygon" || type === "MultiPolygon";
}

function fieldMatchesGeometryTypes(
  field: Pick<SchemaField, "fieldType">,
  geometryTypes: string[],
): boolean {
  if (isLineField(field)) return geometryTypes.some(isLineGeometryType);
  if (isPolygonField(field)) return geometryTypes.some(isPolygonGeometryType);
  return false;
}

function buildAutoMappingRows(
  propertyKeys: string[],
  fields: SchemaField[],
): MappingRow[] {
  const normalizedSource = new Map(
    propertyKeys.map((key) => [normalizeKey(key), key]),
  );

  return fields.flatMap((field) => {
    const candidates = [
      field.code,
      field.label,
      ...(isEditableGeometryField(field) ? ["geometry", "__geometry__"] : []),
      ...aliasesForField(field.code),
    ];
    for (const candidate of candidates) {
      const exact = propertyKeys.find((key) => key === candidate);
      if (exact) return [{ sourceKey: exact, fieldCode: field.code }];
      const normalized = normalizedSource.get(normalizeKey(candidate));
      if (normalized) return [{ sourceKey: normalized, fieldCode: field.code }];
    }
    return [];
  });
}

function withGeometryMappingRows(
  rows: MappingRow[],
  fields: SchemaField[],
  geometryTypes: string[],
): MappingRow[] {
  if (geometryTypes.length === 0) return rows;
  const mappedFields = new Set(rows.map((row) => row.fieldCode).filter(Boolean));
  const additions = fields
    .filter(
      (field) =>
        fieldMatchesGeometryTypes(field, geometryTypes) &&
        !mappedFields.has(field.code),
    )
    .map((field) => ({ sourceKey: "geometry", fieldCode: field.code }));
  return additions.length > 0 ? [...rows, ...additions] : rows;
}

function mappingRowsToPayload(rows: MappingRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.sourceKey && row.fieldCode) acc[row.fieldCode] = row.sourceKey;
    return acc;
  }, {});
}

function areaPolygonToGeoJson(value: AreaPolygonValue): GeoJsonGeometry {
  const ring = value.coordinates.map((point) => [point.lng, point.lat]);
  const first = ring[0];
  if (first) ring.push(first);
  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

function isBoundaryGeometry(value: unknown): value is GeoJsonGeometry {
  if (typeof value !== "object" || value === null) return false;
  const geometry = value as GeoJsonGeometry;
  return (
    (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
    Array.isArray(geometry.coordinates)
  );
}

function extractBoundaryGeometry(value: unknown): GeoJsonGeometry | null {
  if (isBoundaryGeometry(value)) return value;
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as {
    type?: string;
    geometry?: unknown;
    features?: Array<{ geometry?: unknown }>;
  };
  if (candidate.type === "Feature" && isBoundaryGeometry(candidate.geometry)) {
    return candidate.geometry;
  }
  if (candidate.type === "FeatureCollection") {
    const feature = candidate.features?.find((item) =>
      isBoundaryGeometry(item.geometry),
    );
    return feature?.geometry && isBoundaryGeometry(feature.geometry)
      ? feature.geometry
      : null;
  }
  return null;
}

function buildHistoryKey(layerId: string) {
  return `onegis-geojson-import-history:${layerId}`;
}

function loadHistory(layerId: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(buildHistoryKey(layerId));
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(layerId: string, history: HistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    buildHistoryKey(layerId),
    JSON.stringify(history.slice(0, HISTORY_LIMIT)),
  );
}

async function inspectLocalFile(file: File): Promise<LocalFileInfo> {
  if (file.size > LOCAL_PARSE_LIMIT) {
    return {
      geometryTypes: [],
      propertyKeys: COMMON_OSM_KEYS,
      warning:
        "Tệp lớn nên trình duyệt không đọc toàn bộ. Số đối tượng và hình học sẽ lấy từ bản xem trước của máy chủ.",
    };
  }

  const parsed = JSON.parse(await file.text()) as {
    type?: string;
    features?: Array<{
      properties?: Record<string, unknown> | null;
      geometry?: { type?: string } | null;
    }>;
  };
  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("GeoJSON phải là FeatureCollection có mảng features");
  }

  const geometryTypes = new Set<string>();
  const propertyKeys = new Set<string>();
  for (const feature of parsed.features) {
    if (feature.geometry?.type) geometryTypes.add(feature.geometry.type);
    if (
      feature.geometry?.type &&
      (isLineGeometryType(feature.geometry.type) ||
        isPolygonGeometryType(feature.geometry.type))
    ) {
      propertyKeys.add("geometry");
    }
    for (const key of Object.keys(feature.properties ?? {})) {
      propertyKeys.add(key);
    }
  }

  return {
    featureCount: parsed.features.length,
    geometryTypes: [...geometryTypes],
    propertyKeys: [...propertyKeys],
  };
}

function getFilterLabel(choice: FilterChoice): string {
  if (choice === "current_ward") return wardConfig.locationLabel;
  if (choice === "polygon") return "Polygon tự nhập";
  return "Không filter";
}

function getFilterMode(choice: FilterChoice): GeoJsonFilterMode {
  return choice === "current_ward" ? "current_ward" : "none";
}

export function GeoJsonImportDialog({
  layerId,
  layerName,
  fields,
  fieldTypes,
  onClose,
  onSuccess,
}: GeoJsonImportDialogProps) {
  const message = useMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boundaryInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [localInfo, setLocalInfo] = useState<LocalFileInfo | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [preview, setPreview] = useState<GeoJsonImportSummary | null>(null);
  const [result, setResult] = useState<GeoJsonImportSummary | null>(null);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [newFieldDrafts, setNewFieldDrafts] = useState<ImportNewFieldDraft[]>(
    [],
  );
  const [newFieldSuggestions, setNewFieldSuggestions] = useState<
    ImportColumnSuggestion[]
  >([]);
  const [filterChoice, setFilterChoice] = useState<FilterChoice>("current_ward");
  const [filterBoundary, setFilterBoundary] = useState<GeoJsonGeometry | null>(
    null,
  );
  const [polygonPickerOpen, setPolygonPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistory(layerId),
  );
  const [durationMs, setDurationMs] = useState(0);

  const importableFields = useMemo(
    () => fields.filter((field) => field.fieldType !== "image" && field.fieldType !== "file"),
    [fields],
  );
  const propertyKeys = useMemo(() => {
    const fileGeometryTypes = [
      ...(localInfo?.geometryTypes ?? []),
      ...Object.keys(preview?.geometryTypes ?? {}),
    ];
    const hasEditableGeometry = fileGeometryTypes.some(
      (type) => isLineGeometryType(type) || isPolygonGeometryType(type),
    );
    const keys = new Set([
      ...(localInfo?.propertyKeys ?? []),
      ...mappingRows.map((row) => row.sourceKey).filter(Boolean),
      ...COMMON_OSM_KEYS,
      ...(hasEditableGeometry ? ["geometry"] : []),
    ]);
    return [...keys];
  }, [localInfo, mappingRows, preview]);
  const geometryTypes = useMemo(() => {
    const keys = new Set([
      ...(localInfo?.geometryTypes ?? []),
      ...Object.keys(preview?.geometryTypes ?? {}),
    ]);
    return [...keys];
  }, [localInfo, preview]);

  function updateHistory(item: HistoryItem) {
    const next = [item, ...history].slice(0, HISTORY_LIMIT);
    setHistory(next);
    saveHistory(layerId, next);
  }

  function resetAll() {
    setStep("upload");
    setFile(null);
    setLocalInfo(null);
    setImportId(null);
    setUploadedName("");
    setPreview(null);
    setResult(null);
    setMappingRows([]);
    setNewFieldDrafts([]);
    setNewFieldSuggestions([]);
    setFilterChoice("current_ward");
    setFilterBoundary(null);
    setNotice(null);
    setDurationMs(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (boundaryInputRef.current) boundaryInputRef.current.value = "";
  }

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setLocalInfo(null);
    setImportId(null);
    setUploadedName("");
    setPreview(null);
    setResult(null);
    setNotice(null);
    setMappingRows([]);
    setNewFieldDrafts([]);
    setNewFieldSuggestions([]);
    if (!nextFile) return;

    try {
      const info = await inspectLocalFile(nextFile);
      setLocalInfo(info);
      const rows = withGeometryMappingRows(
        buildAutoMappingRows(info.propertyKeys, importableFields),
        importableFields,
        info.geometryTypes,
      );
      setMappingRows(rows);
      if (info.warning) setNotice({ kind: "info", message: info.warning });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không đọc được thông tin GeoJSON",
      });
    }
  }

  async function handleUpload() {
    if (!file) return;
    setIsLoading(true);
    setNotice(null);
    try {
      const uploaded = await uploadGeoJsonImportFile(layerId, file);
      setImportId(uploaded.importId);
      setUploadedName(uploaded.fileName);
      setNewFieldSuggestions(uploaded.columnSuggestions ?? []);
      setNewFieldDrafts((previous) =>
        buildNewFieldDrafts(
          uploaded.unknownColumns ?? [],
          uploaded.columnSuggestions ?? [],
          previous,
        ),
      );
      setNotice({ kind: "success", message: "Tải GeoJSON lên thành công." });
      await runPreview(uploaded.importId, "none", null, mappingRows);
      setStep("preview");
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Tải lên thất bại",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function runPreview(
    nextImportId = importId,
    nextFilterMode: GeoJsonFilterMode = getFilterMode(filterChoice),
    nextBoundary: GeoJsonGeometry | null =
      filterChoice === "polygon" ? filterBoundary : null,
    nextMappingRows = mappingRows,
  ) {
    if (!nextImportId) return;
    setIsLoading(true);
    setNotice(null);
    try {
      const data = await previewGeoJsonImport(layerId, {
        importId: nextImportId,
        filterMode: nextFilterMode,
        filterBoundary: nextBoundary ?? undefined,
        propertyMapping: mappingRowsToPayload(nextMappingRows),
        batchSize: 1000,
        sampleSize: 20,
      });
      setPreview(data);
      const previewGeometryTypes = Object.keys(data.geometryTypes ?? {});
      setMappingRows((currentRows) =>
        withGeometryMappingRows(
          currentRows,
          importableFields,
          previewGeometryTypes,
        ),
      );
      setNewFieldSuggestions(data.columnSuggestions ?? []);
      setNewFieldDrafts((previous) =>
        buildNewFieldDrafts(
          data.unknownColumns ?? [],
          data.columnSuggestions ?? [],
          previous,
        ),
      );
      setNotice({ kind: "success", message: "Bản xem trước GeoJSON đã cập nhật." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Xem trước thất bại",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBoundaryFile(fileToRead: File | null) {
    if (!fileToRead) return;
    try {
      const parsed = JSON.parse(await fileToRead.text()) as unknown;
      const geometry = extractBoundaryGeometry(parsed);
      if (!geometry) {
        throw new Error("Tệp ranh giới phải là GeoJSON Polygon/MultiPolygon");
      }
      setFilterBoundary(geometry);
      setFilterChoice("polygon");
      setNotice({ kind: "success", message: "Đã nhận bộ lọc vùng." });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không đọc được polygon",
      });
    }
  }

  async function handleExecute() {
    if (!importId || !preview) return;
    const configError = validateNewFieldDrafts(newFieldDrafts, fieldTypes);
    if (configError) {
      setNotice({ kind: "error", message: configError });
      setStep("preview");
      return;
    }

    const newFields = selectedNewFields(newFieldDrafts);
    const confirmed = await message.confirm({
      title: "Xác nhận import GeoJSON",
      description: `Nhập ${formatNumber(preview.accepted)} đối tượng vào lớp ${layerName}?`,
      confirmLabel: "Bắt đầu import",
    });
    if (!confirmed) return;

    setIsLoading(true);
    setNotice({ kind: "info", message: "Đang nhập GeoJSON..." });
    const startedAt = Date.now();
    try {
      const data = await executeGeoJsonImport(layerId, {
        importId,
        filterMode: getFilterMode(filterChoice),
        filterBoundary:
          filterChoice === "polygon" ? filterBoundary ?? undefined : undefined,
        propertyMapping: mappingRowsToPayload([
          ...mappingRows,
          ...newFieldMappingRows(newFieldDrafts),
        ]),
        newFields,
        batchSize: 1000,
      });
      const elapsed = Date.now() - startedAt;
      setDurationMs(elapsed);
      setResult(data);
      updateHistory({
        id: `${Date.now()}`,
        time: new Date().toISOString(),
        fileName: uploadedName || file?.name || importId,
        filterLabel: getFilterLabel(filterChoice),
        inserted: data.inserted ?? data.accepted,
        rejected: data.rejected,
        status: "Success",
        durationMs: elapsed,
      });
      setStep("done");
      setNotice({ kind: "success", message: "Nhập GeoJSON thành công." });
      onSuccess();
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      updateHistory({
        id: `${Date.now()}`,
        time: new Date().toISOString(),
        fileName: uploadedName || file?.name || importId,
        filterLabel: getFilterLabel(filterChoice),
        inserted: 0,
        rejected: preview.rejected,
        status: "Failed",
        durationMs: elapsed,
      });
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Nhập dữ liệu thất bại",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const activeStepIndex = ["upload", "preview", "filter", "execute"].indexOf(
    step,
  );

  return (
    <>
      <Modal
        title={`Nhập GeoJSON — ${layerName}`}
        size="xl"
        onClose={onClose}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            {["Tải lên", "Xem trước", "Bộ lọc", "Thực hiện"].map((label, index) => (
              <div
                key={label}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold",
                  index === activeStepIndex
                    ? "border-primary bg-primary text-white"
                    : index < activeStepIndex
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-border bg-slate-50 text-muted",
                )}
              >
                <span>{index + 1}</span>
                <span>{label}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStep("history")}
              className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50"
            >
              Import History
            </button>
          </div>

          {notice && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                notice.kind === "success" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                notice.kind === "error" &&
                  "border-red-200 bg-red-50 text-red-700",
                notice.kind === "info" &&
                  "border-sky-200 bg-sky-50 text-sky-800",
              )}
            >
              {notice.message}
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
                  accept={GEOJSON_ACCEPT}
                  className="hidden"
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                />

                {file ? (
                  <div className="text-center">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatBytes(file.size)}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-sm font-medium text-primary hover:underline"
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
                      Chọn file GeoJSON (.geojson hoặc .json)
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Chỉ nhận FeatureCollection.
                    </p>
                  </button>
                )}
              </div>

              {file && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Dung lượng"
                    value={formatBytes(file.size)}
                  />
                  <Metric
                    label="Số đối tượng"
                    value={
                      localInfo?.featureCount !== undefined
                        ? formatNumber(localInfo.featureCount)
                        : "Đọc ở backend"
                    }
                  />
                  <Metric
                    label="Loại hình học"
                    value={geometryTypes.length ? geometryTypes.join(", ") : "Chưa rõ"}
                  />
                </div>
              )}

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <p className="font-semibold">Nhập đường giao thông OSM</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Tạo layer `duong_giao_thong` với geometry_kind `multilinestring`.</li>
                  <li>Tải `osm-roads-vietnam.geojson`.</li>
                  <li>Chọn Boundary hiện tại, preview, rồi import.</li>
                  <li>Mở bản đồ, dữ liệu sẽ hiển thị qua API GeoJSON của layer.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!file || isLoading}
                  onClick={handleUpload}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Đang tải lên..." : "Tải lên và xem trước"}
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

          {step === "preview" && (
            <section className="space-y-5">
              <SummaryGrid preview={preview} />
              <ImportNewFieldsPanel
                unknownColumns={newFieldDrafts.map((field) => field.sourceColumn)}
                suggestions={newFieldSuggestions}
                fieldTypes={fieldTypes}
                sourceLayerId={layerId}
                value={newFieldDrafts}
                onChange={setNewFieldDrafts}
              />
              <PropertyMappingTable
                fields={importableFields}
                propertyKeys={propertyKeys}
                rows={mappingRows}
                onRowsChange={setMappingRows}
                onAuto={() =>
                  setMappingRows(
                    withGeometryMappingRows(
                      buildAutoMappingRows(propertyKeys, importableFields),
                      importableFields,
                      geometryTypes,
                    ),
                  )
                }
              />
              <PreviewSample preview={preview} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!importId || isLoading}
                  onClick={() => runPreview()}
                  className="rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-blue-50 disabled:opacity-50"
                >
                  {isLoading ? "Đang xem trước..." : "Xem trước lại"}
                </button>
                <button
                  type="button"
                  disabled={!preview}
                  onClick={() => setStep("filter")}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  Tiếp tục chọn bộ lọc
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Tải file khác
                </button>
              </div>
            </section>
          )}

          {step === "filter" && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["none", "Không filter"],
                  ["current_ward", `Boundary hiện tại (${wardConfig.locationLabel})`],
                  ["polygon", "Polygon tự nhập"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm",
                      filterChoice === value
                        ? "border-primary bg-blue-50 text-foreground"
                        : "border-border text-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="geojson-filter"
                      value={value}
                      checked={filterChoice === value}
                      onChange={() => setFilterChoice(value as FilterChoice)}
                      className="mt-1"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {filterChoice === "polygon" && (
                <div className="space-y-3 rounded-lg border border-border bg-slate-50 px-4 py-4">
                  <input
                    ref={boundaryInputRef}
                    type="file"
                    accept={GEOJSON_ACCEPT}
                    className="hidden"
                    onChange={(event) =>
                      handleBoundaryFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => boundaryInputRef.current?.click()}
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50"
                    >
                      Upload GeoJSON Polygon
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolygonPickerOpen(true)}
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50"
                    >
                      Vẽ polygon trên map
                    </button>
                    <button
                      type="button"
                      disabled={!filterBoundary}
                      onClick={() => setFilterBoundary(null)}
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50 disabled:opacity-40"
                    >
                      Xóa polygon
                    </button>
                  </div>
                  <p className="text-sm text-muted">
                    {filterBoundary
                      ? `Đã có ${filterBoundary.type} filter.`
                      : "Chưa có polygon filter."}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={
                    isLoading || (filterChoice === "polygon" && !filterBoundary)
                  }
                  onClick={async () => {
                    await runPreview();
                    setStep("execute");
                  }}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Đang lọc..." : "Xem trước kết quả lọc"}
                </button>
              </div>
            </section>
          )}

          {step === "execute" && preview && (
            <section className="space-y-5">
              <div className="rounded-xl border border-border bg-slate-50 px-4 py-4">
                <p className="text-sm text-muted">Bạn sắp import</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatNumber(preview.accepted)} đối tượng
                </p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    Layer: <strong>{layerName}</strong>
                  </p>
                  <p>
                    Boundary: <strong>{getFilterLabel(filterChoice)}</strong>
                  </p>
                  <p>
                    Rejected: <strong>{formatNumber(preview.rejected)}</strong>
                  </p>
                  <p>
                    File: <strong>{uploadedName || file?.name}</strong>
                  </p>
                </div>
              </div>

              {isLoading && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-600" />
                  </div>
                  Backend hiện chạy request đồng bộ nên UI chưa biết phần trăm thật.
                  Kiến trúc tiếp theo nên tách job import và dùng SSE hoặc polling
                  `/jobs/:id` để trả `processed / total`.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStep("filter")}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading || preview.accepted === 0}
                  onClick={handleExecute}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Đang nhập..." : "Nhập dữ liệu"}
                </button>
              </div>
            </section>
          )}

          {step === "done" && result && (
            <section className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
                <p className="font-semibold">Nhập dữ liệu thành công</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>
                    Inserted: <strong>{formatNumber(result.inserted)}</strong>
                  </p>
                  <p>
                    Rejected: <strong>{formatNumber(result.rejected)}</strong>
                  </p>
                  <p>
                    Duration: <strong>{formatDuration(durationMs)}</strong>
                  </p>
                </div>
              </div>
              <PreviewSample preview={result} />
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
                  onClick={resetAll}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
                >
                  Import file khác
                </button>
              </div>
            </section>
          )}

          {step === "history" && (
            <HistoryTable
              history={history}
              onBack={() => setStep(importId ? "preview" : "upload")}
            />
          )}
        </div>
      </Modal>

      {polygonPickerOpen && (
        <AreaPolygonMapPicker
          open={polygonPickerOpen}
          onClose={() => setPolygonPickerOpen(false)}
          onConfirm={(value) => {
            setFilterBoundary(areaPolygonToGeoJson(value));
            setFilterChoice("polygon");
            setPolygonPickerOpen(false);
            setNotice({ kind: "success", message: "Đã vẽ bộ lọc vùng." });
          }}
        />
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function SummaryGrid({ preview }: { preview: GeoJsonImportSummary | null }) {
  const polygonStats = preview?.polygonStats;
  const showPolygonStats = Boolean(polygonStats && polygonStats.total > 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Tổng số" value={formatNumber(preview?.totalFeatures)} />
        <Metric label="Được chấp nhận" value={formatNumber(preview?.accepted)} />
        <Metric label="Bị từ chối" value={formatNumber(preview?.rejected)} />
        <Metric
          label="Loại hình học"
          value={Object.keys(preview?.geometryTypes ?? {}).join(", ") || "—"}
        />
      </div>

      {showPolygonStats && polygonStats && (
        <div className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:grid-cols-4">
          <Metric label="Số vùng" value={formatNumber(polygonStats.total)} />
          <Metric
            label="Vùng hợp lệ"
            value={formatNumber(polygonStats.valid)}
          />
          <Metric
            label="Tự đóng vòng"
            value={formatNumber(polygonStats.autoClosed)}
          />
          <Metric label="Vùng bị lỗi" value={formatNumber(polygonStats.invalid)} />
        </div>
      )}
    </div>
  );
}

function PropertyMappingTable({
  fields,
  propertyKeys,
  rows,
  onRowsChange,
  onAuto,
}: {
  fields: SchemaField[];
  propertyKeys: string[];
  rows: MappingRow[];
  onRowsChange: (rows: MappingRow[]) => void;
  onAuto: () => void;
}) {
  function updateRow(index: number, patch: Partial<MappingRow>) {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Property Mapping
          </h3>
          <p className="text-sm text-muted">
            Mapping gửi lên backend theo dạng Layer field → GeoJSON property.
          </p>
        </div>
        <button
          type="button"
          onClick={onAuto}
          className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-blue-50"
        >
          Auto Mapping
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">GeoJSON</th>
              <th className="px-3 py-2">Lớp dữ liệu</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {rows.map((row, index) => (
              <tr key={`${index}-${row.sourceKey}-${row.fieldCode}`}>
                <td className="px-3 py-2">
                  <input
                    list="geojson-property-keys"
                    value={row.sourceKey}
                    onChange={(event) =>
                      updateRow(index, { sourceKey: event.target.value })
                    }
                    className="ioc-select h-9"
                    placeholder="name"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.fieldCode}
                    onChange={(event) =>
                      updateRow(index, { fieldCode: event.target.value })
                    }
                    className="h-9 w-full rounded-md border border-border px-2 text-sm"
                  >
                    <option value="">Không liên kết</option>
                    {fields.map((field) => (
                      <option key={field.code} value={field.code}>
                        {field.code} — {field.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRowsChange(rows.filter((_, i) => i !== index))}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-muted">
                  Chưa có mapping thủ công. Backend vẫn tự map bằng alias khi
                  không gửi override.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <datalist id="geojson-property-keys">
        {propertyKeys.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => onRowsChange([...rows, { sourceKey: "", fieldCode: "" }])}
        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50"
      >
        Thêm dòng mapping
      </button>
    </div>
  );
}

function PreviewSample({ preview }: { preview: GeoJsonImportSummary | null }) {
  if (!preview) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Bản ghi mẫu</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">STT</th>
              <th className="px-3 py-2">Hình học</th>
              <th className="px-3 py-2">Thuộc tính</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {preview.sample.map((item) => (
              <tr key={item.rowNumber}>
                <td className="px-3 py-2 font-medium">{item.rowNumber}</td>
                <td className="px-3 py-2">{item.geometryType}</td>
                <td className="px-3 py-2">
                  <code className="block max-w-xl truncate rounded bg-slate-100 px-2 py-1 text-xs">
                    {JSON.stringify(item.properties)}
                  </code>
                </td>
              </tr>
            ))}
            {preview.sample.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-muted">
                  Không có sample hợp lệ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(preview.warnings?.length ?? 0) > 0 && (
        <details className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <summary className="cursor-pointer font-medium">
            {preview.warnings?.length} cảnh báo đầu tiên
          </summary>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {preview.warnings?.map((warning) => (
              <li key={`${warning.rowNumber}-${warning.message}`}>
                Dòng {warning.rowNumber}: {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview.errors.length > 0 && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <summary className="cursor-pointer font-medium">
            {preview.errors.length} lỗi đầu tiên
          </summary>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {preview.errors.map((error) => (
              <li key={`${error.rowNumber}-${error.reason}`}>
                Dòng {error.rowNumber}: {error.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function HistoryTable({
  history,
  onBack,
}: {
  history: HistoryItem[];
  onBack: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          Import History
        </h3>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50"
        >
          Quay lại
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Thời gian</th>
              <th className="px-3 py-2">Tệp</th>
              <th className="px-3 py-2">Bộ lọc</th>
              <th className="px-3 py-2">Đã thêm</th>
              <th className="px-3 py-2">Bị từ chối</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  {new Date(item.time).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2">{item.fileName}</td>
                <td className="px-3 py-2">{item.filterLabel}</td>
                <td className="px-3 py-2">{formatNumber(item.inserted)}</td>
                <td className="px-3 py-2">{formatNumber(item.rejected)}</td>
                <td className="px-3 py-2">
                  {item.status === "Success" ? "Thành công" : "Thất bại"}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Chưa có lịch sử import GeoJSON trên trình duyệt này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
