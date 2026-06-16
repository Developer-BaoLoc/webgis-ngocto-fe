"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  agriDashboardData,
  formatBillionVnd,
  formatNumber,
  getAgriAlerts,
  getCitizenFeedback,
  getFeedbackStats,
  getRevenueForecast,
} from "@/lib/dashboard/agri-data";
import {
  AlertList,
  DonutChart,
  FeedbackList,
  ForecastAreaChart,
  IocPanel,
  MiniFinancialBarChart,
  TopRevenueChart,
} from "@/components/dashboard/ioc/ioc-charts";
import { IocMapPanel } from "@/components/dashboard/ioc/ioc-map-panel";
import { IocWeatherStrip } from "@/components/dashboard/ioc/ioc-weather-strip";
import {
  KpiIconArea,
  KpiIconHtx,
  KpiIconMembers,
  KpiIconPump,
  KpiIconRevenue,
} from "@/components/dashboard/ioc/kpi-icons";
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
    setNow(new Date());
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

function KpiCard({
  label,
  value,
  unit,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone: "green" | "gold" | "sky" | "lime";
  icon: ReactNode;
}) {
  return (
    <article className={`ioc-kpi ioc-kpi--${tone}`}>
      <div className="ioc-kpi-icon-wrap">{icon}</div>
      <div className="ioc-kpi-body">
        <p className="ioc-kpi-label">{label}</p>
        <p className="ioc-kpi-value">
          {value}
          {unit && <span className="ioc-kpi-unit">{unit}</span>}
        </p>
        {sub && <p className="ioc-kpi-sub">{sub}</p>}
      </div>
    </article>
  );
}

export function AgriIocDashboard({
  mapView = null,
  boundary = null,
  boundaryError = null,
}: AgriIocDashboardProps) {
  const { meta, kpis, charts } = agriDashboardData;
  const sectorTotal = charts.sectorDistribution.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const forecast = getRevenueForecast();
  const alerts = getAgriAlerts();
  const feedback = getCitizenFeedback();
  const feedbackStats = getFeedbackStats();

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
            <p className="ioc-eyebrow ioc-eyebrow--command">OneGis · Phường Long Bình</p>
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
          <Link href="/ban-do" className="ioc-link-btn ioc-link-btn--sm">
            Bản đồ toàn màn hình
          </Link>
        </div>
      </header>

      <section className="ioc-kpi-grid ioc-kpi-grid--hero ioc-kpi-grid--command">
        <KpiCard
          label="Hợp tác xã / Tổ hợp tác"
          value={`${kpis.htxCount} / ${kpis.thtCount}`}
          sub="Tổ chức nông nghiệp"
          tone="green"
          icon={<KpiIconHtx />}
        />
        <KpiCard
          label="Trạm bơm"
          value={kpis.thuyLoiStations}
          sub={`${formatNumber(kpis.irrigationAreaHa, 0)} ha tưới`}
          tone="sky"
          icon={<KpiIconPump />}
        />
        <KpiCard
          label="Diện tích"
          value={formatNumber(kpis.totalLandHa, 0)}
          unit="ha"
          sub={`${kpis.productionZones} vùng sản xuất`}
          tone="lime"
          icon={<KpiIconArea />}
        />
        <KpiCard
          label="Thành viên"
          value={formatNumber(kpis.totalMembers)}
          sub={`${kpis.activeOrgs} tổ chức hoạt động`}
          tone="green"
          icon={<KpiIconMembers />}
        />
        <KpiCard
          label="Doanh thu"
          value={formatBillionVnd(kpis.totalRevenueMillion)}
          sub={`OCOP ${kpis.ocopProducts} sản phẩm`}
          tone="gold"
          icon={<KpiIconRevenue />}
        />
      </section>

      <div className="ioc-command-body">
        <div className="ioc-command-side ioc-command-side--left">
          <IocPanel
            title="Dự báo sản lượng"
            subtitle="Doanh thu nông nghiệp theo quý"
            compact
            command
            className="ioc-side-panel"
          >
            <ForecastAreaChart data={forecast} unit="tỷ đ" />
          </IocPanel>

          <IocPanel
            title="Top thu nhập (triệu đ)"
            compact
            command
            className="ioc-side-panel"
          >
            <TopRevenueChart data={charts.topRevenue} compact limit={5} />
          </IocPanel>
        </div>

        <div className="ioc-command-center">
          <div className="ioc-command-map">
            <IocMapPanel
              mapView={mapView}
              boundary={boundary}
              boundaryError={boundaryError}
            />
          </div>

          <div className="ioc-command-center-charts">
            <IocPanel
              title="Cơ cấu ngành nghề"
              subtitle={`${formatNumber(sectorTotal)} tổ chức`}
              compact
              command
              className="ioc-panel--mini"
            >
              <DonutChart data={charts.sectorDistribution} mini />
            </IocPanel>
            <IocPanel
              title="So sánh tài chính"
              subtitle="triệu đ"
              compact
              command
              className="ioc-panel--mini"
            >
              <MiniFinancialBarChart
                data={charts.financialCompare.filter((row) => row.label !== "Trạm bơm")}
              />
            </IocPanel>
          </div>
        </div>

        <div className="ioc-command-side ioc-command-side--right">
          <IocPanel
            title="Cảnh báo nông nghiệp"
            subtitle={`${alerts.length} cảnh báo cần theo dõi`}
            compact
            command
            className="ioc-side-panel"
          >
            <AlertList data={alerts} />
          </IocPanel>

          <IocPanel
            title="Phản ánh người dân"
            subtitle={`${feedbackStats.total} phản ánh trong tuần`}
            compact
            command
            className="ioc-side-panel"
          >
            <FeedbackList data={feedback} stats={feedbackStats} />
          </IocPanel>
        </div>
      </div>
    </div>
  );
}
