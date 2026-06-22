"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getAdministrativeBoundary } from "@/lib/api/map-view";
import { resolveMapView } from "@/lib/api/map-view";
import { getLayers } from "@/lib/api/layers";
import { getGeoJsonBounds } from "@/lib/map/bounds";
import {
  removeWardBoundaryLayer,
  upsertWardBoundaryLayer,
} from "@/lib/map/ward-boundary-layer";
import { removeAllDataLayers, syncDataLayers } from "@/lib/map/data-layers";
import {
  loadLayerGeoJsonEntries,
  type LayerGeoJsonEntry,
} from "@/lib/api/map-geojson";
import { extractStyleFromLayer } from "@/lib/layers/style";
import { resolvePublicAssetUrl } from "@/lib/api/assets";
import {
  formatDisplayValue,
  getStatusBadgeStyle,
} from "@/lib/dashboard/widget-display";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";
import { getWidgetFieldLabel } from "@/lib/dashboard/widget-labels";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";
import { isMapVisibleLayer } from "@/lib/layers/adapter";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import { WidgetEmptyState, WidgetPanel } from "./widget-renderers";

type RecordRow = Record<string, unknown>;
const PALETTE = [
  "#0284c7",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#e11d48",
  "#0d9488",
  "#4f46e5",
  "#ea580c",
];

export function MiniMapWidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const { hiddenLayerIds } = useMapLayerVisibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [entries, setEntries] = useState<LayerGeoJsonEntry[]>([]);
  const [boundary, setBoundary] = useState<GeoJsonFeatureCollection | null>(
    null,
  );
  const [mapView, setMapView] = useState<MapViewConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadOverviewMap(
      String(widget.displayConfig?.layerMode ?? "active"),
      hiddenLayerIds,
    )
      .then((result) => {
        if (active) {
          setEntries(result.entries);
          setBoundary(result.boundary);
          setMapView(result.mapView);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được dữ liệu bản đồ.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hiddenLayerIds, widget.displayConfig?.layerMode]);

  useEffect(() => {
    if (!containerRef.current || (!mapView && !boundary && !entries.length)) {
      return;
    }
    const interactive = widget.displayConfig?.interactive === true;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "minimap-background",
            type: "background",
            paint: { "background-color": "#eef6f2" },
          },
        ],
      },
      center: mapView
        ? [mapView.center.lng, mapView.center.lat]
        : [105.75, 9.8],
      zoom: mapView?.zoom ?? 10,
      interactive,
      attributionControl: false,
    });
    if (!interactive) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
      map.dragRotate.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disable();
    }
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    map.on("load", async () => {
      if (widget.displayConfig?.showBoundary !== false && boundary) {
        upsertWardBoundaryLayer(map, boundary);
      }
      await syncDataLayers(map, entries);
      if (widget.displayConfig?.autoFitBounds !== false) {
        const collection =
          boundary ?? mergeCollections(entries.map((entry) => entry.geojson));
        const bounds = getGeoJsonBounds(collection);
        if (bounds)
          map.fitBounds(bounds, { padding: 28, maxZoom: 16, duration: 0 });
      }
    });
    return () => {
      resizeObserver.disconnect();
      removeWardBoundaryLayer(map);
      removeAllDataLayers(map, entries);
      map.remove();
      mapRef.current = null;
    };
  }, [boundary, entries, mapView, widget.displayConfig]);

  return (
    <WidgetPanel widget={widget}>
      <div className="ioc-minimap">
        {loading ? (
          <div className="ioc-skeleton h-full min-h-40 rounded-lg" />
        ) : error ? (
          <WidgetEmptyState detail={error} />
        ) : entries.length === 0 && !boundary ? (
          <WidgetEmptyState detail="Không tải được bản đồ nhỏ" />
        ) : (
          <>
            <div ref={containerRef} className="ioc-minimap-canvas" />
            {widget.displayConfig?.showLegend !== false && (
              <MiniMapLegend entries={entries} />
            )}
          </>
        )}
      </div>
    </WidgetPanel>
  );
}

