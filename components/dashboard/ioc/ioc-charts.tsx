"use client";

import { useMemo } from "react";
import type {
  AgriAlert,
  ChartDatum,
  CitizenFeedback,
  FinancialCompareRow,
  ForecastPoint,
} from "@/types/agri-dashboard";
import { wardConfig } from "@/config/ward.config";
import { formatNumber } from "@/lib/dashboard/agri-data";

const PALETTE = [
  "#22c55e",
  "#84cc16",
  "#fbbf24",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#f97316",
];

export function IocPanel({
  title,
  subtitle,
  children,
  className = "",
  compact = false,
  command = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  command?: boolean;
}) {
  return (
    <section
      className={`ioc-panel ${compact ? "ioc-panel--compact" : ""} ${command ? "ioc-panel--command" : ""} ${className}`}
    >
      <header className={`ioc-panel-header ${compact ? "ioc-panel-header--compact" : ""}`}>
        <div className="min-w-0 flex-1">
          <h3 className="ioc-panel-title">{title}</h3>
          {subtitle && (
            <p className={`ioc-panel-subtitle ${compact ? "ioc-panel-subtitle--compact" : ""}`}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="ioc-panel-accent" aria-hidden />
      </header>
      <div className="ioc-panel-body">{children}</div>
    </section>
  );
}

export function DonutChart({
  data,
  size = 168,
  compact = false,
  mini = false,
  wide = false,
  emphasizeCenter = false,
  hideLegend = false,
  centerLabel,
  centerSubLabel = "tổng",
  centerFontSize,
  centerSubFontSize,
  colors,
  className = "",
}: {
  data: ChartDatum[];
  size?: number;
  compact?: boolean;
  mini?: boolean;
  wide?: boolean;
  emphasizeCenter?: boolean;
  hideLegend?: boolean;
  centerLabel?: string | number;
  centerSubLabel?: string;
  centerFontSize?: number;
  centerSubFontSize?: number;
  colors?: string[];
  className?: string;
}) {
  const chartSize = mini ? (size !== 168 ? size : 80) : size;
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const colorAt = (index: number) =>
    colors?.[index] ?? PALETTE[index % PALETTE.length];
  const pad = mini ? 8 : compact ? 8 : 12;
  const radius = chartSize / 2 - pad;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  let angle = -90;

  const slices = data.map((item, index) => {
    const sweep = (item.value / total) * 360;
    const start = angle;
    angle += sweep;
    const end = angle;
    const largeArc = sweep > 180 ? 1 : 0;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { d, color: colorAt(index), item };
  });

  const centerFont =
    centerFontSize ??
    (mini
      ? Math.max(12, Math.round(chartSize * 0.2))
      : emphasizeCenter
        ? 26
        : compact
          ? 18
          : 22);
  const subFont =
    centerSubFontSize ??
    (mini
      ? Math.max(8, Math.round(chartSize * 0.12))
      : compact
        ? 10
        : 11);
  const layoutWide = wide || mini;
  const centerValue =
    centerLabel !== undefined ? String(centerLabel) : String(total);

  return (
    <div
      className={
        mini
          ? `ioc-donut-mini ${className}`
          : compact
            ? layoutWide
              ? `flex items-start gap-4 ${className}`
              : `flex flex-col items-center gap-2 ${className}`
            : `flex flex-col items-center gap-4 lg:flex-row lg:items-start ${className}`
      }
    >
      <svg
        width={chartSize}
        height={chartSize}
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        className="ioc-donut-svg shrink-0"
      >
        {slices.map((slice, i) => (
          <path key={i} d={slice.d} fill={slice.color} opacity={0.92} />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.58} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <text
          x={cx}
          y={cy - (mini ? (subFont <= 8 ? 1 : 2) : compact ? 2 : 4)}
          textAnchor="middle"
          fill="#15803d"
          fontSize={centerFont}
          fontWeight="700"
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + (mini ? (subFont <= 8 ? 5 : 7) : compact ? 10 : 16)}
          textAnchor="middle"
          fill="#64748b"
          fontSize={subFont}
        >
          {centerSubLabel}
        </text>
      </svg>
      {!hideLegend && (
        <ul
          className={`ioc-legend min-w-0 flex-1 ${mini ? "ioc-legend--mini" : compact ? "ioc-legend--compact" : "w-full"}`}
        >
          {data.map((item, index) => (
            <li key={item.name} className="ioc-legend-item">
              <span
                className="ioc-legend-dot"
                style={{ background: colorAt(index) }}
              />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HorizontalBarChart({
  data,
  compact = false,
  dense = false,
}: {
  data: ChartDatum[];
  compact?: boolean;
  dense?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = dense ? "space-y-1" : compact ? "space-y-2.5" : "space-y-3";
  return (
    <ul className={gap}>
      {data.map((item, index) => (
        <li key={item.name}>
          <div
            className={`flex items-center justify-between gap-2 ${
              dense ? "text-[0.6875rem] leading-tight" : compact ? "text-sm" : "text-xs"
            }`}
          >
            <span className="ioc-chart-label truncate">{item.name}</span>
            <span className="ioc-chart-value shrink-0">{item.value}</span>
          </div>
          <div
            className={`ioc-bar-track ${compact || dense ? "ioc-bar-track--sm" : ""} ${dense ? "mt-0.5" : compact ? "mt-1" : ""}`}
          >
            <div
              className="ioc-bar-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${PALETTE[index % PALETTE.length]}aa, ${PALETTE[index % PALETTE.length]})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function VerticalBarChart({
  data,
  compact = false,
}: {
  data: ChartDatum[];
  compact?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`ioc-col-chart ${compact ? "ioc-col-chart--compact" : ""}`}>
      <div className="ioc-col-chart-bars">
        {data.map((item, index) => (
          <div key={item.name} className="ioc-col-chart-item">
            <span className="ioc-col-chart-value">{item.value}</span>
            <div className="ioc-col-chart-track">
              <div
                className="ioc-col-chart-bar"
                style={{
                  height: `${Math.max(6, (item.value / max) * 100)}%`,
                  background: `linear-gradient(180deg, ${PALETTE[index % PALETTE.length]}ee, ${PALETTE[index % PALETTE.length]}99)`,
                }}
              />
            </div>
            <span className="ioc-col-chart-label" title={item.name}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  compact = false,
  color = "#22c55e",
}: {
  data: ChartDatum[];
  compact?: boolean;
  color?: string;
}) {
  const width = 320;
  const height = compact ? 160 : 180;
  const padL = 34;
  const padR = 10;
  const padT = 16;
  const padB = compact ? 36 : 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gridSteps = 3;

  const points = data.map((item, i) => {
    const x =
      padL +
      (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padT + chartH - (item.value / max) * chartH;
    return { x, y, item };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
      : "";

  return (
    <div className={`ioc-line-chart ${compact ? "ioc-line-chart--compact" : ""}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="ioc-line-chart-svg"
        role="img"
        aria-label="Biểu đồ đường diện tích vùng sản xuất"
      >
        {Array.from({ length: gridSteps + 1 }, (_, i) => {
          const y = padT + (chartH / gridSteps) * i;
          const val = Math.round(max - (max / gridSteps) * i);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={padL + chartW}
                y2={y}
                className="ioc-line-chart-grid"
              />
              <text
                x={padL - 5}
                y={y + 3}
                textAnchor="end"
                className="ioc-line-chart-axis-y"
                fontSize={12}
                fontWeight="600"
              >
                {val}
              </text>
            </g>
          );
        })}

        {areaPath && (
          <path d={areaPath} fill={`${color}22`} stroke="none" />
        )}

        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => (
          <g key={p.item.name}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#fff" stroke={PALETTE[i % PALETTE.length]} strokeWidth="2.5" />
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              className="ioc-line-chart-point-value"
              fontSize={13}
              fontWeight="700"
            >
              {p.item.value}
            </text>
            <text
              x={p.x}
              y={padT + chartH + 15}
              textAnchor="middle"
              className="ioc-line-chart-axis-x"
              fontSize={11}
              fontWeight="600"
            >
              <title>{p.item.name}</title>
              {p.item.name.length > 11 ? `${p.item.name.slice(0, 10)}…` : p.item.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function GroupedBarChart({
  data,
  compact = false,
}: {
  data: FinancialCompareRow[];
  compact?: boolean;
}) {
  const max = Math.max(
    ...data.flatMap((row) => [row.cost, row.revenue, row.profit]),
    1,
  );

  return (
    <div className={compact ? "space-y-1.5" : "space-y-4"}>
      {data.map((row) => (
        <div key={row.label} className="flex items-end gap-1.5">
          <p className={`ioc-chart-group-title shrink-0 ${compact ? "ioc-chart-group-title--compact" : "w-16"}`}>
            {row.label}
          </p>
          <div className="grid flex-1 grid-cols-3 gap-1">
            {(
              [
                ["CP", row.cost, "#f97316"],
                ["TN", row.revenue, "#22c55e"],
                ["LN", row.profit, "#0ea5e9"],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="text-center">
                <div className={`ioc-vbar-wrap ${compact ? "ioc-vbar-wrap--sm" : ""}`}>
                  <div
                    className="ioc-vbar"
                    style={{
                      height: `${Math.max(6, (value / max) * 100)}%`,
                      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                    }}
                  />
                </div>
                <p className="ioc-chart-stat-label">{label}</p>
                <p className={`ioc-chart-stat-value ${compact ? "text-xs" : ""}`}>
                  {formatNumber(value, 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectorDistributionChart({
  data,
  total,
}: {
  data: ChartDatum[];
  total: number;
}) {
  return (
    <div className="ioc-sector-donut">
      <DonutChart
        data={data}
        mini
        size={108}
        hideLegend
        centerLabel={total}
        centerSubLabel="tổ chức"
        centerFontSize={11}
        centerSubFontSize={7}
        className="ioc-sector-donut-chart"
      />
      <ul className="ioc-legend ioc-sector-donut-legend">
        {data.map((item, index) => (
          <li key={item.name} className="ioc-legend-item">
            <span
              className="ioc-legend-dot"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            <span className="ioc-sector-donut-label" title={item.name}>
              {item.name}
            </span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinancialDonutChart({ data }: { data: FinancialCompareRow[] }) {
  const sliceColors = ["#f97316", "#0ea5e9"] as const;
  const entityLabel = (label: string) => {
    if (label === "HTX") return "Hợp tác xã";
    if (label === "THT") return "Tổ hợp tác";
    return label;
  };

  return (
    <div className="ioc-fin-donut">
      <div className="ioc-fin-donut-charts">
        {data.map((row) => (
          <div key={row.label} className="ioc-fin-donut-item">
            <DonutChart
              data={[
                { name: "Chi phí", value: row.cost },
                { name: "Lợi nhuận", value: row.profit },
              ]}
              mini
              size={108}
              colors={[...sliceColors]}
              centerLabel={formatNumber(row.revenue, 0)}
              centerSubLabel="Doanh thu"
              centerFontSize={11}
              centerSubFontSize={7}
              hideLegend
              className="ioc-fin-donut-chart"
            />
            <p className="ioc-fin-donut-entity">{entityLabel(row.label)}</p>
          </div>
        ))}
      </div>
      <div className="ioc-fin-donut-legend" aria-hidden>
        <span className="ioc-fin-legend-item">
          <span className="ioc-fin-dot ioc-fin-dot--cost" /> Chi phí
        </span>
        <span className="ioc-fin-legend-item">
          <span className="ioc-fin-dot ioc-fin-dot--profit" /> Lợi nhuận
        </span>
      </div>
    </div>
  );
}

export function MiniFinancialBarChart({ data }: { data: FinancialCompareRow[] }) {
  const max = Math.max(
    ...data.flatMap((row) => [row.cost, row.revenue, row.profit]),
    1,
  );

  const metrics = [
    ["CP", "cost", "#f97316"] as const,
    ["TN", "revenue", "#22c55e"] as const,
    ["LN", "profit", "#0ea5e9"] as const,
  ];

  return (
    <div className="ioc-fin-bars-mini">
      <div className="ioc-fin-bars-legend" aria-hidden>
        {metrics.map(([label, , color]) => (
          <span key={label} className="ioc-fin-legend-item">
            <span className="ioc-fin-dot" style={{ background: color }} /> {label}
          </span>
        ))}
      </div>
      <div className="ioc-fin-bars-rows">
        {data.map((row) => (
          <div key={row.label} className="ioc-fin-bars-row">
            <span className="ioc-fin-bars-label">{row.label}</span>
            <div className="ioc-fin-bars-group">
              {metrics.map(([label, key, color]) => {
                const value = row[key];
                return (
                  <div key={label} className="ioc-fin-bars-cell">
                    <div className="ioc-fin-bars-track">
                      <div
                        className="ioc-fin-bars-bar"
                        style={{
                          height: `${Math.max(8, (value / max) * 100)}%`,
                          background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                        }}
                      />
                    </div>
                    <span className="ioc-fin-bars-val">{formatNumber(value, 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompactFinancialChart({ data }: { data: FinancialCompareRow[] }) {
  return (
    <div className="ioc-fin-compact">
      <div className="ioc-fin-legend" aria-hidden>
        <span className="ioc-fin-legend-item">
          <span className="ioc-fin-dot ioc-fin-dot--cost" /> CP
        </span>
        <span className="ioc-fin-legend-item">
          <span className="ioc-fin-dot ioc-fin-dot--rev" /> TN
        </span>
        <span className="ioc-fin-legend-item">
          <span className="ioc-fin-dot ioc-fin-dot--profit" /> LN
        </span>
      </div>
      {data.map((row) => (
        <div key={row.label} className="ioc-fin-row">
          <span className="ioc-fin-label">{row.label}</span>
          <div className="ioc-fin-metrics">
            <span className="ioc-fin-metric ioc-fin-metric--cost" title="Chi phí">
              {formatNumber(row.cost, 0)}
            </span>
            <span className="ioc-fin-metric ioc-fin-metric--rev" title="Doanh thu">
              {formatNumber(row.revenue, 0)}
            </span>
            <span className="ioc-fin-metric ioc-fin-metric--profit" title="Lợi nhuận">
              {formatNumber(row.profit, 0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

type TopRevenueItem = {
  name: string;
  value: number;
  type: string;
};

function shortenOrgName(name: string): string {
  const wardSuffix = new RegExp(`\\s+${escapeRegExp(wardConfig.name)}$`, "i");
  return name
    .replace(/^HTX NN\s+/i, "")
    .replace(/^HTX\s+/i, "")
    .replace(/^THT\s+/i, "")
    .replace(wardSuffix, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function TopRevenueChart({
  data,
  limit = 5,
}: {
  data: { name: string; value: number | null; type: string }[];
  compact?: boolean;
  limit?: number;
}) {
  const items = useMemo<TopRevenueItem[]>(
    () =>
      data
        .filter((d) => d.value != null && (d.value ?? 0) > 0)
        .slice(0, limit)
        .map((d) => ({
          name: d.name,
          value: d.value ?? 0,
          type: d.type,
        })),
    [data, limit],
  );

  if (items.length === 0) {
    return <p className="text-xs text-muted">Không có dữ liệu thu nhập</p>;
  }

  const leaderValue = items[0].value;
  const maxSqrt = Math.sqrt(leaderValue);

  return (
    <ul className="ioc-top-revenue-rank">
      {items.map((item, index) => {
        const rank = index + 1;
        const barWidth = Math.max(
          8,
          Math.round((Math.sqrt(item.value) / maxSqrt) * 100),
        );

        return (
          <li
            key={`${item.name}-${rank}`}
            className={`ioc-top-revenue-rank-item ${
              rank === 1 ? "ioc-top-revenue-rank-item--leader" : ""
            }`}
          >
            <div className="ioc-top-revenue-rank-head">
              <span
                className={`ioc-top-revenue-rank-badge ${
                  rank <= 3
                    ? `ioc-top-revenue-rank-badge--${rank}`
                    : "ioc-top-revenue-rank-badge--default"
                }`}
              >
                {rank}
              </span>
              <div className="ioc-top-revenue-rank-info">
                <span
                  className="ioc-top-revenue-rank-name"
                  title={item.name}
                >
                  {shortenOrgName(item.name)}
                </span>
                <span className="ioc-top-revenue-rank-type">{item.type}</span>
              </div>
              <span className="ioc-top-revenue-rank-value">
                {formatNumber(item.value, 0)}
              </span>
            </div>
            <div className="ioc-top-revenue-rank-bar" aria-hidden>
              <div
                className={`ioc-top-revenue-rank-bar-fill ${
                  rank === 1 ? "ioc-top-revenue-rank-bar-fill--leader" : ""
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ForecastAreaChart({
  data,
  unit = "tỷ đ",
}: {
  data: ForecastPoint[];
  unit?: string;
}) {
  const width = 320;
  const height = 168;
  const padL = 30;
  const padR = 12;
  const padT = 18;
  const padB = 34;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gridSteps = 3;

  const pts = data.map((item, i) => {
    const x =
      padL + (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padT + chartH - (item.value / max) * chartH;
    return { x, y, item };
  });

  const firstForecast = pts.findIndex((p) => p.item.forecast);
  const splitIdx = firstForecast <= 0 ? pts.length : firstForecast;
  const actualPts = pts.slice(0, splitIdx);
  const forecastPts = pts.slice(Math.max(0, splitIdx - 1));

  const toPath = (arr: typeof pts) =>
    arr
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

  const actualLine = toPath(actualPts);
  const forecastLine = toPath(forecastPts);
  const areaPath =
    actualPts.length > 0
      ? `${actualLine} L ${actualPts[actualPts.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${actualPts[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
      : "";

  return (
    <div className="ioc-forecast-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="ioc-forecast-svg" role="img" aria-label="Dự báo sản lượng">
        {Array.from({ length: gridSteps + 1 }, (_, i) => {
          const y = padT + (chartH / gridSteps) * i;
          const val = max - (max / gridSteps) * i;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} className="ioc-line-chart-grid" />
              <text x={padL - 5} y={y + 3} textAnchor="end" className="ioc-line-chart-axis-y" fontSize={10} fontWeight="600">
                {val >= 10 ? Math.round(val) : Math.round(val * 10) / 10}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="#22c55e22" stroke="none" />}
        {actualPts.length > 1 && (
          <path d={actualLine} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {forecastPts.length > 1 && (
          <path d={forecastLine} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {pts.map((p) => (
          <g key={p.item.name}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={p.item.forecast ? "#0ea5e9" : "#16a34a"} strokeWidth="2" />
            <text x={p.x} y={padT + chartH + 14} textAnchor="middle" className="ioc-line-chart-axis-x" fontSize={9} fontWeight="600">
              {p.item.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="ioc-forecast-legend">
        <span className="ioc-forecast-legend-item">
          <span className="ioc-forecast-dot" style={{ background: "#16a34a" }} /> Thực tế
        </span>
        <span className="ioc-forecast-legend-item">
          <span className="ioc-forecast-dot ioc-forecast-dot--dash" /> Dự báo
        </span>
        <span className="ioc-forecast-unit">Đơn vị: {unit}</span>
      </div>
    </div>
  );
}

const SEVERITY_META: Record<AgriAlert["severity"], { label: string; cls: string }> = {
  high: { label: "Khẩn", cls: "ioc-alert--high" },
  medium: { label: "Vừa", cls: "ioc-alert--medium" },
  low: { label: "Thấp", cls: "ioc-alert--low" },
};

export function AlertList({ data }: { data: AgriAlert[] }) {
  return (
    <ul className="ioc-alert-list">
      {data.map((alert) => (
        <li key={alert.id} className={`ioc-alert ${SEVERITY_META[alert.severity].cls}`}>
          <span className="ioc-alert-bar" aria-hidden />
          <div className="ioc-alert-body">
            <p className="ioc-alert-title">{alert.title}</p>
            <div className="ioc-alert-meta">
              <span className="ioc-alert-badge">{SEVERITY_META[alert.severity].label}</span>
              <span className="ioc-alert-area">{alert.area}</span>
              <span className="ioc-alert-time">{alert.time}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const FEEDBACK_META: Record<CitizenFeedback["status"], { label: string; cls: string }> = {
  resolved: { label: "Đã xử lý", cls: "ioc-fb--resolved" },
  processing: { label: "Đang xử lý", cls: "ioc-fb--processing" },
  new: { label: "Mới", cls: "ioc-fb--new" },
};

const FEEDBACK_CHART_COLORS = ["#22c55e", "#f59e0b", "#3b82f6"] as const;

const FEEDBACK_STATUS_ORDER: CitizenFeedback["status"][] = [
  "resolved",
  "processing",
  "new",
];

export function FeedbackList({
  data,
  stats,
}: {
  data: CitizenFeedback[];
  stats: { total: number; resolved: number; processing: number; new: number };
}) {
  const chartData = FEEDBACK_STATUS_ORDER.map((status) => ({
    name: FEEDBACK_META[status].label,
    value: stats[status],
  })).filter((item) => item.value > 0);

  const chartColors = FEEDBACK_STATUS_ORDER.map((status, index) => ({
    status,
    color: FEEDBACK_CHART_COLORS[index],
  }))
    .filter(({ status }) => stats[status] > 0)
    .map(({ color }) => color);

  const recentItems = data.slice(0, 3);

  return (
    <div className="ioc-feedback ioc-feedback--split">
      {chartData.length > 0 ? (
        <div className="ioc-feedback-chart-row">
          <DonutChart
            data={chartData}
            compact
            wide
            size={96}
            colors={chartColors}
            centerLabel={stats.total}
            centerSubLabel="phản ánh"
            className="ioc-feedback-donut"
          />
        </div>
      ) : (
        <p className="text-xs text-muted">Chưa có phản ánh</p>
      )}

      {recentItems.length > 0 && (
        <ul className="ioc-feedback-list ioc-feedback-list--compact">
          {recentItems.map((item) => (
            <li key={item.id} className="ioc-feedback-item ioc-feedback-item--compact">
              <span className={`ioc-fb-dot ${FEEDBACK_META[item.status].cls}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="ioc-feedback-title ioc-feedback-title--compact">
                  {item.title}
                </p>
                <div className="ioc-feedback-meta ioc-feedback-meta--compact">
                  <span
                    className={`ioc-feedback-badge ${FEEDBACK_META[item.status].cls}`}
                  >
                    {FEEDBACK_META[item.status].label}
                  </span>
                  <span className="ioc-feedback-area">{item.area}</span>
                  <span className="ioc-feedback-time">{item.time}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RadialKpiRing({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="ioc-ring-card">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="44" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="700">
          {formatNumber(value, 0)}
        </text>
        <text x="48" y="58" textAnchor="middle" fill="#64748b" fontSize="9">
          {unit}
        </text>
      </svg>
      <p className="ioc-ring-label">{label}</p>
    </div>
  );
}
