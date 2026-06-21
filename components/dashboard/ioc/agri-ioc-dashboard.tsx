"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { agriDashboardData } from "@/lib/dashboard/agri-data";
import { getCurrentPublishedDashboard } from "@/lib/api/dashboards";
import { DynamicDashboardView } from "@/components/dashboard/dynamic-dashboard-view";
import { IocWeatherStrip } from "@/components/dashboard/ioc/ioc-weather-strip";
import type { DashboardDetail } from "@/types/api/dashboard";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";
import { wardConfig } from "@/config/ward.config";

interface AgriIocDashboardProps {
  mapView?: MapViewConfig | null;
  boundary?: GeoJsonFeatureCollection | null;
  boundaryError?: string | null;
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  return (
    <time className="ioc-clock" dateTime={now.toISOString()}>
      <span className="ioc-clock-date">
        {now.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </span>
      <span className="ioc-clock-sep" aria-hidden>
        ·
      </span>
      <span className="ioc-clock-time">
        {now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </time>
  );
}

export function AgriIocDashboard(_props: AgriIocDashboardProps) {
  void _props;
  const { meta } = agriDashboardData;
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentPublishedDashboard()
      .then((result) => {
        if (!cancelled) setDashboard(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
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
  }, []);

  return (
    <div className="ioc-dashboard ioc-dashboard--command ioc-dashboard--light">
      <div className="ioc-grid-bg" aria-hidden />

      <header className="ioc-header ioc-header--compact ioc-header--command ioc-header--hero ioc-header--with-weather">
        <div className="ioc-header-brand">
          <div className="ioc-logo ioc-logo--sm ioc-logo--command">
            <span className="ioc-logo-icon" aria-hidden>
              🌾
            </span>
          </div>
          <div className="min-w-0">
            <p className="ioc-eyebrow ioc-eyebrow--command">
              OneGis · {wardConfig.locationLabel}
            </p>
            <h1 className="ioc-title ioc-title--hero">{meta.title}</h1>
            <p className="ioc-location ioc-location--sm">
              {meta.ward} · {meta.city}
            </p>
          </div>
        </div>

        <IocWeatherStrip
          lat={wardConfig.center.lat}
          lng={wardConfig.center.lng}
        />

        <div className="ioc-header-meta ioc-header-meta--inline">
          <span className="ioc-status-pill ioc-status-pill--sm ioc-status-pill--command">
            <span className="ioc-status-dot" />
            Trực tuyến
          </span>
          <LiveClock />
          <Link
            href="/ban-do"
            className="ioc-link-btn ioc-link-btn--sm ioc-link-btn--map"
          >
            <span className="ioc-link-btn-text">Bản đồ toàn màn hình</span>
            <span className="ioc-link-btn-short" aria-hidden>
              Bản đồ
            </span>
          </Link>
        </div>
      </header>

      <main className="relative z-[1] px-3 pb-4 sm:px-4">
        {loading ? (
          <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-10 text-center text-sm text-muted shadow-sm">
            Đang tải dashboard...
          </div>
        ) : dashboard ? (
          <DynamicDashboardView dashboard={dashboard} editable={false} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/90 px-4 py-12 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-800">
              Chưa có dashboard nào được xuất bản
            </p>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <Link
              href="/admin/dashboard-builder"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Đi tới Dashboard Builder
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
