"use client";

import { useRef, useState } from "react";
import {
  allReviewableWidgetTypes,
  describeWidgetFields,
  describeWidgetProfileEvidence,
  describeWidgetPurpose,
  normalizeTemplateWidgetType,
  recommendWidgetTypes,
} from "@/lib/dashboard/ai/widget-review";
import { isNoDataWidget } from "@/lib/dashboard/no-data-widgets";
import type { DashboardTemplateWidget } from "@/lib/dashboard/templates";
import { WIDGET_TYPE_LABELS } from "@/lib/dashboard/utils";
import type { WidgetType } from "@/types/api/dashboard";
import type { DashboardAiDataProfile } from "@/lib/dashboard/ai/data-profiling";

interface DashboardAiWidgetReviewProps {
  widgets: DashboardTemplateWidget[];
  enabledWidgetIds: Set<string>;
  onWidgetsChange: (widgets: DashboardTemplateWidget[]) => void;
  onEnabledWidgetIdsChange: (ids: Set<string>) => void;
  dataProfiles?: DashboardAiDataProfile[];
}

function WidgetMockPreview({ widgetType }: { widgetType: WidgetType }) {
  if (widgetType === "stat" || widgetType === "progress_ring") {
    return (
      <div className="flex h-full items-center gap-3">
        <span className="h-9 w-9 rounded-lg bg-sky-100" />
        <div className="min-w-0 flex-1">
          <span className="block h-2 w-20 rounded bg-slate-200" />
          <span className="mt-2 block h-5 w-24 rounded bg-slate-700" />
        </div>
      </div>
    );
  }
  if (["pie", "donut", "treemap"].includes(widgetType)) {
    return (
      <div className="flex h-full items-center justify-center gap-4">
        <span className={`h-14 w-14 rounded-full border-[12px] border-sky-400 border-r-amber-300 ${widgetType === "pie" ? "" : "bg-white"}`} />
        <div className="space-y-2"><span className="block h-2 w-14 rounded bg-slate-300" /><span className="block h-2 w-10 rounded bg-slate-200" /></div>
      </div>
    );
  }
  if (["bar", "ranking", "spatial_ranking"].includes(widgetType)) {
    return <div className="flex h-full items-end gap-2 px-3"><span className="h-7 flex-1 rounded-t bg-sky-200" /><span className="h-12 flex-1 rounded-t bg-sky-400" /><span className="h-9 flex-1 rounded-t bg-emerald-300" /><span className="h-16 flex-1 rounded-t bg-amber-300" /></div>;
  }
  if (widgetType === "line") {
    return <div className="relative h-full overflow-hidden"><span className="absolute left-2 top-12 h-0.5 w-16 rotate-[-18deg] bg-sky-500" /><span className="absolute left-16 top-8 h-0.5 w-20 rotate-[12deg] bg-sky-500" /><span className="absolute left-32 top-7 h-0.5 w-14 rotate-[-22deg] bg-sky-500" /></div>;
  }
  if (["minimap", "map", "thematic_map", "spatial_summary", "spatial_alert"].includes(widgetType)) {
    return <div className="h-full rounded bg-emerald-50 p-2"><div className="h-full rounded border border-emerald-200 bg-[linear-gradient(135deg,#d1fae5_25%,#e0f2fe_25%,#e0f2fe_50%,#fef3c7_50%,#fef3c7_75%,#dcfce7_75%)]" /></div>;
  }
  return (
    <div className="space-y-2 py-1">
      {["w-full", "w-5/6", "w-3/4"].map((width) => (
        <div key={width} className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-slate-200" /><span className={`h-2 ${width} rounded bg-slate-200`} /></div>
      ))}
    </div>
  );
}

