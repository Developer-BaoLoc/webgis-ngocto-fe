import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { normalizeMultiCategoryDisplayText } from "@/lib/fields/multi-category";
import { extractStyleFromLayer } from "@/lib/layers/style";
import type { AttachmentRef } from "@/types/api/assets";
import type { PopupSummaryField } from "@/types/api/records";
import type { LayerStyle } from "@/types/api/admin";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const MAX_META_LINES = 3;
const RELATIONSHIP_TECHNICAL_KEYS = new Set([
  "id",
  "_id",
  "entity_id",
  "geometry",
  "geom",
  "created_at",
  "updated_at",
  "deleted_at",
  "location_status",
]);

const POPUP_FONT_SIZE: Record<string, string> = {
  small: "12px",
  medium: "14px",
  large: "18px",
};

type PopupHeaderTone = "alert" | "polygon" | "line" | "point" | "default";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: string, max = 72): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function getPopupFieldKey(field: PopupSummaryField): string {
  return [
    field.code,
    field.label,
    field.fieldType ?? "",
    field.displayValue.replace(/\s+/g, " ").trim(),
  ].join("::");
}

function isImageAttachment(item: AttachmentRef): boolean {
  if (item.mimeType?.startsWith("image/")) return true;
  return IMAGE_EXT.test(item.originalName ?? "");
}

/** GeoJSON properties có thể stringify popupSummary */
export function parsePopupSummary(
  properties: Record<string, unknown>,
): PopupSummaryField[] {
  const raw = properties.popupSummary;
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          "label" in item &&
          "displayValue" in item,
      )
      .map((item) => {
        const field = item as PopupSummaryField;
        return {
          code: String(field.code ?? ""),
          label: String(field.label),
          displayValue: String(field.displayValue),
          fieldType: field.fieldType ? String(field.fieldType) : undefined,
          value: field.value,
          dataSchema:
            field.dataSchema &&
            typeof field.dataSchema === "object" &&
            !Array.isArray(field.dataSchema)
              ? field.dataSchema
              : undefined,
          popupStyle: field.popupStyle,
        };
      });
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsePopupSummary({ popupSummary: parsed });
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function extractRecordIds(properties: Record<string, unknown>): {
  recordId?: string;
  layerId?: string;
} {
  const recordId =
    properties._recordId ?? properties.recordId ?? properties.id;
  const layerId = properties._layerId ?? properties.layerId;

  return {
    recordId: recordId != null ? String(recordId) : undefined,
    layerId: layerId != null ? String(layerId) : undefined,
  };
}

function getFieldAttachments(
  properties: Record<string, unknown>,
  field: PopupSummaryField,
): AttachmentRef[] {
  let raw = field.value ?? properties[field.code];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      // keep string
    }
  }
  return normalizeAttachmentList(raw);
}

export function extractPopupImages(
  properties: Record<string, unknown>,
  popupSummary: PopupSummaryField[],
): AttachmentRef[] {
  const images: AttachmentRef[] = [];
  const seen = new Set<string>();

  function addItems(items: AttachmentRef[]) {
    for (const item of items) {
      if (!isImageAttachment(item) || seen.has(item.attachmentId)) continue;
      seen.add(item.attachmentId);
      images.push(item);
    }
  }

  for (const field of popupSummary) {
    if (field.fieldType === "image") {
      addItems(getFieldAttachments(properties, field));
    }
  }

  if (images.length === 0) {
    for (const field of popupSummary) {
      addItems(getFieldAttachments(properties, field));
    }
  }

  return images.filter((item) => Boolean(item.url));
}

function isImageField(
  properties: Record<string, unknown>,
  field: PopupSummaryField,
): boolean {
  if (field.fieldType === "image") return true;
  const attachments = getFieldAttachments(properties, field);
  return attachments.length > 0 && attachments.every(isImageAttachment);
}

function popupStyleToCss(style?: PopupSummaryField["popupStyle"]): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.bold) parts.push("font-weight:700");
  if (style.fontSize) {
    parts.push(`font-size:${POPUP_FONT_SIZE[style.fontSize] ?? "14px"}`);
  }
  if (style.color && /^#[0-9A-Fa-f]{3,8}$/.test(style.color)) {
    parts.push(`color:${style.color}`);
  }
  return parts.join(";");
}

