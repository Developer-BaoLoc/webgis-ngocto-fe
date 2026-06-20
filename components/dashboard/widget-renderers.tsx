"use client";

import { useState } from "react";
import {
  KpiIconAgriculture,
  KpiIconArea,
  KpiIconCount,
  KpiIconPump,
  KpiIconRevenue,
  KpiIconWarning,
} from "@/components/dashboard/ioc/kpi-icons";
import {
  AGGREGATION_LABELS,
  formatAnalyticsNumber,
} from "@/lib/dashboard/utils";
import {
  isGroupedAnalyticsResult,
  isTopAnalyticsResult,
} from "@/types/api/dashboard";
import type { AnalyticsResult, DashboardWidget } from "@/types/api/dashboard";

const CHART_PALETTE = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#f97316",
];

type ChartRow = { label: string; value: number };
type KpiTheme = "sky" | "green" | "amber" | "rose" | "violet" | "slate";

export function WidgetPanel({
  widget,
  children,
}: {
  widget: DashboardWidget;
  children: React.ReactNode;
}) {
  return (
    <section className="ioc-panel ioc-panel--command ioc-widget-panel h-full">
      <header className="ioc-panel-header ioc-panel-header--compact">
        <div className="min-w-0 flex-1">
          <h3 className="ioc-panel-title" title={widget.title}>
            {widget.title}
          </h3>
          <p className="ioc-panel-subtitle ioc-panel-subtitle--compact">
            {getWidgetDescription(widget)}
          </p>
        </div>
        <span className="ioc-panel-accent" aria-hidden />
      </header>
      <div className="ioc-panel-body">{children}</div>
    </section>
  );
}

export function WidgetEmptyState({
  detail = "Hãy kiểm tra nguồn dữ liệu hoặc bộ lọc",
}: {
  detail?: string;
}) {
  return (
    <div className="ioc-widget-state" role="status">
      <span className="ioc-widget-state-icon" aria-hidden>
        ◌
      </span>
      <p className="ioc-widget-state-title">Chưa có dữ liệu</p>
      <p className="ioc-widget-state-detail">{detail}</p>
    </div>
  );
}

export function KpiWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  if (isTopAnalyticsResult(data)) {
    return (
      <WidgetEmptyState detail="Hãy dùng kiểu bảng xếp hạng cho tổng hợp Top N" />
    );
  }

  const value = isGroupedAnalyticsResult(data)
    ? data.rows.reduce((sum, row) => sum + safeNumber(row.value), 0)
    : safeNumber(data.value);
  const suffix = String(widget.displayConfig?.suffix ?? "").trim();
  const icon = resolveKpiIcon(widget);
  const theme = resolveKpiTheme(widget, icon);

  return (
    <article className={`ioc-kpi ioc-kpi--${theme} ioc-kpi--dashboard h-full`}>
      <div className="ioc-kpi-icon-wrap">{renderKpiIcon(icon)}</div>
      <div className="ioc-kpi-body">
        <p className="ioc-kpi-label" title={widget.title}>
          {widget.title}
        </p>
        <p className="ioc-kpi-value">
          {formatAnalyticsNumber(value)}
          {suffix && <span className="ioc-kpi-unit">{suffix}</span>}
        </p>
        <p className="ioc-kpi-sub">{getWidgetDescription(widget)}</p>
      </div>
    </article>
  );
}

