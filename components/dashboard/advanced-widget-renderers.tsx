"use client";

import "maplibre-gl/dist/maplibre-gl.css";
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
import { WidgetEmptyState, WidgetPanel } from "./widget-renderers";

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

  const mapLayers = layers.filter(isMapVisibleLayer);
  const activeLayers = mapLayers.filter((layer) => !hiddenLayerIds.has(layer.id));

  const visibleDots = activeLayers.slice(0, 6);
  const overflow = activeLayers.length - visibleDots.length;

  return (
    <WidgetPanel widget={widget}>
      <section className="ioc-map-panel ioc-map-panel--hero ioc-minimap-widget">
        <span className="ioc-map-frame-corner ioc-map-frame-corner--tl" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--tr" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--bl" aria-hidden />
        <span className="ioc-map-frame-corner ioc-map-frame-corner--br" aria-hidden />

        <div className="ioc-map-panel-body">
          <MapPageContent embedded />

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
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
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
              title={`${dimensionLabel}: ${row.label}\n${metricLabel}: ${formatAnalyticsNumber(row.value)}${unit ? ` ${unit}` : ""} (${formatPercent(percent)})`}
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