function formatPopupValueHtml(field: PopupSummaryField): string {
  let display = field.displayValue;
  if (field.fieldType === "multi_category") {
    display = normalizeMultiCategoryDisplayText(display);
  }

  const value =
    (field.fieldType === "multi_category" ||
      field.fieldType === "relationship") &&
    display.includes("\n")
      ? display
          .split("\n")
          .map((line) => escapeHtml(truncate(line.trim())))
          .join("<br>")
      : escapeHtml(truncate(display));

  const css = popupStyleToCss(field.popupStyle);
  if (!css) return value;
  return `<span style="${css}">${value}</span>`;
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function humanizeFieldCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\p{Ll}/u, (char) => char.toUpperCase());
}

function formatRelationshipCell(value: unknown): string {
  if (!isPresent(value)) return "—";
  if (typeof value === "number") return value.toLocaleString("vi-VN");
  if (typeof value === "object") return escapeHtml(JSON.stringify(value));
  return escapeHtml(String(value));
}

function relationshipCellClass(value: unknown): string {
  if (typeof value === "number") return " is-number";
  const text = String(value ?? "");
  if (/^\s*-?\d+([.,]\d+)?\s*$/.test(text)) return " is-number";
  if (/\b\d+\s*sao\b/i.test(text)) return " is-badge";
  return "";
}

function getRelationshipRows(field: PopupSummaryField): Array<{
  id?: string;
  label?: string;
  properties: Record<string, unknown>;
}> {
  if (!Array.isArray(field.value)) return [];
  return field.value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as {
        id?: unknown;
        label?: unknown;
        properties?: Record<string, unknown>;
      };
      return {
        id: row.id ? String(row.id) : undefined,
        label: row.label ? String(row.label) : undefined,
        properties:
          row.properties && typeof row.properties === "object"
            ? row.properties
            : {},
      };
    });
}

function getRelationshipPopupFields(
  field: PopupSummaryField,
  rows: Array<{ label?: string; properties: Record<string, unknown> }>,
): string[] {
  const configured = field.dataSchema?.popupFields;
  if (Array.isArray(configured)) {
    return configured.map(String).filter(Boolean).slice(0, 9);
  }

  const displayField =
    typeof field.dataSchema?.targetDisplayField === "string"
      ? field.dataSchema.targetDisplayField
      : null;
  const foreignKey =
    typeof field.dataSchema?.foreignKey === "string"
      ? field.dataSchema.foreignKey
      : null;
  const keys = new Set<string>();
  if (displayField) keys.add(displayField);

  for (const row of rows) {
    for (const [key, value] of Object.entries(row.properties)) {
      if (!isPresent(value)) continue;
      if (key === foreignKey || RELATIONSHIP_TECHNICAL_KEYS.has(key)) continue;
      keys.add(key);
      if (keys.size >= 5) break;
    }
    if (keys.size >= 5) break;
  }

  return [...keys];
}

