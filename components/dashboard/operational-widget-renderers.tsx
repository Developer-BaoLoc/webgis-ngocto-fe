"use client";

import { useMemo, useState } from "react";
import { WidgetEmptyState } from "@/components/dashboard/widget-renderers";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";
import { getWidgetFieldLabel } from "@/lib/dashboard/widget-labels";
import { humanizeOptionValue } from "@/lib/fields/field-label";
import {
  isRecordsAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";

type RecordRow = Record<string, unknown>;

const STATUS_DONE_PATTERN =
  /hoan thanh|da xong|da hoan thanh|completed|complete|done|resolved|ket thuc/;

function records(data: AnalyticsResult): RecordRow[] {
  return isRecordsAnalyticsResult(data) ? data.records : [];
}

function text(row: RecordRow, field?: string): string {
  if (!field) return "";
  const value = row[field];
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi-VN");
}

function dateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayStart(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDate(value: unknown, includeTime = false) {
  const date = dateValue(value);
  if (!date) return "Chưa có ngày";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function isDone(value: string) {
  return STATUS_DONE_PATTERN.test(normalize(value));
}

function statusTone(value: string) {
  const normalized = normalize(value);
  if (isDone(value) || /da xu ly|an toan|dat/.test(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (/khan|cao|tre|qua han|nguy hiem|loi/.test(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (/dang|trung binh|cho|can/.test(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function StatusBadge({ value }: { value: string }) {
  if (!value) return null;
  return (
    <span
      className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(value)}`}
      title={value}
    >
      <span className="truncate">{humanizeOptionValue(value)}</span>
    </span>
  );
}

function sortByDate(
  rows: RecordRow[],
  field: string,
  direction: "asc" | "desc",
) {
  return [...rows].sort((left, right) => {
    const leftTime =
      dateValue(left[field])?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime =
      dateValue(right[field])?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
}

export function TimelineWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const config = widget.dataSourceConfig;
  const titleField = config?.titleField ?? "";
  const startField = config?.startDateField ?? "";
  const rows = sortByDate(records(data), startField, "asc");
  if (!rows.length) return <WidgetEmptyState />;

  return (
    <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[0.55rem] before:top-3 before:w-px before:bg-slate-200">
      {rows.map((row, index) => {
        const status = text(row, config?.statusField);
        const group = text(row, config?.groupField);
        return (
          <li key={index} className="relative pl-8">
            <span
              className={`absolute left-0 top-4 h-[1.15rem] w-[1.15rem] rounded-full border-4 border-white ${index % 3 === 0 ? "bg-sky-500" : index % 3 === 1 ? "bg-emerald-500" : "bg-violet-500"}`}
              aria-hidden
            />
            <details className="group rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm open:border-sky-200 open:bg-sky-50/30">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sky-700">
                      {formatDate(row[startField])}
                      {config?.endDateField && row[config.endDateField]
                        ? ` – ${formatDate(row[config.endDateField])}`
                        : ""}
                    </p>
                    <h4
                      className="mt-0.5 truncate text-sm font-semibold text-slate-900"
                      title={text(row, titleField)}
                    >
                      {text(row, titleField) || `Sự kiện ${index + 1}`}
                    </h4>
                  </div>
                  <StatusBadge value={status} />
                </div>
              </summary>
              <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                {group
                  ? `Loại: ${humanizeOptionValue(group)}`
                  : "Nhấn để thu gọn chi tiết."}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

type CalendarTab = "today" | "upcoming" | "overdue" | "done";

const CALENDAR_TABS: Array<{ id: CalendarTab; label: string }> = [
  { id: "today", label: "Hôm nay" },
  { id: "upcoming", label: "Sắp tới" },
  { id: "overdue", label: "Quá hạn" },
  { id: "done", label: "Đã xong" },
];

function workIcon(value: string) {
  const normalized = normalize(value);
  if (/gieo|lua|sa|trong/.test(normalized)) return "🌱";
  if (/bon|phan/.test(normalized)) return "🧺";
  if (/nuoc|ao|thuy/.test(normalized)) return "💧";
  if (/cai tao|ve sinh/.test(normalized)) return "🛠";
  return "📅";
}

export function CalendarWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const [tab, setTab] = useState<CalendarTab>("today");
  const config = widget.dataSourceConfig;
  const dateField = config?.dateField ?? "";
  const allRows = sortByDate(records(data), dateField, "asc");
  const today = dayStart();
  const categorized = useMemo(() => {
    const result: Record<CalendarTab, RecordRow[]> = {
      today: [],
      upcoming: [],
      overdue: [],
      done: [],
    };
    for (const row of allRows) {
      const status = text(row, config?.statusField);
      const date = dateValue(row[dateField]);
      if (isDone(status)) result.done.push(row);
      else if (!date) result.upcoming.push(row);
      else {
        const workDay = dayStart(date);
        if (workDay.getTime() === today.getTime()) result.today.push(row);
        else if (workDay < today) result.overdue.push(row);
        else result.upcoming.push(row);
      }
    }
    return result;
  }, [allRows, config?.statusField, dateField, today]);

  if (!allRows.length) return <WidgetEmptyState />;
  const visible = categorized[tab];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {CALENDAR_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition ${tab === item.id ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {item.label} ({categorized[item.id].length})
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <WidgetEmptyState
          detail={`Không có công việc trong mục “${CALENDAR_TABS.find((item) => item.id === tab)?.label}”`}
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((row, index) => {
            const type = text(row, config?.typeField);
            const status = text(row, config?.statusField);
            return (
              <li
                key={index}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-lg"
                    aria-hidden
                  >
                    {workIcon(type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-sky-700">
                      {formatDate(row[dateField])}
                    </p>
                    <h4
                      className="truncate text-sm font-semibold"
                      title={text(row, config?.titleField)}
                    >
                      {text(row, config?.titleField) ||
                        `Công việc ${index + 1}`}
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {type && (
                        <span className="text-[11px] text-slate-500">
                          {humanizeOptionValue(type)}
                        </span>
                      )}
                      <StatusBadge value={status} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function progressTone(progress: number) {
  if (progress <= 40) return { fill: "bg-rose-500", text: "text-rose-700" };
  if (progress <= 70) return { fill: "bg-amber-500", text: "text-amber-700" };
  return { fill: "bg-emerald-500", text: "text-emerald-700" };
}

function progressValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}

export function ProgressWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const config = widget.dataSourceConfig;
  const rows = records(data);
  if (!rows.length) return <WidgetEmptyState />;
  const today = dayStart();

  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => {
        const progress = progressValue(row[config?.progressField ?? ""]);
        const tone = progressTone(progress);
        const deadline = config?.deadlineField
          ? dateValue(row[config.deadlineField])
          : null;
        const status = text(row, config?.statusField);
        const overdue = Boolean(
          deadline &&
          dayStart(deadline) < today &&
          progress < 100 &&
          !isDone(status),
        );
        return (
          <li
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4
                  className="truncate text-sm font-semibold"
                  title={text(row, config?.titleField)}
                >
                  {text(row, config?.titleField) || `Hạng mục ${index + 1}`}
                </h4>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {text(row, config?.ownerField) || "Chưa phân công"}
                  {deadline ? ` · Hạn ${formatDate(deadline)}` : ""}
                </p>
              </div>
              <strong className={`text-lg tabular-nums ${tone.text}`}>
                {progress}%
              </strong>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              aria-label={`Tiến độ ${progress}%`}
            >
              <div
                className={`h-full rounded-full transition-all ${tone.fill}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <StatusBadge value={status} />
              {overdue && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  ⚠ Quá hạn
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MilestoneWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const config = widget.dataSourceConfig;
  const rows = records(data);
  if (!rows.length) return <WidgetEmptyState />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row, index) => {
        const progress = progressValue(row[config?.progressField ?? ""]);
        const tone = progressTone(progress);
        return (
          <article
            key={index}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span
              className={`absolute inset-y-0 left-0 w-1 ${tone.fill}`}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xl" aria-hidden>
                  🏁
                </span>
                <h4
                  className="mt-1 truncate text-sm font-bold"
                  title={text(row, config?.titleField)}
                >
                  {text(row, config?.titleField) || `Kết quả ${index + 1}`}
                </h4>
              </div>
              <StatusBadge value={text(row, config?.statusField)} />
            </div>
            <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">
              {text(row, config?.resultField) || "Chưa cập nhật kết quả."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${tone.fill}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <strong className={`text-xs ${tone.text}`}>{progress}%</strong>
            </div>
            {(config?.metricFields ?? []).length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                {(config?.metricFields ?? []).map((field) => (
                  <div key={field} className="min-w-0">
                    <dt
                      className="truncate text-[10px] uppercase tracking-wide text-slate-400"
                      title={getWidgetFieldLabel(widget, field)}
                    >
                      {getWidgetFieldLabel(widget, field)}
                    </dt>
                    <dd className="truncate text-sm font-bold text-slate-800">
                      {formatAnalyticsNumber(Number(row[field] ?? 0))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        );
      })}
    </div>
  );
}

const SEVERITY_LABELS: Record<string, string> = {
  thap: "Thấp",
  low: "Thấp",
  trung_binh: "Trung bình",
  medium: "Trung bình",
  cao: "Cao",
  high: "Cao",
  khan_cap: "Khẩn cấp",
  critical: "Khẩn cấp",
  emergency: "Khẩn cấp",
};

function severityLabel(value: string) {
  return (
    SEVERITY_LABELS[normalize(value).replace(/\s+/g, "_")] ??
    humanizeOptionValue(value)
  );
}

export function ActivityHistoryWidgetRenderer({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  const config = widget.dataSourceConfig;
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const allRows = sortByDate(records(data), config?.dateField ?? "", "desc");
  const severities = Array.from(
    new Set(
      allRows.map((row) => text(row, config?.severityField)).filter(Boolean),
    ),
  );
  const statuses = Array.from(
    new Set(
      allRows.map((row) => text(row, config?.statusField)).filter(Boolean),
    ),
  );
  const visible = allRows.filter(
    (row) =>
      (!severityFilter ||
        text(row, config?.severityField) === severityFilter) &&
      (!statusFilter || text(row, config?.statusField) === statusFilter),
  );
  if (!allRows.length) return <WidgetEmptyState />;

  return (
    <div className="space-y-3">
      {(severities.length > 1 || statuses.length > 1) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {severities.length > 1 && (
            <select
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
            >
              <option value="">Tất cả mức độ</option>
              {severities.map((value) => (
                <option key={value} value={value}>
                  {severityLabel(value)}
                </option>
              ))}
            </select>
          )}
          {statuses.length > 1 && (
            <select
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {humanizeOptionValue(value)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <WidgetEmptyState detail="Không có hoạt động phù hợp bộ lọc" />
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-200">
          {visible.map((row, index) => {
            const severity = text(row, config?.severityField);
            const type = text(row, config?.typeField);
            return (
              <li key={index} className="relative pl-7">
                <span
                  className={`absolute left-0.5 top-3 h-3 w-3 rounded-full ring-4 ring-white ${/khan|critical|cao|high/.test(normalize(severity)) ? "bg-rose-500" : /trung|medium/.test(normalize(severity)) ? "bg-amber-500" : "bg-sky-500"}`}
                  aria-hidden
                />
                <article
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  title={text(row, config?.descriptionField)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <time className="text-[11px] font-semibold text-slate-500">
                        {formatDate(row[config?.dateField ?? ""], true)}
                      </time>
                      <h4
                        className="truncate text-sm font-semibold"
                        title={text(row, config?.titleField)}
                      >
                        {text(row, config?.titleField) ||
                          `Hoạt động ${index + 1}`}
                      </h4>
                    </div>
                    {severity && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(severity)}`}
                      >
                        {severityLabel(severity)}
                      </span>
                    )}
                  </div>
                  {text(row, config?.descriptionField) && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                      {text(row, config?.descriptionField)}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge value={text(row, config?.statusField)} />
                    {type && (
                      <span className="text-[11px] text-slate-500">
                        {humanizeOptionValue(type)}
                      </span>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