export function ProgressRingWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rawValue = isGroupedAnalyticsResult(data)
    ? data.rows.reduce((sum, row) => sum + safeNumber(row.value), 0)
    : "value" in data
      ? safeNumber(data.value)
      : NaN;
  if (!Number.isFinite(rawValue)) return <WidgetEmptyState />;
  const target = Math.max(
    0.0001,
    safeNumber(widget.displayConfig?.target) || 100,
  );
  const ratio = Math.max(0, Math.min(1, rawValue / target));
  const progress = ratio * 100;
  const tone = progress <= 40 ? "rose" : progress <= 70 ? "amber" : "green";
  const unit = String(widget.displayConfig?.unit ?? "%");
  const metric = widget.dataSourceConfig?.metricField;

  return (
    <div className={`ioc-progress-ring ioc-progress-ring--${tone}`}>
      <div className="ioc-progress-ring-visual">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Tiến độ ${progress}%`}
        >
          <circle className="ioc-progress-ring-track" cx="60" cy="60" r="49" />
          <circle
            className="ioc-progress-ring-value"
            cx="60"
            cy="60"
            r="49"
            pathLength="100"
            strokeDasharray={`${progress} 100`}
          />
        </svg>
        <strong>
          {formatAnalyticsNumber(rawValue)}
          <small>{unit}</small>
        </strong>
      </div>
      <div className="ioc-progress-ring-copy">
        <p>{metric ? getWidgetFieldLabel(widget, metric) : "Tiến độ"}</p>
        <span>
          {String(
            widget.displayConfig?.subtitle ??
              widget.displayConfig?.description ??
              `Mục tiêu ${formatAnalyticsNumber(target)}${unit}`,
          )}
        </span>
      </div>
    </div>
  );
}

export function ActivityFeedWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = recordRows(data);
  if (!rows.length) return <WidgetEmptyState detail="Chưa có hoạt động" />;
  const titleField = configField(widget, "titleField");
  const descriptionField = configField(widget, "descriptionField");
  const dateField = configField(widget, "dateField");
  const statusField = configField(widget, "statusField");
  const severityField = configField(widget, "severityField");
  const typeField = configField(widget, "typeField");

  return (
    <ol className="ioc-activity-feed">
      {rows.map((row, index) => {
        const severity = text(row[severityField]);
        const status = text(row[statusField]);
        return (
          <li key={index}>
            <span
              className={`ioc-activity-feed-dot ${severityClass(severity)}`}
            />
            <article>
              <div className="ioc-activity-feed-head">
                <h4 title={text(row[titleField])}>
                  {formatDisplayValue(row[titleField], titleField) ||
                    `Hoạt động ${index + 1}`}
                </h4>
                <time>{formatDate(row[dateField], true)}</time>
              </div>
              {descriptionField && row[descriptionField] != null && (
                <p title={text(row[descriptionField])}>
                  {text(row[descriptionField])}
                </p>
              )}
              <div className="ioc-activity-feed-badges">
                {severity && (
                  <Badge value={severity} field={severityField} severity />
                )}
                {status && <Badge value={status} field={statusField} />}
                {typeField && row[typeField] != null && (
                  <span>{formatDisplayValue(row[typeField], typeField)}</span>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function TreemapWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  if (!isGroupedAnalyticsResult(data)) return <WidgetEmptyState />;
  const limit = Math.max(1, Number(widget.dataSourceConfig?.limit ?? 8));
  const sorted = [...data.rows]
    .map((row) => {
      const field =
        widget.dataSourceConfig?.dimensionField ?? data.groupByFieldCode ?? "";
      return {
        label:
          row.label && row.label !== row.rawLabel
            ? row.label
            : formatDisplayValue(row.rawLabel || row.label, field),
        value: Math.max(0, safeNumber(row.value)),
      };
    })
    .sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, limit);
  if (sorted.length > limit) {
    visible.push({
      label: "Khác",
      value: sorted.slice(limit).reduce((sum, row) => sum + row.value, 0),
    });
  }
  const total = visible.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return <WidgetEmptyState />;
  const unit = String(widget.displayConfig?.unit ?? "").trim();

  return (
    <div className="ioc-treemap-layout">
      <div className="ioc-treemap">
        {visible.map((row, index) => {
          const percent = (row.value / total) * 100;
          return (
            <article
              key={`${row.label}-${index}`}
              style={{
                flexBasis: `${Math.max(18, percent)}%`,
                background: PALETTE[index % PALETTE.length],
              }}
              title={`${row.label}: ${formatAnalyticsNumber(row.value)}${unit ? ` ${unit}` : ""} (${formatPercent(percent)})`}
            >
              <strong>{row.label}</strong>
              <span>
                {formatAnalyticsNumber(row.value)}
                {unit ? ` ${unit}` : ""}
              </span>
              <small>{formatPercent(percent)}</small>
            </article>
          );
        })}
      </div>
      {widget.displayConfig?.showLegend !== false && (
        <ul className="ioc-chart-legend ioc-treemap-legend">
          {visible.map((row, index) => (
            <li key={row.label}>
              <span
                className="ioc-chart-legend-dot"
                style={{ background: PALETTE[index % PALETTE.length] }}
              />
              <span className="ioc-chart-legend-name">{row.label}</span>
              <strong>{formatPercent((row.value / total) * 100)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SeasonalCalendarWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = recordRows(data);
  const titleField = configField(widget, "titleField");
  const startField =
    configField(widget, "startDateField") || configField(widget, "dateField");
  const endField = configField(widget, "endDateField");
  const typeField = configField(widget, "typeField");
  const statusField = configField(widget, "statusField");
  const groupField = configField(widget, "groupField");
  const events = rows
    .map((row) => ({
      row,
      start: dateValue(row[startField]),
      end: dateValue(row[endField]),
    }))
    .filter((item): item is { row: RecordRow; start: Date; end: Date | null } =>
      Boolean(item.start),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!events.length) return <WidgetEmptyState detail="Chưa có lịch mùa vụ" />;
  const startMonth = monthStart(events[0].start);
  const latestEnd = events.reduce(
    (latest, event) => Math.max(latest, (event.end ?? event.start).getTime()),
    startMonth.getTime(),
  );
  const months = buildMonths(startMonth, new Date(latestEnd)).slice(0, 12);
  const mode = widget.displayConfig?.mode === "quarter" ? "quarter" : "month";
  const periods =
    mode === "quarter"
      ? ["Q1", "Q2", "Q3", "Q4"]
      : months.map((month) => `T${month.getMonth() + 1}`);
  const periodOffset = (date: Date) =>
    mode === "quarter"
      ? Math.min(3, Math.max(0, Math.floor(date.getMonth() / 3)))
      : monthOffset(startMonth, date);

  return (
    <div className="ioc-seasonal-calendar">
      <div className="ioc-seasonal-compact">
        {events.slice(0, 5).map((event, index) => (
          <article key={index}>
            <time>{formatDate(event.start)}</time>
            <strong>
              {formatDisplayValue(event.row[titleField], titleField)}
            </strong>
            {statusField && (
              <Badge value={text(event.row[statusField])} field={statusField} />
            )}
          </article>
        ))}
      </div>
      <div
        className="ioc-seasonal-timeline"
        style={{ "--month-count": periods.length } as React.CSSProperties}
      >
        <div className="ioc-seasonal-label-head">Công việc</div>
        <div className="ioc-seasonal-months">
          {periods.map((period) => (
            <span key={period}>{period}</span>
          ))}
        </div>
        {events.map((event, index) => {
          const start = periodOffset(event.start);
          const end = periodOffset(event.end ?? event.start);
          const color = colorForValue(
            text(event.row[typeField]) || String(index),
          );
          return (
            <div className="ioc-seasonal-row" key={index}>
              <div
                className="ioc-seasonal-row-label"
                title={text(event.row[titleField])}
              >
                <strong>
                  {formatDisplayValue(event.row[titleField], titleField)}
                </strong>
                <small>
                  {groupField
                    ? formatDisplayValue(event.row[groupField], groupField)
                    : formatDisplayValue(event.row[typeField], typeField)}
                </small>
              </div>
              <div className="ioc-seasonal-track">
                <span
                  className={
                    event.end ? "ioc-seasonal-bar" : "ioc-seasonal-marker"
                  }
                  style={{
                    left: `${((Math.max(0, start) + (event.end ? 0 : 0.5)) / periods.length) * 100}%`,
                    ...(event.end
                      ? {
                          width: `${(Math.max(1, end - start + 1) / periods.length) * 100}%`,
                        }
                      : {}),
                    background: color,
                  }}
                  title={`${formatDate(event.start)} – ${formatDate(event.end ?? event.start)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ul className="ioc-seasonal-legend">
        {Array.from(
          new Set(
            events.map((event) => text(event.row[typeField])).filter(Boolean),
          ),
        )
          .slice(0, 6)
          .map((value) => (
            <li key={value}>
              <span style={{ background: colorForValue(value) }} />
              {formatDisplayValue(value, typeField)}
            </li>
          ))}
      </ul>
    </div>
  );
}

