"use client";

import { Component, type ReactNode } from "react";
import {
  WidgetDataContent,
  withAnalyticsFieldLabels,
} from "@/components/dashboard/dashboard-widget-card";
import {
  isGroupedAnalyticsResult,
  isRecordsAnalyticsResult,
  isTopAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";
import type { DashboardTemplateWidget } from "@/lib/dashboard/templates";
import { isNoDataWidget } from "@/lib/dashboard/no-data-widgets";

export type TemplateWidgetPreviewStatus =
  | "incomplete"
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "disabled"
  | "no_data";

export interface TemplateWidgetPreviewState {
  status: TemplateWidgetPreviewStatus;
  message: string;
  result?: AnalyticsResult;
}

interface TemplatePreviewCardProps {
  templateWidget: DashboardTemplateWidget;
  resolvedWidget?: DashboardWidget;
  state?: TemplateWidgetPreviewState;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class TemplatePreviewErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (previousProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function previewStatusClass(status: TemplateWidgetPreviewStatus) {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "empty") return "bg-amber-50 text-amber-700";
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "loading") return "bg-sky-50 text-sky-700";
  if (status === "disabled") return "bg-slate-100 text-slate-500";
  if (status === "no_data") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function previewStatusLabel(status: TemplateWidgetPreviewStatus) {
  if (status === "success") return "Thành công";
  if (status === "empty") return "Không có dữ liệu";
  if (status === "error") return "Lỗi";
  if (status === "loading") return "Đang tải";
  if (status === "disabled") return "Đã tắt";
  if (status === "no_data") return "Không cần dữ liệu";
  return "Chưa đủ cấu hình";
}

function formatPreviewNumber(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return String(value ?? "");
  return number.toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

function MiniPreview({
  widget,
  state,
  detail,
}: {
  widget: Pick<DashboardWidget, "widgetType">;
  state?: TemplateWidgetPreviewState;
  detail?: string;
}) {
  if (state?.status === "loading") {
    return (
      <div className="mt-2 space-y-2 rounded-lg bg-white px-3 py-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (state?.status === "disabled") {
    return (
      <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
        Widget này đã tắt và sẽ không được tạo.
      </div>
    );
  }

  if (state?.status === "no_data") {
    return (
      <div className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
        {detail ?? state.message}
      </div>
    );
  }

  if (state?.status === "incomplete") {
    return (
      <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        Chưa đủ cấu hình
      </div>
    );
  }

  if (state?.status === "error") {
    return (
      <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        {detail ?? state.message}
      </div>
    );
  }

  if (state?.status === "empty") {
    return (
      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Không có dữ liệu preview
      </div>
    );
  }

  const result = state?.result;
  if (!result) {
    return (
      <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
        {detail ?? state?.message ?? "Chưa có bản xem trước"}
      </div>
    );
  }

  if ("value" in result) {
    return (
      <div className="mt-2 rounded-lg bg-white px-3 py-2">
        <p className="text-[11px] text-muted">KPI</p>
        <p className="text-lg font-semibold text-foreground">
          {formatPreviewNumber(result.value)}
        </p>
      </div>
    );
  }

  if (isGroupedAnalyticsResult(result)) {
    const total = result.rows.reduce(
      (sum, row) => sum + Number(row.value ?? 0),
      0,
    );
    return (
      <div className="mt-2 space-y-1 rounded-lg bg-white px-3 py-2">
        {result.rows.slice(0, 3).map((row) => {
          const percent =
            total > 0 ? Math.round((Number(row.value) / total) * 100) : 0;
          return (
            <div
              key={`${row.rawLabel}-${row.label}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate text-slate-700">
                {row.label || row.rawLabel}
              </span>
              <span className="shrink-0 font-medium text-slate-900">
                {formatPreviewNumber(row.value)}
                {widget.widgetType === "pie" || widget.widgetType === "donut"
                  ? ` · ${percent}%`
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (isTopAnalyticsResult(result) || isRecordsAnalyticsResult(result)) {
    if (widget.widgetType === "alert_center" || widget.widgetType === "spatial_alert") {
      return (
        <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
          {result.records.length} cảnh báo
        </div>
      );
    }
    return (
      <div className="mt-2 space-y-1 rounded-lg bg-white px-3 py-2">
        {result.records.slice(0, 3).map((record, index) => {
          const values = Object.values(record)
            .filter((value) => value !== null && value !== undefined && value !== "")
            .slice(0, 3)
            .join(" · ");
          return (
            <div key={index} className="truncate text-xs text-slate-700">
              {widget.widgetType === "ranking" ? `${index + 1}. ` : ""}
              {values || `Dòng ${index + 1}`}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export function TemplatePreviewCard({
  templateWidget,
  resolvedWidget,
  state,
  enabled = true,
  onToggle,
}: TemplatePreviewCardProps) {
  const status = enabled ? (state?.status ?? "incomplete") : "disabled";
  const fallback = (
    <MiniPreview
      widget={resolvedWidget ?? templateWidget}
      state={state}
      detail="Bộ hiển thị xem trước bị lỗi, đang dùng bản tóm tắt."
    />
  );

  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        enabled ? "bg-slate-50" : "bg-slate-100/70 opacity-75"
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <label className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onToggle?.(event.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-border"
            />
            <span className="truncate font-medium">{templateWidget.title}</span>
          </label>
          <p className="text-xs text-muted">{templateWidget.widgetType}</p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-medium ${previewStatusClass(
              status,
            )}`}
          >
            {previewStatusLabel(status)}
          </span>
          <span className="text-xs text-muted">
            {enabled
              ? state?.message ??
                (isNoDataWidget(templateWidget.widgetType)
                  ? "Không cần dữ liệu"
                  : "Chưa đủ cấu hình")
              : "Đã tắt"}
          </span>
          <span className="text-xs text-muted">
            {templateWidget.layoutConfig.w}x{templateWidget.layoutConfig.h}
          </span>
        </div>
      </div>

      {status === "success" && state?.result && resolvedWidget ? (
        <div className="mt-2 max-h-[18rem] overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
          <TemplatePreviewErrorBoundary fallback={fallback}>
            <div className="h-[14rem] min-w-0 overflow-hidden">
              <WidgetDataContent
                widget={withAnalyticsFieldLabels(resolvedWidget, state.result)}
                data={state.result}
              />
            </div>
          </TemplatePreviewErrorBoundary>
        </div>
      ) : (
        fallback
      )}
    </div>
  );
}
