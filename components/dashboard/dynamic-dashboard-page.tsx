"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboards,
  getPublishedDashboard,
} from "@/lib/api/dashboards";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DynamicDashboardView } from "@/components/dashboard/dynamic-dashboard-view";
import type { DashboardDetail, DashboardListItem } from "@/types/api/dashboard";

export function DynamicDashboardPage() {
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<DashboardDetail | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (dashboardId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getPublishedDashboard(dashboardId);
      setActiveDashboard(detail);
      setSelectedId(dashboardId);
    } catch (err) {
      setActiveDashboard(null);
      setError(
        err instanceof Error ? err.message : "Không tải được dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const list = await getDashboards();
        if (cancelled) return;
        setDashboards(list);

        const published = list.find((item) => item.hasPublished !== false) ?? list[0];
        if (published) {
          const detail = await getPublishedDashboard(published.id);
          if (!cancelled) {
            setActiveDashboard(detail);
            setSelectedId(published.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDashboards([]);
          setActiveDashboard(null);
          setError(
            err instanceof Error ? err.message : "Không tải được dashboard",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Đang tải dashboard...</p>;
  }

  if (!activeDashboard) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}. Đang hiển thị tổng quan mặc định.
          </div>
        )}
        <DashboardOverview />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {activeDashboard.name}
          </h2>
          {activeDashboard.description && (
            <p className="mt-1 text-sm text-muted">
              {activeDashboard.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dashboards.length > 1 && (
            <select
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              value={selectedId ?? ""}
              onChange={(e) => void loadDashboard(e.target.value)}
            >
              {dashboards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/quan-tri/dashboard"
            className="rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-slate-50"
          >
            Quản lý dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DynamicDashboardView dashboard={activeDashboard} />
    </div>
  );
}