function buildRelationshipTableHtml(field: PopupSummaryField): string {
  const modeClass =
    field.dataSchema?.popupDisplayMode === "cards" ? " is-card-mode" : "";
  const rows = getRelationshipRows(field);
  if (rows.length === 0) {
    return `<div class="map-popup-relationship${modeClass}"><div class="map-popup-rel-title">${escapeHtml(field.label)}</div><p class="map-popup-rel-empty">Chưa có dữ liệu liên kết.</p></div>`;
  }

  const fields = getRelationshipPopupFields(field, rows);
  if (fields.length === 0) {
    return `<div class="map-popup-relationship${modeClass}"><div class="map-popup-rel-title">${escapeHtml(field.label)}</div>${rows
      .map(
        (row) =>
          `<div class="map-popup-rel-card"><strong>${escapeHtml(row.label ?? row.id ?? "Bản ghi liên kết")}</strong></div>`,
      )
      .join("")}</div>`;
  }

  const headers = fields
    .map((code) => `<th>${escapeHtml(humanizeFieldCode(code))}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${fields
          .map((code) => {
            const value =
              row.properties[code] ??
              (code === field.dataSchema?.targetDisplayField ? row.label : null);
            const cellClass = relationshipCellClass(value);
            return `<td class="${cellClass.trim()}">${formatRelationshipCell(value)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const cards = rows
    .map((row) => {
      const titleCode = fields[0];
      const title =
        (titleCode ? row.properties[titleCode] : null) ?? row.label ?? row.id;
      const details = fields
        .slice(1)
        .map((code) => {
          const value = row.properties[code];
          if (!isPresent(value)) return "";
          return `<div><span>${escapeHtml(humanizeFieldCode(code))}:</span> <strong>${formatRelationshipCell(value)}</strong></div>`;
        })
        .join("");
      return `<article class="map-popup-rel-card">
        <strong>${formatRelationshipCell(title)}</strong>
        ${details ? `<div class="map-popup-rel-card-grid">${details}</div>` : ""}
      </article>`;
    })
    .join("");

  return `<div class="map-popup-relationship${modeClass}">
    <div class="map-popup-rel-title">${escapeHtml(field.label)} <span>${rows.length}</span></div>
    <div class="map-popup-rel-table-wrap">
      <table class="map-popup-rel-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="map-popup-rel-cards">${cards}</div>
  </div>`;
}

function formatPopupFieldHtml(field: PopupSummaryField): string {
  if (field.fieldType === "relationship" && Array.isArray(field.value)) {
    return buildRelationshipTableHtml(field);
  }

  return `<p class="map-popup-meta-line">${formatPopupValueHtml(field)}</p>`;
}

function getLayerIconUrl(style: LayerStyle): string | null {
  if (style.iconUrl) return resolvePublicAssetUrl(style.iconUrl);
  const icon = style.icon;
  if (icon && typeof icon === "object" && icon.url) {
    return resolvePublicAssetUrl(icon.url);
  }
  return null;
}

function getPopupHeaderTone(options: {
  layerName: string;
  layerCode: string;
  layerRole?: string | null;
  geometryKind?: string | null;
}): PopupHeaderTone {
  const haystack = [
    options.layerName,
    options.layerCode,
    options.layerRole ?? "",
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/canh bao|alert|warning|su co|rui ro/.test(haystack)) return "alert";

  const geometry = String(options.geometryKind ?? "").toLowerCase();
  if (geometry === "polygon") return "polygon";
  if (geometry === "line" || geometry === "linestring") return "line";
  if (geometry === "point") return "point";
  return "default";
}

function buildPopupSubtitleHtml(
  fields: PopupSummaryField[],
  excludedKeys: Set<string>,
): { html: string; usedKeys: Set<string> } {
  const usedKeys = new Set<string>();
  const parts = fields
    .filter((field) => field.fieldType !== "relationship")
    .filter((field) => !excludedKeys.has(getPopupFieldKey(field)))
    .map((field) => {
      let display = field.displayValue;
      if (field.fieldType === "multi_category") {
        display = normalizeMultiCategoryDisplayText(display);
      }
      return {
        field,
        value: truncate(display.replace(/\s+/g, " ").trim(), 28),
      };
    })
    .filter((item) => Boolean(item.value))
    .slice(0, 3);

  for (const item of parts) {
    usedKeys.add(getPopupFieldKey(item.field));
  }

  if (parts.length === 0) return { html: "", usedKeys };
  return {
    html: `<p class="map-popup-subtitle">${parts.map((item) => escapeHtml(item.value)).join(" <span>•</span> ")}</p>`,
    usedKeys,
  };
}

function isPriorityMetaField(field: PopupSummaryField): boolean {
  const key = `${field.code} ${field.label}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /(dia chi|address|khu vuc|area|cap nhat|updated|ngay|date)/.test(key);
}

function getStatusBadgeField(
  fields: PopupSummaryField[],
): PopupSummaryField | null {
  return (
    fields.find((field) => {
      const key = `${field.code} ${field.label}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return /(trang thai|status|muc do|severity|canh bao|risk)/.test(key);
    }) ?? null
  );
}

function buildPopupHeaderMetaHtml(
  fields: PopupSummaryField[],
  excludedKeys: Set<string>,
): { html: string; usedKeys: Set<string> } {
  const usedKeys = new Set<string>();
  const parts = fields
    .filter((field) => field.fieldType !== "relationship")
    .filter((field) => !excludedKeys.has(getPopupFieldKey(field)))
    .filter(isPriorityMetaField)
    .map((field) => {
      const value =
        field.fieldType === "multi_category"
          ? normalizeMultiCategoryDisplayText(field.displayValue)
          : field.displayValue;
      return {
        field,
        value: truncate(value.replace(/\s+/g, " ").trim(), 32),
      };
    })
    .filter((item) => Boolean(item.value))
    .slice(0, 2);

  for (const item of parts) {
    usedKeys.add(getPopupFieldKey(item.field));
  }

  if (parts.length === 0) return { html: "", usedKeys };
  return {
    html: `<p class="map-popup-header-meta">${parts.map((item) => escapeHtml(item.value)).join(" <span>•</span> ")}</p>`,
    usedKeys,
  };
}

