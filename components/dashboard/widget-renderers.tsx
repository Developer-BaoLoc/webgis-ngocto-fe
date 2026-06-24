"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  formatWidgetValue,
  formatWidgetValueParts,
  getWidgetValueUnit,
} from "@/lib/dashboard/utils";
import {
  getWidgetDisplayTitle,
  getWidgetFieldLabel,
} from "@/lib/dashboard/widget-labels";
import {
  formatDisplayValue,
  getWidgetSubtitle,
} from "@/lib/dashboard/widget-display";
import { getKnownOptionLabel, getOptionLabel } from "@/lib/fields/field-label";
import {
  isGroupedAnalyticsResult,
  isTopAnalyticsResult,
} from "@/types/api/dashboard";
import type {
  AnalyticsComparison,
  AnalyticsResult,
  DashboardWidget,
} from "@/types/api/dashboard";

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
type LineChartPoint = ChartRow & {
  x: number;
  y: number;
  viewportX: number;
  viewportY: number;
};
type LineChartTooltipPosition = {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "top" | "bottom";
};
type KpiTheme = "sky" | "green" | "amber" | "rose" | "violet" | "slate";

const LINE_TOOLTIP_WIDTH = 220;
const LINE_TOOLTIP_HEIGHT = 68;
const LINE_TOOLTIP_GAP = 12;
const LINE_TOOLTIP_EDGE = 8;

