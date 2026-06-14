"use client";

import { useEffect, useState } from "react";
import { previewAnalytics } from "@/lib/api/analytics";
import { formatAnalyticsNumber } from "@/lib/dashboard/utils";
import { isGroupedAnalyticsResult } from "@/types/api/dashboard";
import type {
  AnalyticsResult,
  DashboardWidget,
} from "@/types/api/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import Link from "next/link";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
}

export function DashboardWidgetCard({ widget }: DashboardWidgetCardProps) {
  if (widget.widgetType === "text") {
    return <TextWidget widget={widget} />;
  }

  if (widget.widgetType === "map") {
    return <MapWidget widget={widget} />;
  }

  if (widget.widgetType === "global_filter") {
    return null;
  }

  return <AnalyticsWidget widget={widget} />;
}

function TextWidget({ widget }: { widget: DashboardWidget }) {
  const content = String(widget.displayConfig?.content ?? "");
  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-base font-semibold">{widget.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-foreground">{content || "—"}</p>
      </CardContent>
    </Card>
  );
}

function MapWidget({ widget }: { widget: DashboardWidget }) {
  const layerId = widget.dataSourceConfig?.layerId;
  const href = layerId ? `/ban-do?layerId=${layerId}` : "/ban-do";

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-base font-semibold">{widget.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          Xem dữ liệu trên bản đồ tương tác.
        </p>
        <Link
          href={href}
          className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Mở bản đồ
        </Link>
      </CardContent>
    </Card>
  );
}

function AnalyticsWidget({ widget }: { widget: DashboardWidget }) {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!widget.dataSourceConfig?.layerId) {
      setLoading(false);
      setError("Chưa cấu hình nguồn dữ liệu");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    previewAnalytics({ dataSourceConfig: widget.dataSourceConfig })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [widget.dataSourceConfig]);

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-base font-semibold">{widget.title}</h3>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted">Đang tải...</p>}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && data && (
          <WidgetDataContent widget={widget} data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function WidgetDataContent({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  if (widget.widgetType === "stat") {
    if (isGroupedAnalyticsResult(data)) {
      const total = data.rows.reduce((sum, row) => sum + row.value, 0);
      return <StatValue value={total} widget={widget} />;
    }
    return <StatValue value={data.value} widget={widget} />;
  }

  if (
    widget.widgetType === "bar" ||
    widget.widgetType === "line" ||
    widget.widgetType === "pie" ||
    widget.widgetType === "donut"
  ) {
    if (!isGroupedAnalyticsResult(data)) {
      return (
        <p className="text-sm text-muted">
          Cần cấu hình nhóm theo trường để hiển thị biểu đồ.
        </p>
      );
    }
    return <BarChart rows={data.rows} />;
  }

  if (widget.widgetType === "table") {
    if (!isGroupedAnalyticsResult(data)) {
      return (
        <p className="text-sm text-muted">
          Cần cấu hình nhóm theo trường để hiển thị bảng.
        </p>
      );
    }
    return <GroupTable rows={data.rows} />;
  }

  return <p className="text-sm text-muted">Kiểu widget chưa hỗ trợ hiển thị.</p>;
}

function StatValue({
  value,
  widget,
}: {
  value: number;
  widget: DashboardWidget;
}) {
  const suffix = widget.displayConfig?.suffix
    ? String(widget.displayConfig.suffix)
    : "";

  return (
    <div>
      <p className="text-4xl font-semibold text-foreground">
        {formatAnalyticsNumber(value)}
        {suffix ? (
          <span className="ml-2 text-lg font-medium text-muted">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

function BarChart({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-foreground">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatAnalyticsNumber(row.value)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupTable({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <DataTable minWidth="280px">
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Nhóm</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Giá trị</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={`${row.label}-${row.value}`}>
            <DataTableCell variant="primary">{row.label}</DataTableCell>
            <DataTableCell align="right">
              {formatAnalyticsNumber(row.value)}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