export function DashboardAiWidgetReview({
  widgets,
  enabledWidgetIds,
  onWidgetsChange,
  onEnabledWidgetIdsChange,
  dataProfiles = [],
}: DashboardAiWidgetReviewProps) {
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const allTypes = allReviewableWidgetTypes();
  const originalWidgets = useRef(
    new Map(widgets.map((widget) => [widget.templateWidgetId, widget])),
  );

  function changeWidgetType(widget: DashboardTemplateWidget, widgetType: WidgetType) {
    const baseline = originalWidgets.current.get(widget.templateWidgetId) ?? widget;
    const normalized = normalizeTemplateWidgetType(baseline, widgetType);
    normalized.widget.widgetTypeReason =
      recommendWidgetTypes(baseline, dataProfiles).find((item) => item.widgetType === widgetType)
        ?.reason ?? `Người dùng chọn ${WIDGET_TYPE_LABELS[widgetType] ?? widgetType} trong bước review.`;
    onWidgetsChange(
      widgets.map((item) =>
        item.templateWidgetId === widget.templateWidgetId ? normalized.widget : item,
      ),
    );
    setWarnings((current) => ({
      ...current,
      [widget.templateWidgetId]: normalized.warnings,
    }));
  }

  function toggleWidget(widgetId: string) {
    const next = new Set(enabledWidgetIds);
    if (next.has(widgetId)) next.delete(widgetId);
    else next.add(widgetId);
    onEnabledWidgetIdsChange(next);
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Xem lại widget</p>
          <p className="mt-1 text-xs text-slate-500">
            AI đề xuất loại hiển thị; bạn có thể đổi hoặc tắt widget trước khi map dữ liệu thật.
          </p>
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          {enabledWidgetIds.size}/{widgets.length} widget đang bật
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {widgets.map((widget) => {
          const enabled = enabledWidgetIds.has(widget.templateWidgetId);
          const recommended = recommendWidgetTypes(widget, dataProfiles);
          const profileReason = describeWidgetProfileEvidence(widget, dataProfiles);
          const recommendedTypes = new Set(recommended.map((item) => item.widgetType));
          return (
            <article
              key={widget.templateWidgetId}
              className={`min-w-0 rounded-xl border p-3 transition ${enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <label className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleWidget(widget.templateWidgetId)}
                    aria-label={`Sử dụng widget ${widget.title}`}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span className="sr-only">Sử dụng widget này</span>
                </label>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{widget.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{describeWidgetPurpose(widget)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {enabled ? "Đang bật" : "Đã tắt"}
                </span>
              </div>

              <div className="mt-3 h-24 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3">
                <WidgetMockPreview widgetType={widget.widgetType} />
              </div>

              <label className="mt-3 block text-xs font-medium text-slate-700">
                Kiểu widget
                <select
                  value={widget.widgetType}
                  disabled={!enabled}
                  onChange={(event) => changeWidgetType(widget, event.target.value as WidgetType)}
                  className="ioc-select mt-1"
                >
                  <optgroup label="Được đề xuất">
                    {recommended.map((item) => (
                      <option key={item.widgetType} value={item.widgetType}>{item.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Loại tiện ích khác">
                    {allTypes.filter((item) => !recommendedTypes.has(item.widgetType)).map((item) => (
                      <option key={item.widgetType} value={item.widgetType}>{item.label}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <dl className="mt-3 space-y-2 text-xs">
                <div><dt className="font-medium text-slate-700">Trường/chỉ số dự kiến</dt><dd className="mt-0.5 break-words text-slate-500">{describeWidgetFields(widget)}</dd></div>
                <div><dt className="font-medium text-slate-700">Lý do chọn</dt><dd className="mt-0.5 text-slate-500">{widget.widgetTypeReason || recommended.find((item) => item.widgetType === widget.widgetType)?.reason || `Phù hợp cách hiển thị ${WIDGET_TYPE_LABELS[widget.widgetType] ?? widget.widgetType}.`}</dd></div>
                {profileReason ? <div><dt className="font-medium text-sky-700">Nhận định từ dữ liệu</dt><dd className="mt-0.5 text-sky-700">{profileReason}</dd></div> : null}
              </dl>

              {isNoDataWidget(widget.widgetType) ? (
                <p className="mt-3 rounded-lg bg-sky-50 px-2.5 py-2 text-xs text-sky-700">Không cần dữ liệu analytics; Wizard sẽ không yêu cầu map field.</p>
              ) : null}
              {warnings[widget.templateWidgetId]?.map((warning) => (
                <p key={warning} className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-700">{warning}</p>
              ))}
            </article>
          );
        })}
      </div>

      {enabledWidgetIds.size === 0 ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">Cần bật ít nhất một widget để tiếp tục.</p>
      ) : null}
    </section>
  );
}