function Badge({
  value,
  field,
  severity = false,
}: {
  value: string;
  field: string;
  severity?: boolean;
}) {
  if (!value) return null;
  return (
    <span
      className={`ioc-feed-badge ${severity ? severityClass(value) : getStatusBadgeStyle(value)}`}
    >
      {formatDisplayValue(value, field)}
    </span>
  );
}

async function loadOverviewMap(
  layerMode: string,
  hiddenLayerIds: ReadonlySet<string>,
) {
  const [layersResult, boundaryResult, mapViewResult] =
    await Promise.allSettled([
      getLayers(),
      getAdministrativeBoundary(),
      resolveMapView(),
    ]);
  const allLayers =
    layersResult.status === "fulfilled"
      ? layersResult.value.filter(isMapVisibleLayer)
      : [];
  const selectedLayers =
    layerMode === "all"
      ? allLayers
      : layerMode === "default"
        ? allLayers.slice(0, 6)
        : allLayers.filter((layer) => !hiddenLayerIds.has(layer.id));
  const entries = await loadLayerGeoJsonEntries(selectedLayers);
  const boundary =
    boundaryResult.status === "fulfilled" ? boundaryResult.value : null;
  const mapView =
    mapViewResult.status === "fulfilled" ? mapViewResult.value : null;
  if (!boundary && !mapView && !entries.length) {
    throw new Error("Không tải được bản đồ nhỏ");
  }
  return { entries, boundary, mapView };
}

