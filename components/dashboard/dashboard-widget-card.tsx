"use client";

import Link from "next/link";
import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { previewAnalytics } from "@/lib/api/analytics";
import {
  isTopAnalyticsResult,
  type AnalyticsResult,
  type DashboardWidget,
} from "@/types/api/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BarChartWidgetRenderer,
  KpiWidgetRenderer,
  LineChartWidgetRenderer,
  PieChartWidgetRenderer,
  RankingWidgetRenderer,
  TableWidgetRenderer,
  WidgetEmptyState,
  WidgetPanel,
} from "./widget-renderers";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
}

export function DashboardWidgetCard({ widget }: DashboardWidgetCardProps) {
  return (
    <WidgetErrorBoundary widget={widget}>
      <DashboardWidgetContent widget={widget} />
    </WidgetErrorBoundary>
  );
}

function DashboardWidgetContent({ widget }: DashboardWidgetCardProps) {
  if (widget.widgetType === "text") return <TextWidget widget={widget} />;
  if (widget.widgetType === "map") return <MapWidget widget={widget} />;
  if (widget.widgetType === "global_filter") return null;
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
        {content ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {content}
          </p>
        ) : (
          <WidgetEmptyState detail="Hãy thêm nội dung trong trình thiết kế widget" />
        )}
      </CardContent>
    </Card>
  );
}

function MapWidget({ widget }: { widget: DashboardWidget }) {
  const layerId = widget.dataSourceConfig?.layerId;
  const viewId = widget.dataSourceConfig?.viewId;
  const href = layerId
    ? `/ban-do?layerId=${layerId}`
    : viewId
      ? `/ban-do?viewId=${viewId}`
      : "/ban-do";

  return (
    <WidgetPanel widget={widget}>
      <p className="text-sm text-muted">Xem dữ liệu trên bản đồ tương tác.</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
      >
        Mở bản đồ
      </Link>
    </WidgetPanel>
  );
}

function AnalyticsWidget({ widget }: { widget: DashboardWidget }) {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      !widget.dataSourceConfig?.datasetId &&
      !widget.dataSourceConfig?.viewId &&
      !widget.dataSourceConfig?.layerId
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- render immediate configuration feedback
      setLoading(false);
      setError("Chưa cấu hình nguồn dữ liệu");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    previewAnalytics({ dataSourceConfig: widget.dataSourceConfig })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không tải được dữ liệu",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [widget.dataSourceConfig]);

  if (loading) return <WidgetLoading widget={widget} />;
  if (error) return <WidgetError widget={widget} message={error} />;
  if (!data) {
    return (
      <WidgetPanel widget={widget}>
        <WidgetEmptyState />
      </WidgetPanel>
    );
  }

  return <WidgetDataContent widget={widget} data={data} />;
}

function WidgetDataContent({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: AnalyticsResult;
}) {
  if (widget.widgetType === "stat") {
    return <KpiWidgetRenderer widget={widget} data={data} />;
  }

  if (
    widget.dataSourceConfig?.aggregation === "top" ||
    isTopAnalyticsResult(data) ||
    widget.displayConfig?.variant === "ranking"
  ) {
    return (
      <WidgetPanel widget={widget}>
        <RankingWidgetRenderer widget={widget} data={data} />
      </WidgetPanel>
    );
  }

  if (widget.widgetType === "bar") {
    return (
      <WidgetPanel widget={widget}>
        <BarChartWidgetRenderer widget={widget} data={data} />
      </WidgetPanel>
    );
  }

  if (widget.widgetType === "line") {
    return (
      <WidgetPanel widget={widget}>
        <LineChartWidgetRenderer widget={widget} data={data} />
      </WidgetPanel>
    );
  }

  if (widget.widgetType === "pie" || widget.widgetType === "donut") {
    return (
      <WidgetPanel widget={widget}>
        <PieChartWidgetRenderer
          widget={widget}
          data={data}
          donut={widget.widgetType === "donut"}
        />
      </WidgetPanel>
    );
  }

  if (widget.widgetType === "table") {
    return (
      <WidgetPanel widget={widget}>
        <TableWidgetRenderer widget={widget} data={data} />
      </WidgetPanel>
    );
  }

  return (
    <WidgetPanel widget={widget}>
      <WidgetEmptyState detail="Kiểu widget này chưa hỗ trợ hiển thị" />
    </WidgetPanel>
  );
}

function WidgetLoading({ widget }: { widget: DashboardWidget }) {
  if (widget.widgetType === "stat") {
    return (
      <article className="ioc-kpi ioc-kpi--slate ioc-kpi--dashboard h-full">
        <div className="ioc-kpi-icon-wrap ioc-skeleton" />
        <div className="ioc-kpi-body space-y-2">
          <div className="ioc-skeleton h-3 w-24 rounded" />
          <div className="ioc-skeleton h-8 w-32 rounded" />
          <div className="ioc-skeleton h-3 w-40 max-w-full rounded" />
        </div>
      </article>
    );
  }
  return (
    <WidgetPanel widget={widget}>
      <div className="space-y-3" aria-label="Đang tải dữ liệu">
        <div className="ioc-skeleton h-4 w-2/3 rounded" />
        <div className="ioc-skeleton h-24 w-full rounded-lg" />
        <div className="ioc-skeleton h-4 w-1/2 rounded" />
      </div>
    </WidgetPanel>
  );
}

function WidgetError({
  widget,
  message,
}: {
  widget: DashboardWidget;
  message: string;
}) {
  return (
    <WidgetPanel widget={widget}>
      <div className="ioc-widget-state ioc-widget-state--error" role="alert">
        <span className="ioc-widget-state-icon" aria-hidden>
          !
        </span>
        <p className="ioc-widget-state-title">Không thể tải widget</p>
        <p className="ioc-widget-state-detail">{message}</p>
        <p className="ioc-widget-state-hint">
          Hãy kiểm tra nguồn dữ liệu hoặc bộ lọc
        </p>
      </div>
    </WidgetPanel>
  );
}

class WidgetErrorBoundary extends Component<
  { widget: DashboardWidget; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard widget render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <WidgetError
          widget={this.props.widget}
          message="Dữ liệu trả về không đúng định dạng mong đợi."
        />
      );
    }
    return this.props.children;
  }
}
