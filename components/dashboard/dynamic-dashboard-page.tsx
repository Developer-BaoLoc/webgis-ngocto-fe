"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { getPublishedDashboard } from "@/lib/api/dashboards";
import { DynamicDashboardView } from "@/components/dashboard/dynamic-dashboard-view";
import type { DashboardDetail } from "@/types/api/dashboard";

interface DynamicDashboardPageProps {
  dashboardId: string;
}

export function DynamicDashboardPage({
  dashboardId,
}: DynamicDashboardPageProps) {
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getPublishedDashboard(dashboardId)
      .then((result) => {
        if (!cancelled) setDashboard(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setDashboard(null);
          setError(
            err instanceof Error
              ? err.message
              : "Không tải được dashboard đã xuất bản.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboardId]);

  if (loading) {
    return <LoadingIndicator label="Đang tải bảng điều khiển" />;
  }

  if (!dashboard) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        {error || "Bảng điều khiển này chưa được xuất bản."}
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p className="mt-1 text-sm text-muted">{dashboard.description}</p>
          )}
        </div>
        <Link
          href="/quan-tri/dashboard"
          className="self-start rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-slate-50"
        >
          Quản lý dashboard
        </Link>
      </div>

      <DynamicDashboardView dashboard={dashboard} />
    </div>
  );
}
