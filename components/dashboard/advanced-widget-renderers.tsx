"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import {
  formatDisplayValue,
  getStatusBadgeStyle,
} from "@/lib/dashboard/widget-display";
import { formatWidgetValue, getWidgetValueUnit } from "@/lib/dashboard/utils";
import { getWidgetFieldLabel } from "@/lib/dashboard/widget-labels";
import {
  getAdministrativeBoundary,
  resolveMapView,
} from "@/lib/api/map-view";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import { WidgetEmptyState, WidgetPanel, WidgetValue } from "./widget-renderers";

import Link from "next/link";
import { MapPageContent } from "@/components/map/map-page-content";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import { isMapVisibleLayer } from "@/lib/layers/adapter";

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
  const { layers } = useLayerCatalog();
  const { hiddenLayerIds } = useMapLayerVisibility();
  const [mapView, setMapView] = useState<MapViewConfig | null>(null);
  const [boundary, setBoundary] = useState<GeoJsonFeatureCollection | null>(
    null,
  );
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  const mapLayers = layers.filter(isMapVisibleLayer);
  const activeLayers = mapLayers.filter((layer) => !hiddenLayerIds.has(layer.id));

  const visibleDots = activeLayers.slice(0, 6);
  const overflow = activeLayers.length - visibleDots.length;

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([resolveMapView(), getAdministrativeBoundary()]).then(
      ([mapViewResult, boundaryResult]) => {
        if (cancelled) return;

        if (mapViewResult.status === "fulfilled") {
          setMapView(mapViewResult.value);
        }

        if (boundaryResult.status === "fulfilled") {
          setBoundary(boundaryResult.value);
          setBoundaryError(null);
        } else {
          setBoundary(null);
          setBoundaryError("Không tải được ranh giới hành chính.");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetPanel widget={widget}>
      <section className="ioc-map-panel ioc-map-panel--hero ioc-minimap-widget">
        <span className="ioc-map-frame-corner ioc-map-frame-corner--tl" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--tr" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--bl" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--br" aria-hidden />

        <div className="ioc-map-panel-body">
          <MapPageContent
            embedded
            mapView={mapView}
            boundary={boundary}
            boundaryError={boundaryError}
          />
          {boundaryError && (
            <span className="ioc-minimap-boundary-warning">
              {boundaryError}
            </span>
          )}

          <div className="ioc-map-float-bar" role="toolbar" aria-label="Điều khiển bản đồ nhỏ">
            <div
              className="ioc-map-float-group"
              title={`${activeLayers.length} lớp đang bật`}
              aria-label={`${activeLayers.length} lớp đang bật`}
            >
              <span className="ioc-map-icon-btn ioc-map-icon-btn--static" aria-hidden>
                <LayersIcon />
              </span>

              <span className="ioc-map-layer-count">{activeLayers.length}</span>

              <span className="ioc-map-layer-dots" aria-hidden>
                {visibleDots.map((layer) => (
                  <span
                    key={layer.id}
                    className="ioc-map-layer-dot"
                    style={{ background: layer.color ?? "#22c55e" }}
                    title={layer.name}
                  />
                ))}

                {overflow > 0 && (
                  <span className="ioc-map-layer-dot ioc-map-layer-dot--more" title={`+${overflow} lớp`}>
                    +{overflow}
                  </span>
                )}
              </span>
            </div>

            <Link
              href="/ban-do"
              className="ioc-map-icon-btn"
              title="Mở bản đồ toàn màn hình"
              aria-label="Mở bản đồ toàn màn hình"
            >
              <ExpandIcon />
            </Link>
          </div>
        </div>
      </section>
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
  const metric = widget.dataSourceConfig?.metricField;
  const unit = getWidgetValueUnit(widget, metric) || "%";
  const targetText =
    unit === "%"
      ? formatWidgetValue(target, { valueFormat: "percent" })
      : formatWidgetValue(target, { unit });

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
          <WidgetValue
            value={rawValue}
            unit={unit === "%" ? undefined : unit}
            valueFormat={unit === "%" ? "percent" : "number"}
          />
        </strong>
      </div>
      <div className="ioc-progress-ring-copy">
        <p>{metric ? getWidgetFieldLabel(widget, metric) : "Tiến độ"}</p>
        <span>
          {String(
            widget.displayConfig?.subtitle ??
              widget.displayConfig?.description ??
              `Mục tiêu ${targetText}`,
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

type AlertSeverityKey = "khan_cap" | "cao" | "trung_binh" | "thap";

const ALERT_SEVERITY_STYLES: Record<
  AlertSeverityKey,
  { label: string; background: string; bar: string; text: string }
> = {
  khan_cap: {
    label: "Khẩn cấp",
    background: "#fef2f2",
    bar: "#ef4444",
    text: "#991b1b",
  },
  cao: {
    label: "Cao",
    background: "#fff7ed",
    bar: "#f97316",
    text: "#9a3412",
  },
  trung_binh: {
    label: "Trung bình",
    background: "#fefce8",
    bar: "#eab308",
    text: "#854d0e",
  },
  thap: {
    label: "Thấp",
    background: "#f0fdf4",
    bar: "#22c55e",
    text: "#166534",
  },
};

export function AlertCenterWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const titleField = configField(widget, "titleField");
  const severityField = configField(widget, "severityField");
  const areaField = configField(widget, "areaField");
  const dateField = configField(widget, "dateField");
  const statusField = configField(widget, "statusField");
  const limit = Number(
    widget.dataSourceConfig?.limit ?? widget.displayConfig?.limit ?? 20,
  );
  const rows = sortAlertRows(recordRows(data), dateField).slice(0, limit);

  if (!rows.length) {
    return (
      <WidgetEmptyState
        detail={
          widget.widgetType === "spatial_alert"
            ? "Chưa có dữ liệu không gian phù hợp."
            : "Chưa có cảnh báo"
        }
      />
    );
  }

  return (
    <ol className="ioc-alert-center-list">
      {rows.map((row, index) => {
        const rawSeverity = alertSeverityText(row[severityField]);
        const severityKey = resolveAlertSeverityKey(rawSeverity);
        const severityStyle = ALERT_SEVERITY_STYLES[severityKey];
        const severityLabel = formatAlertSeverityLabel(
          rawSeverity,
          severityKey,
        );
        const title = titleField
          ? formatDisplayValue(row[titleField], titleField)
          : "";
        const area = areaField
          ? formatDisplayValue(row[areaField], areaField)
          : "";
        const status = statusField
          ? formatDisplayValue(row[statusField], statusField)
          : "";

        return (
          <li key={index}>
            <article
              className="ioc-alert-center-item"
              style={{ backgroundColor: severityStyle.background }}
            >
              <span
                aria-hidden="true"
                className="ioc-alert-center-bar"
                style={{ backgroundColor: severityStyle.bar }}
              />
              <div className="ioc-alert-center-body">
                <div className="ioc-alert-center-head">
                  <h4 title={text(row[titleField])}>
                    {title || `Cảnh báo ${index + 1}`}
                  </h4>
                  <span
                    className="ioc-alert-center-severity"
                    style={{ color: severityStyle.text }}
                  >
                    {severityLabel}
                  </span>
                </div>
                <div className="ioc-alert-center-meta">
                  {area && <span>{area}</span>}
                  {dateField && (
                    <time dateTime={text(row[dateField])}>
                      {formatRelativeAlertTime(row[dateField])}
                    </time>
                  )}
                  {status && (
                    <span
                      className={`ioc-feed-badge ${getStatusBadgeStyle(
                        text(row[statusField]),
                      )}`}
                    >
                      {status}
                    </span>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

const THEMATIC_COLORS: Record<string, string> = {
  very_low: "#dcfce7",
  low: "#bbf7d0",
  medium: "#fde68a",
  high: "#fdba74",
  very_high: "#ef4444",
};

export function SpatialSummaryWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = isGroupedAnalyticsResult(data) ? data.rows : [];
  if (!rows.length || rows.every((row) => safeNumber(row.value) <= 0)) {
    return <WidgetEmptyState detail="Chưa có dữ liệu không gian phù hợp." />;
  }
  const max = Math.max(...rows.map((row) => safeNumber(row.value)), 1);
  const unit = getWidgetValueUnit(widget, widget.dataSourceConfig?.metricField);
  return (
    <ol className="ioc-spatial-summary-list">
      {rows.slice(0, Number(widget.dataSourceConfig?.limit ?? 12)).map((row) => {
        const value = safeNumber(row.value);
        return (
          <li key={row.rawLabel || row.label}>
            <span>{row.label}</span>
            <div>
              <i style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
            <strong>{formatWidgetValue(value, { unit })}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export function ThematicMapWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = recordRows(data);
  if (!rows.length || rows.every((row) => safeNumber(row.value) <= 0)) {
    return <WidgetEmptyState detail="Chưa có dữ liệu không gian phù hợp." />;
  }
  const paths = buildThematicPaths(rows);
  if (!paths.length) return <WidgetEmptyState detail="Chưa có geometry để hiển thị" />;
  const unit = getWidgetValueUnit(widget, widget.dataSourceConfig?.metricField);
  const metricLabel = getWidgetFieldLabel(widget, "value");
  return (
    <div className="ioc-thematic-map">
      <svg viewBox="0 0 320 190" role="img" aria-label="Bản đồ tô màu theo quantile">
        {paths.map((path, index) => (
          <path
            key={`${path.label}-${index}`}
            d={path.d}
            fill={THEMATIC_COLORS[path.classKey] ?? "#e2e8f0"}
            stroke="#ffffff"
            strokeWidth="1.4"
          >
            <title>
              {path.label}: {metricLabel} {formatWidgetValue(path.value, { unit })}
            </title>
          </path>
        ))}
      </svg>
      <div className="ioc-thematic-legend">
        {[
          ["very_low", "Rất thấp"],
          ["low", "Thấp"],
          ["medium", "Trung bình"],
          ["high", "Cao"],
          ["very_high", "Rất cao"],
        ].map(([key, label]) => (
          <span key={key}>
            <i style={{ background: THEMATIC_COLORS[key] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
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
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const unit = getWidgetValueUnit(widget, metricField);
  const dimensionField =
    widget.dataSourceConfig?.dimensionField ?? data.groupByFieldCode ?? "";
  const metricLabel = metricField
    ? getWidgetFieldLabel(widget, metricField)
    : "Giá trị";
  const dimensionLabel = dimensionField
    ? getWidgetFieldLabel(widget, dimensionField)
    : "Nhóm";

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
              title={`${dimensionLabel}: ${row.label}\n${metricLabel}: ${formatWidgetValue(row.value, { unit })} (${formatPercent(percent)})`}
            >
              <strong>{row.label}</strong>
              <span>
                <WidgetValue value={row.value} unit={unit} />
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
function normalizeAlertValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function resolveAlertSeverityKey(value: string): AlertSeverityKey {
  const normalized = normalizeAlertValue(value);
  const compact = normalized.replace(/_/g, "");

  if (
    normalized === "khan_cap" ||
    normalized === "khan" ||
    compact === "khancap" ||
    (normalized.includes("khan") && normalized.includes("cap")) ||
    normalized.includes("khan_cap") ||
    /critical|emergency|urgent/.test(normalized)
  ) {
    return "khan_cap";
  }

  if (normalized === "cao" || normalized === "high") return "cao";

  if (
    normalized === "trung_binh" ||
    compact === "trungbinh" ||
    normalized === "medium"
  ) {
    return "trung_binh";
  }

  if (normalized === "thap" || normalized === "low") return "thap";

  return "thap";
}

function alertSeverityText(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ["label", "name", "displayName", "value", "code"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return text(value).trim();
}

type ThematicPath = {
  d: string;
  label: string;
  classKey: string;
  classLabel: string;
  value: number;
};

function buildThematicPaths(rows: RecordRow[]): ThematicPath[] {
  const polygons = rows
    .map((row) => ({
      row,
      rings: extractPolygonRings(row.geometry),
    }))
    .filter((item) => item.rings.length > 0);
  const points = polygons.flatMap((item) => item.rings.flat());
  if (!points.length) return [];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.000001, maxX - minX);
  const height = Math.max(0.000001, maxY - minY);
  const scale = Math.min(300 / width, 170 / height);
  const offsetX = (320 - width * scale) / 2;
  const offsetY = (190 - height * scale) / 2;
  const project = ([x, y]: [number, number]) =>
    [
      offsetX + (x - minX) * scale,
      190 - (offsetY + (y - minY) * scale),
    ] as const;
  return polygons.map(({ row, rings }) => ({
    d: rings
      .map((ring) =>
        ring
          .map((point, index) => {
            const [x, y] = project(point);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
          .concat(" Z"),
      )
      .join(" "),
    label: text(row.area) || "Khu vực",
    classKey: text(row.classKey),
    classLabel: text(row.classLabel),
    value: safeNumber(row.value),
  }));
}

function extractPolygonRings(geometry: unknown): Array<Array<[number, number]>> {
  if (!geometry || typeof geometry !== "object") return [];
  const geo = geometry as { type?: string; coordinates?: unknown };
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as unknown[])
      .map((ring) => normalizeRing(ring))
      .filter((ring) => ring.length > 2);
  }
  if (geo.type === "MultiPolygon" && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as unknown[])
      .flatMap((polygon) => (Array.isArray(polygon) ? polygon : []))
      .map((ring) => normalizeRing(ring))
      .filter((ring) => ring.length > 2);
  }
  return [];
}

function normalizeRing(ring: unknown): Array<[number, number]> {
  if (!Array.isArray(ring)) return [];
  return ring
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const x = Number(point[0]);
      const y = Number(point[1]);
      return Number.isFinite(x) && Number.isFinite(y)
        ? ([x, y] as [number, number])
        : null;
    })
    .filter((point): point is [number, number] => Boolean(point));
}

function formatAlertSeverityLabel(
  rawSeverity: string,
  severityKey: AlertSeverityKey,
) {
  const trimmed = rawSeverity.trim();

  if (trimmed) {
    const normalized = normalizeAlertValue(trimmed);

    if (
      normalized === "khan_cap" ||
      normalized === "khan" ||
      normalized.replace(/_/g, "") === "khancap" ||
      (normalized.includes("khan") && normalized.includes("cap"))
    ) {
      return "Khẩn cấp";
    }

    if (normalized === "cao") return "Cao";
    if (normalized === "trung_binh" || normalized === "trungbinh") {
      return "Trung bình";
    }
    if (normalized === "thap") return "Thấp";

    // Nếu raw là label tiếng Việt thật, giữ nguyên raw.
    if (!/[_-]/.test(trimmed)) return trimmed;
  }

  return ALERT_SEVERITY_STYLES[severityKey].label;
}

function sortAlertRows(rows: RecordRow[], dateField: string) {
  if (!dateField) return rows;
  return [...rows].sort((left, right) => {
    const leftTime = dateValue(left[dateField])?.getTime() ?? 0;
    const rightTime = dateValue(right[dateField])?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}
function formatRelativeAlertTime(value: unknown) {
  const date = dateValue(value);
  if (!date) return "Chưa có ngày";
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor(
    (current.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days >= 0 && isSameWeek(target, current)) return "Tuần này";
  if (days > 1) return `${days} ngày trước`;
  return formatDate(value);
}
function isSameWeek(left: Date, right: Date) {
  const weekStart = (date: Date) => {
    const day = date.getDay() || 7;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - day + 1);
    return start;
  };
  return weekStart(left).getTime() === weekStart(right).getTime();
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
function colorForValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 17 10 5 10-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 12 10 5 10-5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H3v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-7 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l7-7" />
    </svg>
  );
}