export function RankingWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = buildRankingRows(widget, data);
  if (rows.length === 0) return <WidgetEmptyState />;

  const maxValue = Math.max(...rows.map((row) => Math.max(0, row.value)), 0);
  const suffix = String(widget.displayConfig?.suffix ?? "").trim();

  return (
    <ul className="ioc-top-revenue-rank">
      {rows.map((row, index) => {
        const rank = index + 1;
        const progress =
          maxValue > 0 ? (Math.max(0, row.value) / maxValue) * 100 : 0;
        return (
          <li
            key={`${row.name}-${index}`}
            className={`ioc-top-revenue-rank-item ${rank === 1 ? "ioc-top-revenue-rank-item--leader" : ""}`}
          >
            <div className="ioc-top-revenue-rank-head">
              <span
                className={`ioc-top-revenue-rank-badge ioc-top-revenue-rank-badge--${rank <= 3 ? rank : "default"}`}
              >
                {rank}
              </span>
              <div className="ioc-top-revenue-rank-info">
                <span className="ioc-top-revenue-rank-name" title={row.name}>
                  {row.name}
                </span>
                {row.subtitle && (
                  <span
                    className="ioc-top-revenue-rank-type"
                    title={row.subtitle}
                  >
                    {row.subtitle}
                  </span>
                )}
              </div>
              <span className="ioc-top-revenue-rank-value">
                {formatAnalyticsNumber(row.value)}
                {suffix ? ` ${suffix}` : ""}
              </span>
            </div>
            <div className="ioc-top-revenue-rank-bar" aria-hidden>
              <div
                className={`ioc-top-revenue-rank-bar-fill ${rank === 1 ? "ioc-top-revenue-rank-bar-fill--leader" : ""}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function BarChartWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = groupedRows(data);
  if (rows.length === 0) return <WidgetEmptyState />;
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const metricLabel = metricDisplayLabel(widget);

  return (
    <div className="ioc-dynamic-bars">
      <div className="ioc-chart-key">
        <span className="ioc-chart-key-dot" />
        {metricLabel}
      </div>
      <ul>
        {rows.map((row, index) => (
          <li
            key={`${row.label}-${index}`}
            className="ioc-dynamic-bar-row"
            tabIndex={0}
          >
            <div className="ioc-dynamic-bar-meta">
              <span title={row.label}>{row.label}</span>
              <strong>{formatAnalyticsNumber(row.value)}</strong>
            </div>
            <div className="ioc-dynamic-bar-track">
              <div
                className={`ioc-dynamic-bar-fill ${row.value < 0 ? "ioc-dynamic-bar-fill--negative" : ""}`}
                style={{
                  width: `${Math.max(2, (Math.abs(row.value) / maxValue) * 100)}%`,
                  background:
                    row.value < 0
                      ? undefined
                      : CHART_PALETTE[index % CHART_PALETTE.length],
                }}
              />
            </div>
            <span className="ioc-chart-tooltip" role="tooltip">
              {row.label} · {metricLabel}: {formatAnalyticsNumber(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PieChartWidgetRenderer({
  widget,
  data,
  donut,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
  donut: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rows = groupSmallSlices(groupedRows(data));
  const positiveRows = rows.filter((row) => row.value > 0);
  const total = positiveRows.reduce((sum, row) => sum + row.value, 0);
  if (positiveRows.length === 0 || total <= 0) return <WidgetEmptyState />;

  const slices = buildPieSlices(positiveRows, total);
  const active = activeIndex === null ? null : positiveRows[activeIndex];
  const metricLabel = metricDisplayLabel(widget);

  return (
    <div className="ioc-dynamic-pie-layout">
      <div className="ioc-dynamic-pie-visual">
        <svg viewBox="0 0 220 220" className="ioc-dynamic-pie" role="img">
          <title>{widget.title}</title>
          {slices.map((slice, index) =>
            slice.fullCircle ? (
              <circle
                key={slice.label}
                cx="110"
                cy="110"
                r="94"
                fill={slice.color}
                className="ioc-pie-segment"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>{slice.tooltip}</title>
              </circle>
            ) : (
              <path
                key={slice.label}
                d={slice.path}
                fill={slice.color}
                className="ioc-pie-segment"
                tabIndex={0}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>{slice.tooltip}</title>
              </path>
            ),
          )}
          {donut && (
            <>
              <circle cx="110" cy="110" r="57" className="ioc-donut-hole" />
              <text
                x="110"
                y="106"
                textAnchor="middle"
                className="ioc-donut-value"
              >
                {formatAnalyticsNumber(total)}
              </text>
              <text
                x="110"
                y="126"
                textAnchor="middle"
                className="ioc-donut-label"
              >
                tổng
              </text>
            </>
          )}
        </svg>
        {active && (
          <div
            className="ioc-chart-tooltip ioc-chart-tooltip--visible"
            role="tooltip"
          >
            <strong>{active.label}</strong>
            <span>
              {metricLabel}: {formatAnalyticsNumber(active.value)} ·{" "}
              {formatPercent(active.value, total)}
            </span>
          </div>
        )}
      </div>
      <ul className="ioc-chart-legend">
        {positiveRows.map((row, index) => (
          <li key={row.label}>
            <span
              className="ioc-chart-legend-dot"
              style={{
                background: CHART_PALETTE[index % CHART_PALETTE.length],
              }}
            />
            <span className="ioc-chart-legend-name" title={row.label}>
              {row.label}
            </span>
            <strong>{formatAnalyticsNumber(row.value)}</strong>
            <small>{formatPercent(row.value, total)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChartWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const rows = groupedRows(data);
  if (rows.length === 0) return <WidgetEmptyState />;

  const width = Math.max(520, rows.length * 78);
  const height = 230;
  const padX = 44;
  const padTop = 24;
  const padBottom = 48;
  const values = rows.map((row) => row.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;
  const points = rows.map((row, index) => ({
    x: padX + (index / Math.max(1, rows.length - 1)) * (width - padX * 2),
    y:
      padTop + ((maxValue - row.value) / range) * (height - padTop - padBottom),
    row,
  }));

  return (
    <div className="ioc-dynamic-line-wrap">
      <div className="ioc-chart-key">
        <span className="ioc-chart-key-dot" />
        {metricDisplayLabel(widget)}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: width }}
        className="ioc-dynamic-line"
        role="img"
      >
        {[0, 1, 2, 3].map((step) => {
          const y = padTop + (step / 3) * (height - padTop - padBottom);
          return <line key={step} x1={padX} x2={width - padX} y1={y} y2={y} />;
        })}
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          className="ioc-dynamic-line-path"
        />
        {points.map((point, index) => (
          <g key={`${point.row.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" tabIndex={0}>
              <title>
                {point.row.label} · {metricDisplayLabel(widget)}:{" "}
                {formatAnalyticsNumber(point.row.value)}
              </title>
            </circle>
            <text x={point.x} y={height - 20} textAnchor="middle">
              {truncate(point.row.label, 12)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function TableWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  if (isTopAnalyticsResult(data)) {
    if (data.records.length === 0) return <WidgetEmptyState />;
    const preferred = widget.dataSourceConfig?.displayFields ?? [];
    const allColumns = Object.keys(data.records[0] ?? {});
    const columns = [
      ...preferred.filter((field) => allColumns.includes(field)),
      ...allColumns.filter((field) => !preferred.includes(field)),
    ];
    return (
      <div className="ioc-table-wrap">
        <table className="ioc-table ioc-dynamic-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{humanizeField(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.records.map((record, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{displayCellValue(record[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rows = groupedRows(data);
  if (rows.length === 0) return <WidgetEmptyState />;
  return (
    <div className="ioc-table-wrap">
      <table className="ioc-table ioc-dynamic-table">
        <thead>
          <tr>
            <th>{dimensionDisplayLabel(widget)}</th>
            <th className="text-right">{metricDisplayLabel(widget)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <td title={row.label}>{row.label}</td>
              <td className="text-right font-semibold tabular-nums">
                {formatAnalyticsNumber(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupedRows(data: AnalyticsResult): ChartRow[] {
  if (!isGroupedAnalyticsResult(data)) return [];
  return data.rows.map((row) => ({
    label: row.label || "(Trống)",
    value: safeNumber(row.value),
  }));
}

function buildRankingRows(widget: DashboardWidget, data: AnalyticsResult) {
  if (isGroupedAnalyticsResult(data)) {
    return data.rows.map((row) => ({
      name: row.label || "(Trống)",
      subtitle: "",
      value: safeNumber(row.value),
    }));
  }
  if (!isTopAnalyticsResult(data)) return [];

  const metricField =
    widget.dataSourceConfig?.metricField ?? data.fieldCode ?? "value";
  const displayFields = (widget.dataSourceConfig?.displayFields ?? []).filter(
    (field) => field !== metricField,
  );

  return data.records.map((record, index) => {
    const keys = Object.keys(record);
    const nameField =
      displayFields[0] ??
      widget.dataSourceConfig?.dimensionField ??
      keys.find((key) => key !== metricField);
    const subtitleField =
      displayFields[1] ??
      keys.find((key) => key !== metricField && key !== nameField);
    return {
      name:
        displayCellValue(nameField ? record[nameField] : null) ||
        `Mục ${index + 1}`,
      subtitle: subtitleField ? displayCellValue(record[subtitleField]) : "",
      value: safeNumber(record[metricField]),
    };
  });
}

function groupSmallSlices(rows: ChartRow[]): ChartRow[] {
  const positive = [...rows]
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
  if (positive.length <= 8) return positive;
  return [
    ...positive.slice(0, 7),
    {
      label: "Khác",
      value: positive.slice(7).reduce((sum, row) => sum + row.value, 0),
    },
  ];
}

function buildPieSlices(rows: ChartRow[], total: number) {
  let angle = -90;
  return rows.map((row, index) => {
    const sweep = (row.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const startPoint = polarPoint(start);
    const endPoint = polarPoint(end);
    return {
      label: row.label,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
      fullCircle: sweep >= 359.999,
      path: `M 110 110 L ${startPoint.x} ${startPoint.y} A 94 94 0 ${sweep > 180 ? 1 : 0} 1 ${endPoint.x} ${endPoint.y} Z`,
      tooltip: `${row.label}: ${formatAnalyticsNumber(row.value)} (${formatPercent(row.value, total)})`,
    };
  });
}

function polarPoint(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 110 + 94 * Math.cos(radians),
    y: 110 + 94 * Math.sin(radians),
  };
}

function getWidgetDescription(widget: DashboardWidget) {
  const configured = String(widget.displayConfig?.description ?? "").trim();
  if (configured) return configured;
  const aggregation =
    AGGREGATION_LABELS[widget.dataSourceConfig?.aggregation ?? "count"] ??
    "Thống kê";
  const metric = widget.dataSourceConfig?.metricField;
  const dimension = widget.dataSourceConfig?.dimensionField;
  if (metric && dimension) {
    return `${aggregation} ${humanizeField(metric)} theo ${humanizeField(dimension)}`;
  }
  if (metric) return `${aggregation} ${humanizeField(metric)}`;
  if (dimension) return `${aggregation} theo ${humanizeField(dimension)}`;
  return `${aggregation} từ nguồn dữ liệu đã chọn`;
}

function metricDisplayLabel(widget: DashboardWidget) {
  const metric = widget.dataSourceConfig?.metricField;
  const aggregation =
    AGGREGATION_LABELS[widget.dataSourceConfig?.aggregation ?? "count"] ??
    "Giá trị";
  return metric ? `${aggregation} ${humanizeField(metric)}` : aggregation;
}

function dimensionDisplayLabel(widget: DashboardWidget) {
  return widget.dataSourceConfig?.dimensionField
    ? humanizeField(widget.dataSourceConfig.dimensionField)
    : "Nhóm";
}

function resolveKpiIcon(widget: DashboardWidget) {
  const configured = String(widget.displayConfig?.icon ?? "auto");
  if (configured !== "auto") return configured;
  const haystack = normalizeText(
    `${widget.title} ${widget.dataSourceConfig?.metricField ?? ""} ${widget.displayConfig?.suffix ?? ""}`,
  );
  if (/nuoc|thuy loi|tram bom|irrigation|water/.test(haystack)) return "water";
  if (/lua|nong nghiep|san luong|agriculture|rice/.test(haystack))
    return "agriculture";
  if (/canh bao|loi|warning|rui ro/.test(haystack)) return "warning";
  if (
    /tien|doanh thu|loi nhuan|thu nhap|currency|revenue|profit/.test(haystack)
  )
    return "money";
  if (/dien tich|area|\bha\b/.test(haystack)) return "area";
  return "count";
}

function resolveKpiTheme(widget: DashboardWidget, icon: string): KpiTheme {
  const configured = String(widget.displayConfig?.theme ?? "");
  if (
    ["sky", "green", "amber", "rose", "violet", "slate"].includes(configured)
  ) {
    return configured as KpiTheme;
  }
  if (icon === "water") return "sky";
  if (icon === "agriculture" || icon === "area") return "green";
  if (icon === "warning") return "amber";
  if (icon === "money") return "violet";
  return "slate";
}

function renderKpiIcon(icon: string) {
  if (icon === "water") return <KpiIconPump />;
  if (icon === "agriculture") return <KpiIconAgriculture />;
  if (icon === "warning") return <KpiIconWarning />;
  if (icon === "money") return <KpiIconRevenue />;
  if (icon === "area") return <KpiIconArea />;
  return <KpiIconCount />;
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatPercent(value: number, total: number) {
  return `${((value / Math.max(total, 1)) * 100).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}%`;
}

function humanizeField(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Chưa có dữ liệu";
  }
  if (typeof value === "number") return formatAnalyticsNumber(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