function buildPopupLayerMarkHtml(options: {
  layerName: string;
  layerColor?: string | null;
  geometryKind?: string | null;
  style?: LayerStyle | Record<string, unknown> | null;
}): string {
  const style = extractStyleFromLayer({
    geometryType: options.geometryKind ?? "point",
    style: options.style as LayerStyle | undefined,
  });
  const iconUrl = getLayerIconUrl(style);
  const fallbackMark = (() => {
    const geometry = String(options.geometryKind ?? "").toLowerCase();
    if (geometry === "polygon") {
      const fillColor = style.fillColor ?? options.layerColor ?? "#22c55e80";
      const strokeColor = style.strokeColor ?? "#15803d";
      return `<span class="map-popup-layer-mark-fallback map-popup-layer-mark-fallback--polygon" style="background:${escapeHtml(fillColor)};border-color:${escapeHtml(strokeColor)}"></span>`;
    }
    if (geometry === "line" || geometry === "linestring") {
      const lineColor = style.lineColor ?? options.layerColor ?? "#2563eb";
      return `<span class="map-popup-layer-mark-fallback map-popup-layer-mark-fallback--line"><span style="background:${escapeHtml(lineColor)}"></span></span>`;
    }
    return `<span class="map-popup-layer-mark-fallback map-popup-layer-mark-fallback--point" style="background:${escapeHtml(options.layerColor ?? "#64748b")}"></span>`;
  })();

  if (iconUrl) {
    return `<span class="map-popup-layer-mark map-popup-layer-mark--image">
      <img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" />
      ${fallbackMark}
    </span>`;
  }

  const geometry = String(options.geometryKind ?? "").toLowerCase();
  if (geometry === "polygon") {
    const fillColor = style.fillColor ?? options.layerColor ?? "#22c55e80";
    const strokeColor = style.strokeColor ?? "#15803d";
    return `<span class="map-popup-layer-mark map-popup-layer-mark--polygon" style="background:${escapeHtml(fillColor)};border-color:${escapeHtml(strokeColor)}"></span>`;
  }
  if (geometry === "line" || geometry === "linestring") {
    const lineColor = style.lineColor ?? options.layerColor ?? "#2563eb";
    return `<span class="map-popup-layer-mark map-popup-layer-mark--line"><span style="background:${escapeHtml(lineColor)}"></span></span>`;
  }

  return `<span class="map-popup-layer-mark map-popup-layer-mark--point" style="background:${escapeHtml(options.layerColor ?? "#64748b")}"></span>`;
}

function buildPopupHeaderHtml(options: {
  layerName: string;
  layerCode: string;
  layerColor?: string | null;
  layerRole?: string | null;
  geometryKind?: string | null;
  style?: LayerStyle | Record<string, unknown> | null;
  titleHtml: string;
  galleryHtml: string;
  subtitleHtml: string;
  headerMetaHtml: string;
  statusHtml: string;
  metaHtml: string;
  actionsHtml: string;
}): string {
  const tone = getPopupHeaderTone(options);
  const badgeText = tone === "alert" ? "CẢNH BÁO" : "LỚP DỮ LIỆU";
  const layerMark = buildPopupLayerMarkHtml(options);

  return `<header class="map-popup-header map-popup-header--${tone}">
    ${options.galleryHtml}
    <div class="map-popup-header-main">
      ${layerMark}
      <div class="map-popup-heading">
        <div class="map-popup-badge-row">
          <span class="map-popup-badge">${escapeHtml(options.layerName)}</span>
          ${options.statusHtml}
        </div>
        <h3 class="map-popup-title">${options.titleHtml}</h3>
        ${options.subtitleHtml}
        ${options.headerMetaHtml}
      </div>
    </div>
    ${options.metaHtml ? `<div class="map-popup-meta">${options.metaHtml}</div>` : ""}
    ${options.actionsHtml}
  </header>`;
}

