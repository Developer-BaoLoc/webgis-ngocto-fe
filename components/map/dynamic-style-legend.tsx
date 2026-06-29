import { useState } from "react";
import {
  getFallbackColor,
  getRuleColor,
  isDynamicLayerStyle,
} from "@/lib/layers/dynamic-style";
import { extractStyleFromLayer } from "@/lib/layers/style";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import { LayerSymbol } from "@/components/layers/layer-symbol";
import { getFieldLabel, type FieldLabelMetadata } from "@/lib/fields/field-label";
import type { Layer } from "@/types/layer.types";

export function DynamicStyleLegend({ layers }: { layers: Layer[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const items = layers.flatMap((layer) => {
    const style = extractStyleFromLayer(layer);
    if (
      !isDynamicLayerStyle(style) &&
      !(style.styleMode === "icon_by_value" && style.styleField)
    ) {
      return [];
    }
    return [{ layer, style }];
  });

  if (!items.length) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Mở chú giải màu lớp dữ liệu"
        className="map-layer-legend-toggle"
        onClick={() => setCollapsed(false)}
      >
        <span aria-hidden>▣</span>
        <span>Chú thích</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Chú giải màu lớp dữ liệu"
      className="map-layer-legend"
    >
      <div className="map-layer-legend-header">
        <div>
          <h2>Chú thích</h2>
          <p>{items.length} lớp đang dùng màu động</p>
        </div>
        <button
          type="button"
          aria-label="Ẩn chú giải"
          className="map-layer-legend-close"
          onClick={() => setCollapsed(true)}
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      {items.map(({ layer, style }) => {
        const isIconStyle = style.styleMode === "icon_by_value";
        const fieldLabel = resolveLegendFieldLabel(layer, style.styleField);
        const isLine = ["line", "linestring", "multilinestring"].includes(
          layer.geometryType.toLocaleLowerCase(),
        );
        return (
          <section key={layer.id} className="map-layer-legend-section">
            <div className="flex min-w-0 items-center gap-2">
              <LayerSymbol layer={layer} size="xs" />
              <h3
                className="map-layer-legend-title min-w-0 flex-1"
                title={layer.name}
              >
                {layer.name}
              </h3>
            </div>
            <p
              className="map-layer-legend-meta"
              title={fieldLabel}
            >
              Theo trường: {fieldLabel}
            </p>
            <ul className="map-layer-legend-list">
              {(isIconStyle
                ? (style.iconRules ?? [])
                : (style.styleRules ?? [])
              ).map((rule, index) => (
                <li
                  key={`${typeof rule.value}:${String(rule.value)}:${index}`}
                  className="map-layer-legend-item"
                  title={rule.label ?? String(rule.value)}
                >
                  {isIconStyle && "url" in rule && rule.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvePublicAssetUrl(rule.url)}
                      alt=""
                      className="map-layer-legend-icon"
                    />
                  ) : (
                    <span
                      className={
                        isLine
                          ? "map-layer-legend-swatch map-layer-legend-swatch--line"
                          : "map-layer-legend-swatch"
                      }
                      style={{
                        backgroundColor: getRuleColor(
                          rule,
                          isLine ? "line" : "fill",
                        ),
                        borderColor: getRuleColor(rule, "stroke"),
                      }}
                      aria-hidden
                    />
                  )}
                  <span className="truncate">
                    {rule.label || String(rule.value)}
                  </span>
                </li>
              ))}
              {!isIconStyle && (
                <li className="map-layer-legend-item map-layer-legend-item--muted">
                  <span
                    className={
                      isLine
                        ? "map-layer-legend-swatch map-layer-legend-swatch--line"
                        : "map-layer-legend-swatch"
                    }
                    style={{
                      backgroundColor: getFallbackColor(
                        style,
                        isLine ? "line" : "fill",
                        layer.color,
                      ),
                      borderColor: getFallbackColor(style, "stroke", "#475569"),
                    }}
                    aria-hidden
                  />
                  <span className="truncate">Giá trị khác</span>
                </li>
              )}
              {isIconStyle && style.fallbackIcon?.url && (
                <li className="map-layer-legend-item map-layer-legend-item--muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvePublicAssetUrl(style.fallbackIcon.url)}
                    alt=""
                    className="map-layer-legend-icon"
                  />
                  <span className="truncate">Giá trị khác</span>
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}

function resolveLegendFieldLabel(layer: Layer, fieldCode?: string) {
  if (!fieldCode) return "Không xác định";

  const layerRecord = layer as unknown as Record<string, unknown>;
  const styleRecord = layer.style as Record<string, unknown> | undefined;
  const metadata = findFieldMetadata(layerRecord, fieldCode);
  const styleFieldLabel =
    readString(styleRecord?.styleFieldLabel) ??
    readString(styleRecord?.fieldLabel) ??
    readStyleFieldLabel(styleRecord, fieldCode);

  return getFieldLabel(fieldCode, {
    ...(metadata ?? {}),
    label: metadata?.label ?? styleFieldLabel,
  });
}

function findFieldMetadata(
  source: Record<string, unknown>,
  fieldCode: string,
): FieldLabelMetadata | null {
  const candidates = [source.fields, source.schema, source.fieldMetadata];
  for (const candidate of candidates) {
    const found = readFieldMetadata(candidate, fieldCode);
    if (found) return found;
  }

  const style = source.style as Record<string, unknown> | undefined;
  const styleMetadata = style?.metadata as Record<string, unknown> | undefined;
  for (const candidate of [style?.fields, styleMetadata?.fields]) {
    const found = readFieldMetadata(candidate, fieldCode);
    if (found) return found;
  }

  return null;
}

function readFieldMetadata(
  value: unknown,
  fieldCode: string,
): FieldLabelMetadata | null {
  if (Array.isArray(value)) {
    const found = value.find((field) => {
      if (!field || typeof field !== "object") return false;
      const record = field as Record<string, unknown>;
      return record.code === fieldCode || record.fieldCode === fieldCode;
    });
    return found ? (found as FieldLabelMetadata) : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const field = record[fieldCode];
    return field && typeof field === "object"
      ? (field as FieldLabelMetadata)
      : null;
  }

  return null;
}

function readStyleFieldLabel(
  style: Record<string, unknown> | undefined,
  fieldCode: string,
) {
  const labels = style?.fieldLabels;
  if (!labels || typeof labels !== "object") return undefined;
  return readString((labels as Record<string, unknown>)[fieldCode]);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
