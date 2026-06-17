import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { normalizeAttachmentList } from "@/lib/fields/attachments";
import { normalizeMultiCategoryDisplayText } from "@/lib/fields/multi-category";
import type { AttachmentRef } from "@/types/api/assets";
import type { PopupSummaryField } from "@/types/api/records";

const TITLE_PROPERTY_KEYS = [
  "ten_chu_the",
  "ten_mo_hinh",
  "ten",
  "name",
  "title",
  "label",
  "ten_tram_bom",
  "ten_vung",
];

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

function getFallbackTitle(properties: Record<string, unknown>): string {
  for (const key of TITLE_PROPERTY_KEYS) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const summary = parsePopupSummary(properties);
  if (summary[0]?.displayValue) return summary[0].displayValue;

  return "Chi tiết bản ghi";
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
  recordId?: string;
  properties: Record<string, unknown>;
  destination?: { lat: number; lng: number };
}): string {
  const popupSummary = parsePopupSummary(options.properties);
  const titleField = popupSummary[0];
  const title =
    titleField?.displayValue ?? getFallbackTitle(options.properties);
  const titleHtml = titleField
    ? formatPopupValueHtml({ ...titleField, displayValue: truncate(title, 48) })
    : escapeHtml(truncate(title, 48));

  const images = extractPopupImages(options.properties, popupSummary);
  const galleryHtml = buildPopupGalleryHtml(images);
  const hasGallery = Boolean(galleryHtml);

  const metaFields = popupSummary
    .slice(popupSummary.length > 1 ? 1 : 0)
    .filter((field) => !isImageField(options.properties, field))
    .slice(0, MAX_META_LINES);

  const metaHtml = metaFields
    .map((field) => formatPopupFieldHtml(field))
    .join("");

  const detailButton =
    options.recordId && options.layerId
      ? `<button
          type="button"
          class="map-popup-action-btn map-popup-detail-btn"
          data-layer-id="${escapeHtml(options.layerId)}"
          data-record-id="${escapeHtml(options.recordId)}"
        >Chi tiết</button>`
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
      ? `<div class="map-popup-actions">${directionsButton}${detailButton}</div>`
      : "";

  return `
    <article class="map-popup${hasGallery ? " map-popup--with-image" : " map-popup--no-image"}">
      ${galleryHtml}
      <div class="map-popup-content">
        <div class="map-popup-headline">
          <h3 class="map-popup-title">${titleHtml}</h3>
          <span class="map-popup-layer">${escapeHtml(options.layerName)}</span>
        </div>
        ${metaHtml ? `<div class="map-popup-meta">${metaHtml}</div>` : ""}
        ${actionsHtml}
      </div>
    </article>
  `;
}