function buildPopupGalleryHtml(images: AttachmentRef[]): string {
  if (images.length === 0) return "";

  const slides = images
    .map((item) => {
      const src = item.url ? resolvePublicAssetUrl(item.url) : "";
      if (!src) return "";
      return `<div class="map-popup-slide">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(item.originalName ?? "Ảnh")}" loading="lazy" />
      </div>`;
    })
    .join("");

  if (!slides) return "";

  const dots = images
    .map(
      (_, index) =>
        `<button type="button" class="map-popup-dot${index === 0 ? " is-active" : ""}" data-index="${index}" aria-label="Ảnh ${index + 1}"></button>`,
    )
    .join("");

  return `
    <div class="map-popup-gallery" data-popup-carousel>
      <div class="map-popup-track">${slides}</div>
      <button type="button" class="map-popup-carousel-btn map-popup-carousel-btn--prev" aria-label="Ảnh trước">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>
      </button>
      <button type="button" class="map-popup-carousel-btn map-popup-carousel-btn--next" aria-label="Ảnh sau">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
      </button>
      <div class="map-popup-dots">${dots}</div>
    </div>
  `;
}

export function buildFeaturePopupHtml(options: {
  layerName: string;
  layerCode: string;
  layerId: string;
  layerColor?: string | null;
  layerRole?: string | null;
  geometryKind?: string | null;
  style?: LayerStyle | Record<string, unknown> | null;
  recordId?: string;
  properties: Record<string, unknown>;
  destination?: { lat: number; lng: number };
}): string {
  const popupSummary = parsePopupSummary(options.properties);
  const titleField = popupSummary[0];
  const title =
    titleField?.displayValue ?? options.layerName;
  const titleHtml = titleField
    ? formatPopupValueHtml({ ...titleField, displayValue: truncate(title, 48) })
    : escapeHtml(truncate(title, 48));

  const images = extractPopupImages(options.properties, popupSummary);
  const galleryHtml = buildPopupGalleryHtml(images);
  const hasGallery = Boolean(galleryHtml);

  const metaFields = popupSummary
    .slice(popupSummary.length > 1 ? 1 : 0)
    .filter((field) => !isImageField(options.properties, field));

  const statusField = getStatusBadgeField(metaFields);
  const usedFieldKeys = new Set<string>();
  if (statusField) {
    usedFieldKeys.add(getPopupFieldKey(statusField));
  }
  const subtitle = buildPopupSubtitleHtml(metaFields, usedFieldKeys);
  subtitle.usedKeys.forEach((key) => usedFieldKeys.add(key));
  const headerMeta = buildPopupHeaderMetaHtml(metaFields, usedFieldKeys);
  headerMeta.usedKeys.forEach((key) => usedFieldKeys.add(key));

  const statusHtml = statusField?.displayValue?.trim()
    ? `<span class="map-popup-status-badge">${escapeHtml(truncate(statusField.displayValue.trim(), 24))}</span>`
    : "";

  const metaHtml = metaFields
    .filter((field) => !usedFieldKeys.has(getPopupFieldKey(field)))
    .slice(0, MAX_META_LINES)
    .map((field) => formatPopupFieldHtml(field))
    .join("");

  const detailButton =
    options.recordId && options.layerId
      ? `<button
          type="button"
          class="map-popup-action-btn map-popup-detail-btn"
          data-layer-id="${escapeHtml(options.layerId)}"
          data-record-id="${escapeHtml(options.recordId)}"
        >Xem chi tiết</button>`
      : "";

  const directionsButton = options.destination
    ? `<button
          type="button"
          class="map-popup-action-btn map-popup-directions-btn"
          data-lat="${options.destination.lat}"
          data-lng="${options.destination.lng}"
        >Chỉ đường</button>`
      : "";

  const actionsHtml =
    detailButton || directionsButton
      ? `<div class="map-popup-actions">${detailButton}${directionsButton}</div>`
      : "";
  const headerHtml = buildPopupHeaderHtml({
    layerName: options.layerName,
    layerCode: options.layerCode,
    layerColor: options.layerColor,
    layerRole: options.layerRole,
    geometryKind: options.geometryKind,
    style: options.style,
    titleHtml,
    galleryHtml,
    subtitleHtml: subtitle.html,
    headerMetaHtml: headerMeta.html,
    statusHtml,
    metaHtml,
    actionsHtml,
  });

  return `
    <article class="map-popup${hasGallery ? " map-popup--with-image" : " map-popup--no-image"}">
      ${headerHtml}
    </article>
  `;
}