function MiniMapLegend({ entries }: { entries: LayerGeoJsonEntry[] }) {
  const layer = entries[0]?.layer;
  if (!layer) return null;
  const style = extractStyleFromLayer(layer);
  const rules =
    style.styleMode === "icon_by_value"
      ? (style.iconRules ?? [])
      : (style.styleRules ?? []);
  if (!rules.length) return null;
  return (
    <div className="ioc-minimap-legend">
      <strong>{layer.name}</strong>
      {rules.slice(0, 6).map((rule, index) => (
        <span key={`${String(rule.value)}-${index}`}>
          {"url" in rule && rule.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvePublicAssetUrl(rule.url)} alt="" />
          ) : (
            <i
              style={{
                background:
                  "fillColor" in rule
                    ? rule.fillColor
                    : PALETTE[index % PALETTE.length],
              }}
            />
          )}
          {rule.label || formatDisplayValue(rule.value, style.styleField)}
        </span>
      ))}
    </div>
  );
}

function recordRows(data: AnalyticsResult) {
  return isRecordsAnalyticsResult(data) ? data.records : [];
}
function configField(widget: DashboardWidget, key: string) {
  return String(
    widget.displayConfig?.[key] ??
      widget.dataSourceConfig?.[key as keyof typeof widget.dataSourceConfig] ??
      "",
  );
}
function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function text(value: unknown) {
  return value == null ? "" : String(value);
}
function dateValue(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value: unknown, time = false) {
  const date = value instanceof Date ? value : dateValue(value);
  if (!date) return "Chưa có ngày";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
function severityClass(value: string) {
  const normalized = value.toLowerCase().replace(/[_-]+/g, " ");
  if (/khan|critical|emergency/.test(normalized))
    return "ioc-severity--critical";
  if (/cao|high/.test(normalized)) return "ioc-severity--high";
  if (/trung|medium/.test(normalized)) return "ioc-severity--medium";
  return "ioc-severity--low";
}
function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}
function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function buildMonths(start: Date, end: Date) {
  const months: Date[] = [];
  const cursor = monthStart(start);
  const last = monthStart(end);
  while (cursor <= last && months.length < 12) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.length ? months : [start];
}
function monthOffset(start: Date, date: Date) {
  return (
    (date.getFullYear() - start.getFullYear()) * 12 +
    date.getMonth() -
    start.getMonth()
  );
}
function mergeCollections(
  collections: GeoJsonFeatureCollection[],
): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collections.flatMap((collection) => collection.features),
  };
}

function applyMiniMapColorField(
  entries: LayerGeoJsonEntry[],
  colorField: string,
): LayerGeoJsonEntry[] {
  if (!colorField) return entries;
  return entries.map((entry) => {
    const style = extractStyleFromLayer(entry.layer);
    if (style.styleMode === "by_value" || style.styleMode === "icon_by_value") {
      return entry;
    }
    const values = Array.from(
      new Set(
        entry.geojson.features
          .map((feature) => feature.properties?.[colorField])
          .filter(
            (value) => value !== null && value !== undefined && value !== "",
          )
          .map(String),
      ),
    ).slice(0, 12);
    if (!values.length) return entry;
    return {
      ...entry,
      layer: {
        ...entry.layer,
        style: {
          ...style,
          styleMode: "by_value",
          styleField: colorField,
          styleRules: values.map((value) => ({
            value,
            label: formatDisplayValue(value, colorField),
            fillColor: colorForValue(value),
            strokeColor: colorForValue(value),
            lineColor: colorForValue(value),
          })),
          fallbackStyle: {
            fillColor: "#94a3b8",
            strokeColor: "#475569",
            lineColor: "#475569",
          },
        },
      },
    };
  });
}

function colorForValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