export function WidgetPanel({
  widget,
  data,
  children,
}: {
  widget: DashboardWidget;
  data?: AnalyticsResult | null;
  children: React.ReactNode;
}) {
  return (
    <section className="ioc-panel ioc-panel--command ioc-widget-panel h-full">
      <header className="ioc-panel-header ioc-panel-header--compact">
        <div className="min-w-0 flex-1">
          <h3 className="ioc-panel-title" title={getWidgetDisplayTitle(widget)}>
            {getWidgetDisplayTitle(widget)}
          </h3>
          <p className="ioc-panel-subtitle ioc-panel-subtitle--compact">
            {getWidgetSubtitle(widget, data)}
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

export function WidgetValue({
  value,
  unit,
  valueFormat,
  align = "start",
}: {
  value: unknown;
  unit?: string;
  valueFormat?: "number" | "currency" | "percent" | "integer";
  align?: "start" | "end";
}) {
  const parts = formatWidgetValueParts(value, { unit, valueFormat });
  return (
    <span
      className={`ioc-widget-value ioc-widget-value--${align}`}
      aria-label={formatWidgetValue(value, { unit, valueFormat })}
    >
      <span className="ioc-widget-value-number">{parts.value}</span>
      {parts.unit && (
        <span className="ioc-widget-value-unit">{parts.unit}</span>
      )}
    </span>
  );
}

function WidgetSvgValue({ value, unit }: { value: unknown; unit?: string }) {
  const parts = formatWidgetValueParts(value, { unit });
  return (
    <>
      <tspan className="ioc-widget-svg-value-number">{parts.value}</tspan>
      {parts.unit && (
        <tspan className="ioc-widget-svg-value-unit" dx="4">
          {parts.unit}
        </tspan>
      )}
    </>
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
    : safeNumber("value" in data ? data.value : 0);
  const unit = getWidgetValueUnit(
    widget,
    widget.dataSourceConfig?.metricField ?? ("fieldCode" in data ? data.fieldCode : undefined),
  );
  const icon = resolveKpiIcon(widget);
  const theme = resolveKpiTheme(widget, icon);

  return (
    <article className={`ioc-kpi ioc-kpi--${theme} ioc-kpi--dashboard h-full`}>
      <div className="ioc-kpi-icon-wrap">{renderKpiIcon(icon)}</div>
      <div className="ioc-kpi-body">
        <p className="ioc-kpi-label" title={getWidgetDisplayTitle(widget)}>
          {getWidgetDisplayTitle(widget)}
        </p>
        <p className="ioc-kpi-value">
          <WidgetValue value={value} unit={unit} />
        </p>
        {"comparison" in data && data.comparison && (
          <KpiComparison comparison={data.comparison} />
        )}
        <p className="ioc-kpi-sub">{getWidgetDescription(widget)}</p>
      </div>
    </article>
  );
}

function KpiComparison({
  comparison,
}: {
  comparison: AnalyticsComparison;
}) {
  const delta = comparison.delta ?? 0;
  const tone =
    delta > 0 ? "ioc-kpi-comparison--up" : delta < 0 ? "ioc-kpi-comparison--down" : "ioc-kpi-comparison--flat";
  const icon = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";
  return (
    <p className={`ioc-kpi-comparison ${tone}`}>
      <span>
        {icon}{" "}
        {typeof comparison.deltaPercent === "number"
          ? formatWidgetValue(comparison.deltaPercent, { valueFormat: "percent" })
          : "Chưa có dữ liệu kỳ trước"}
      </span>
      <small>{comparison.label}</small>
    </p>
  );
}

export function RankingWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const configuredLimit = positiveInteger(
    widget.displayConfig?.limit ?? widget.dataSourceConfig?.limit,
  );
  const sort = widget.displayConfig?.sort === "asc" ? "asc" : "desc";
  const rows = buildRankingRows(widget, data)
    .sort((left, right) =>
      sort === "asc" ? left.value - right.value : right.value - left.value,
    )
    .slice(0, configuredLimit ?? undefined);
  if (rows.length === 0) return <WidgetEmptyState />;

  const maxValue = Math.max(...rows.map((row) => Math.max(0, row.value)), 0);
  const metricField = String(
    widget.displayConfig?.valueField ??
      widget.dataSourceConfig?.metricField ??
      ("fieldCode" in data ? data.fieldCode : undefined) ??
      "",
  );
  const unit = getWidgetValueUnit(widget, metricField);
  const showMedal = widget.displayConfig?.showMedal !== false;
  const showProgressBar = widget.displayConfig?.showProgressBar !== false;

  return (
    <ul className="space-y-2">
      {rows.map((row, index) => {
        const rank = index + 1;
        const progress =
          maxValue > 0 ? (Math.max(0, row.value) / maxValue) * 100 : 0;
        return (
          <li
            key={`${row.name}-${index}`}
            className={`rounded-lg border px-3 py-2 transition ${
              rank === 1
                ? "border-amber-200 bg-amber-50/80 shadow-sm"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full text-sm font-semibold ${
                  showMedal && rank === 1
                    ? "bg-amber-100 text-amber-800"
                    : showMedal && rank === 2
                      ? "bg-slate-100 text-slate-700"
                      : showMedal && rank === 3
                        ? "bg-orange-100 text-orange-800"
                        : "bg-sky-50 text-sky-700"
                }`}
                aria-label={`Hạng ${rank}`}
              >
                {showMedal && rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="truncate text-sm font-semibold text-slate-950"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-950">
                    <WidgetValue value={row.value} unit={unit} align="end" />
                  </span>
                </div>
                {row.subtitle && (
                  <span
                    className="mt-0.5 block truncate text-xs text-muted"
                    title={row.subtitle}
                  >
                    {row.subtitle}
                  </span>
                )}
                {showProgressBar && (
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    aria-hidden
                  >
                    <div
                      className={`h-full rounded-full ${
                        rank === 1 ? "bg-amber-500" : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                )}
              </div>
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
  const rows = groupedRows(widget, data);
  if (rows.length === 0) return <WidgetEmptyState />;
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const metricLabel = metricDisplayLabel(widget);
  const dimensionLabel = dimensionDisplayLabel(widget);
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const unit = getWidgetValueUnit(widget, metricField);

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
              <strong>
                <WidgetValue value={row.value} unit={unit} align="end" />
              </strong>
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
              {row.label} · {metricLabel}: {formatWidgetValue(row.value, { unit })}
            </span>
          </li>
        ))}
      </ul>
      <p className="ioc-chart-axis-caption ioc-chart-axis-caption--x">
        {dimensionLabel}
      </p>
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
  const rows = groupSmallSlices(groupedRows(widget, data));
  const positiveRows = rows.filter((row) => row.value > 0);
  const total = positiveRows.reduce((sum, row) => sum + row.value, 0);
  if (positiveRows.length === 0 || total <= 0) return <WidgetEmptyState />;

  const active = activeIndex === null ? null : positiveRows[activeIndex];
  const metricLabel = metricDisplayLabel(widget);
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const unit = getWidgetValueUnit(widget, metricField);
  const slices = buildPieSlices(positiveRows, total, metricLabel, unit);

  return (
    <div className="ioc-dynamic-pie-layout">
      <div className="ioc-dynamic-pie-visual">
        <svg viewBox="0 0 220 220" className="ioc-dynamic-pie" role="img">
          <title>{getWidgetDisplayTitle(widget)}</title>
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
                <WidgetSvgValue value={total} unit={unit} />
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
              {metricLabel}: {formatWidgetValue(active.value, { unit })} ·{" "}
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
            <strong>
              <WidgetValue value={row.value} unit={unit} align="end" />
            </strong>
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
  const [hoveredPoint, setHoveredPoint] = useState<LineChartPoint | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<LineChartPoint | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const activeCircleRef = useRef<SVGCircleElement | null>(null);
  const rows = lineChartRows(widget, data);
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (tooltipRef.current?.contains(target)) return;
      if (activeCircleRef.current?.contains(target)) return;
      setHoveredPoint(null);
      setPinnedPoint(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHoveredPoint(null);
        setPinnedPoint(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
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
  const metricLabel = pureMetricDisplayLabel(widget);
  const metricSeriesLabel = metricDisplayLabel(widget);
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const unit = getWidgetValueUnit(widget, metricField);
  const tooltipUnit = unit || extractUnitFromLabel(metricLabel);
  const points = rows.map((row, index) => ({
    x: padX + (index / Math.max(1, rows.length - 1)) * (width - padX * 2),
    y:
      padTop + ((maxValue - row.value) / range) * (height - padTop - padBottom),
    row,
  }));
  const visiblePoint = pinnedPoint ?? hoveredPoint;
  const tooltipPosition = visiblePoint
    ? resolveLineTooltipPosition(visiblePoint)
    : null;
  const activeTooltip = visiblePoint
    ? tooltipUnit
      ? {
          title: visiblePoint.label,
          value: formatWidgetValue(visiblePoint.value, { unit: tooltipUnit }),
        }
      : {
          title: visiblePoint.label,
          value: `${metricLabel}: ${formatWidgetValue(visiblePoint.value)}`,
        }
    : null;

  return (
    <div className="ioc-dynamic-line-wrap" ref={wrapperRef}>
      <div className="ioc-chart-key">
        <span className="ioc-chart-key-dot" />
        {metricSeriesLabel}
      </div>
      <div className="ioc-dynamic-line-scroll">
        <div className="ioc-dynamic-line-canvas" style={{ width }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="ioc-dynamic-line"
            role="img"
            aria-label={metricSeriesLabel}
          >
            {[0, 1, 2, 3].map((step) => {
              const y = padTop + (step / 3) * (height - padTop - padBottom);
              const tickValue = maxValue - (step / 3) * range;
              return (
                <g key={step}>
                  <line x1={padX} x2={width - padX} y1={y} y2={y} />
                  <text x={padX - 8} y={y + 3} textAnchor="end">
                    {formatAnalyticsNumber(tickValue)}
                  </text>
                </g>
              );
            })}
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              className="ioc-dynamic-line-path"
            />
            {points.map((point, index) => {
              return (
                <g key={`${point.row.label}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    tabIndex={0}
                    role="button"
                    aria-label={`${point.row.label}: ${formatLineMetricValue(point.row.value, tooltipUnit)}`}
                    onPointerEnter={(event) => {
                      activeCircleRef.current = event.currentTarget;
                      setHoveredPoint(
                        buildLineTooltipPoint(
                          point.row,
                          point.x,
                          point.y,
                          event.currentTarget,
                        ),
                      );
                    }}
                    onPointerLeave={() => {
                      if (!pinnedPoint) activeCircleRef.current = null;
                      setHoveredPoint(null);
                    }}
                    onFocus={(event) => {
                      activeCircleRef.current = event.currentTarget;
                      setHoveredPoint(
                        buildLineTooltipPoint(
                          point.row,
                          point.x,
                          point.y,
                          event.currentTarget,
                        ),
                      );
                    }}
                    onBlur={() => setHoveredPoint(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      activeCircleRef.current = event.currentTarget;
                      setPinnedPoint(
                        buildLineTooltipPoint(
                          point.row,
                          point.x,
                          point.y,
                          event.currentTarget,
                        ),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        activeCircleRef.current = event.currentTarget;
                        setPinnedPoint(
                          buildLineTooltipPoint(
                            point.row,
                            point.x,
                            point.y,
                            event.currentTarget,
                          ),
                        );
                      }
                    }}
                  >
                    <title>
                      {point.row.label}
                      {"\n"}
                      {metricLabel}: {formatLineMetricValue(point.row.value, tooltipUnit)}
                    </title>
                  </circle>
                  <text x={point.x} y={height - 20} textAnchor="middle">
                    {truncate(point.row.label, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      {visiblePoint &&
        activeTooltip &&
        tooltipPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`ioc-line-point-tooltip ioc-line-point-tooltip--${tooltipPosition.placement} ${
              pinnedPoint ? "ioc-line-point-tooltip--pinned" : ""
            }`}
            role={pinnedPoint ? "dialog" : "tooltip"}
            style={
              {
                left: `${tooltipPosition.left}px`,
                top: `${tooltipPosition.top}px`,
                "--tooltip-arrow-left": `${tooltipPosition.arrowLeft}px`,
              } as React.CSSProperties
            }
          >
            <div className="ioc-line-point-tooltip-title">
              {activeTooltip.title}
            </div>
            <div className="ioc-line-point-tooltip-value">
              {activeTooltip.value}
            </div>
            {pinnedPoint && (
              <button
                type="button"
                className="ioc-line-point-tooltip-close"
                aria-label="Đóng tooltip"
                onClick={() => {
                  setHoveredPoint(null);
                  setPinnedPoint(null);
                  activeCircleRef.current = null;
                }}
              >
                ×
              </button>
            )}
          </div>,
          document.body,
        )}
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
    const metricField =
      widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
    const unit = getWidgetValueUnit(widget, metricField);
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
                <th key={column}>{getWidgetFieldLabel(widget, column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.records.map((record, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>
                    {column === metricField && isFiniteNumberLike(record[column])
                      ? <WidgetValue value={record[column]} unit={unit} />
                      : displayCellValue(record[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rows = groupedRows(widget, data);
  if (rows.length === 0) return <WidgetEmptyState />;
  const metricField =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const unit = getWidgetValueUnit(widget, metricField);
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
                <WidgetValue value={row.value} unit={unit} align="end" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function lineChartRows(
  widget: DashboardWidget,
  data: AnalyticsResult,
): ChartRow[] {
  if (!isGroupedAnalyticsResult(data)) return [];
  const dimensionField =
    widget.dataSourceConfig?.dimensionField ??
    widget.dataSourceConfig?.groupByFieldCode ??
    data.groupByFieldCode ??
    "";
  return data.rows.map((row) => ({
    label: formatLineDimensionDisplayValue(
      dimensionField,
      row.rawLabel || row.label,
    ),
    value: safeNumber(row.value),
  }));
}

function formatLineDimensionDisplayValue(
  fieldKey: string | undefined,
  rawValue: unknown,
) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "Không xác định";
  }
  const known = getKnownOptionLabel(fieldKey ?? "", rawValue);
  if (known) return known;
  const text = String(rawValue).trim();
  if (!text) return "Không xác định";
  if (/[À-ỹĐđ]/.test(text) && !text.includes("_")) return text;
  if (!looksLikeIdentifierValue(text)) return text;
  return humanizeLineIdentifierValue(text);
}

function formatLineMetricValue(value: number, unit: string) {
  return formatWidgetValue(value, { unit });
}

function buildLineTooltipPoint(
  row: ChartRow,
  x: number,
  y: number,
  circle: SVGCircleElement,
): LineChartPoint {
  const rect = circle.getBoundingClientRect();
  return {
    ...row,
    x,
    y,
    viewportX: rect.left + rect.width / 2,
    viewportY: rect.top + rect.height / 2,
  };
}

function resolveLineTooltipPosition(
  point: LineChartPoint,
): LineChartTooltipPosition {
  const viewportWidth =
    typeof window === "undefined" ? LINE_TOOLTIP_WIDTH : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? LINE_TOOLTIP_HEIGHT : window.innerHeight;
  const left = clamp(
    point.viewportX - LINE_TOOLTIP_WIDTH / 2,
    LINE_TOOLTIP_EDGE,
    viewportWidth - LINE_TOOLTIP_WIDTH - LINE_TOOLTIP_EDGE,
  );
  const preferredTop =
    point.viewportY - LINE_TOOLTIP_HEIGHT - LINE_TOOLTIP_GAP;
  const preferredBottom = point.viewportY + LINE_TOOLTIP_GAP;
  const hasTopSpace = preferredTop >= LINE_TOOLTIP_EDGE;
  const hasBottomSpace =
    preferredBottom + LINE_TOOLTIP_HEIGHT <= viewportHeight - LINE_TOOLTIP_EDGE;
  const placement = hasTopSpace || !hasBottomSpace ? "top" : "bottom";
  const rawTop = placement === "top" ? preferredTop : preferredBottom;
  const top = clamp(
    rawTop,
    LINE_TOOLTIP_EDGE,
    viewportHeight - LINE_TOOLTIP_HEIGHT - LINE_TOOLTIP_EDGE,
  );
  return {
    left,
    top,
    arrowLeft: clamp(point.viewportX - left, 16, LINE_TOOLTIP_WIDTH - 16),
    placement,
  };
}

function extractUnitFromLabel(label: string) {
  const match = label.match(/\(([^)]+)\)/);
  return match?.[1]?.trim() ?? "";
}

function looksLikeIdentifierValue(value: string) {
  return /[_-]/.test(value) || /^[A-Za-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(value);
}

function humanizeLineIdentifierValue(value: string) {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    .split(" ")
    .map((word, index) => lineIdentifierWordLabel(word, index))
    .join(" ");
}

function lineIdentifierWordLabel(word: string, index: number) {
  const lower = word.toLocaleLowerCase("vi-VN");
  if (/^\d+$/.test(lower)) return lower;
  const labels: Record<string, string> = {
    vung: index === 0 ? "Vùng" : "vùng",
    hoa: "hoa",
    mau: "màu",
    lua: "lúa",
    thuy: "thủy",
    san: "sản",
  };
  const mapped = labels[lower] ?? lower;
  return index === 0
    ? mapped.charAt(0).toLocaleUpperCase("vi-VN") + mapped.slice(1)
    : mapped;
}

function groupedRows(
  widget: DashboardWidget,
  data: AnalyticsResult,
): ChartRow[] {
  if (!isGroupedAnalyticsResult(data)) return [];
  const dimensionField =
    widget.dataSourceConfig?.dimensionField ??
    widget.dataSourceConfig?.groupByFieldCode ??
    data.groupByFieldCode ??
    "";
  return data.rows.map((row) => ({
    label: analyticsGroupLabel(dimensionField, row.rawLabel, row.label),
    value: safeNumber(row.value),
  }));
}

function buildRankingRows(widget: DashboardWidget, data: AnalyticsResult) {
  if (isGroupedAnalyticsResult(data)) {
    return data.rows.map((row) => ({
      name: analyticsGroupLabel(
        widget.dataSourceConfig?.dimensionField ??
          widget.dataSourceConfig?.groupByFieldCode ??
          data.groupByFieldCode ??
          "",
        row.rawLabel,
        row.label,
      ),
      subtitle: "",
      value: safeNumber(row.value),
    }));
  }
  if (!isTopAnalyticsResult(data)) return [];

  const metricField = String(
    widget.displayConfig?.valueField ??
      widget.dataSourceConfig?.metricField ??
      data.fieldCode ??
      "value",
  );
  const configuredNameField = String(
    widget.displayConfig?.nameField ??
      widget.displayConfig?.labelField ??
      "",
  ).trim();
  const configuredTypeField = String(widget.displayConfig?.typeField ?? "").trim();
  const displayFields = (widget.dataSourceConfig?.displayFields ?? []).filter(
    (field) => field !== metricField,
  );

  return data.records.map((record, index) => {
    const keys = Object.keys(record);
    const nameField =
      (configuredNameField || displayFields[0]) ??
      widget.dataSourceConfig?.dimensionField ??
      keys.find((key) => key !== metricField);
    const subtitleField =
      configuredTypeField ||
      (displayFields.find((field) => field !== nameField) ??
        keys.find((key) => key !== metricField && key !== nameField));
    return {
      name:
        displayCellValue(nameField ? record[nameField] : null, nameField) ||
        `Mục ${index + 1}`,
      subtitle: subtitleField
        ? getOptionLabel(subtitleField, record[subtitleField], {
            label: getWidgetFieldLabel(widget, subtitleField),
          })
        : "",
      value: safeNumber(record[metricField]),
    };
  });
}

function analyticsGroupLabel(
  fieldKey: string,
  rawLabel: string,
  resolvedLabel: string,
) {
  if (
    resolvedLabel &&
    resolvedLabel !== rawLabel &&
    resolvedLabel !== "(Trống)"
  ) {
    return resolvedLabel;
  }
  return getOptionLabel(fieldKey, rawLabel || resolvedLabel || "(Trống)");
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

function buildPieSlices(
  rows: ChartRow[],
  total: number,
  metricLabel: string,
  unit: string,
) {
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
      tooltip: `${row.label}\n${metricLabel}: ${formatWidgetValue(row.value, { unit })} (${formatPercent(row.value, total)})`,
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
  const metric =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const dimension =
    widget.dataSourceConfig?.dimensionField ??
    widget.dataSourceConfig?.groupByFieldCode;
  if (metric && dimension) {
    return `${aggregation} ${getWidgetFieldLabel(widget, metric)} theo ${getWidgetFieldLabel(widget, dimension)}`;
  }
  if (metric) return `${aggregation} ${getWidgetFieldLabel(widget, metric)}`;
  if (dimension)
    return `${aggregation} theo ${getWidgetFieldLabel(widget, dimension)}`;
  return `${aggregation} từ nguồn dữ liệu đã chọn`;
}

function metricDisplayLabel(widget: DashboardWidget) {
  const metric =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  const aggregation =
    AGGREGATION_LABELS[widget.dataSourceConfig?.aggregation ?? "count"] ??
    "Giá trị";
  return metric
    ? `${aggregation} ${getWidgetFieldLabel(widget, metric)}`
    : aggregation;
}

function pureMetricDisplayLabel(widget: DashboardWidget) {
  const metric =
    widget.dataSourceConfig?.metricField ?? widget.dataSourceConfig?.fieldCode;
  return metric ? getWidgetFieldLabel(widget, metric) : "Giá trị";
}

function dimensionDisplayLabel(widget: DashboardWidget) {
  const dimension =
    widget.dataSourceConfig?.dimensionField ??
    widget.dataSourceConfig?.groupByFieldCode;
  return dimension ? getWidgetFieldLabel(widget, dimension) : "Nhóm";
}

function resolveKpiIcon(widget: DashboardWidget) {
  const configured = String(widget.displayConfig?.icon ?? "auto");
  if (configured !== "auto") return configured;
  const haystack = normalizeText(
    `${getWidgetDisplayTitle(widget)} ${widget.dataSourceConfig?.metricField ?? ""} ${widget.displayConfig?.suffix ?? ""}`,
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

function isFiniteNumberLike(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed));
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return value;
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number, total: number) {
  return `${((value / Math.max(total, 1)) * 100).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}%`;
}

function displayCellValue(value: unknown, fieldKey?: string): string {
  if (value === null || value === undefined || value === "") {
    return "Chưa có dữ liệu";
  }
  if (typeof value === "number") return formatAnalyticsNumber(value);
  return formatDisplayValue(value, fieldKey);
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
