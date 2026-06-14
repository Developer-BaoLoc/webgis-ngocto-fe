"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  agriDashboardData,
  formatBillionVnd,
  formatNumber,
} from "@/lib/dashboard/agri-data";
import {
  DonutChart,
  GroupedBarChart,
  HorizontalBarChart,
  VerticalBarChart,
  LineChart,
  IocPanel,
  TopRevenueChart,
} from "@/components/dashboard/ioc/ioc-charts";
import {
  KpiIconArea,
  KpiIconHtx,
  KpiIconMembers,
  KpiIconModel,
  KpiIconOcop,
  KpiIconPump,
  KpiIconRevenue,
  KpiIconTht,
} from "@/components/dashboard/ioc/kpi-icons";

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
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
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
      </div>
    </article>
  );
}

export function AgriIocDashboard() {
  const { meta, kpis, charts, highlights } = agriDashboardData;

  const productionZoneLand = charts.productionZones
    .filter((z) => z.landHa != null && z.landHa > 0)
    .map((z) => ({
      name: z.name.replace(/^Vùng chuyên\s+/i, ""),
      value: z.landHa as number,
    }));

  return (
    <div className="ioc-dashboard ioc-dashboard--single">
      <div className="ioc-grid-bg" aria-hidden />

      <header className="ioc-header ioc-header--compact">
        <div className="ioc-header-brand">
          <div className="ioc-logo ioc-logo--sm">
            <span className="ioc-logo-icon" aria-hidden>
              🌾
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="ioc-title ioc-title--sm">{meta.title}</h1>
            <p className="ioc-location ioc-location--sm">
              {meta.ward} · {meta.city}
            </p>
          </div>
        </div>

        <div className="ioc-header-meta ioc-header-meta--inline">
          <LiveClock />
          <Link href="/ban-do" className="ioc-link-btn ioc-link-btn--sm">
            Bản đồ GIS
          </Link>
        </div>
      </header>

      <section className="ioc-kpi-grid ioc-kpi-grid--compact">
        <KpiCard label="HTX" value={kpis.htxCount} tone="green" icon={<KpiIconHtx />} />
        <KpiCard label="THT" value={kpis.thtCount} tone="lime" icon={<KpiIconTht />} />
        <KpiCard label="Trạm bơm" value={kpis.thuyLoiStations} tone="sky" icon={<KpiIconPump />} />
        <KpiCard label="OCOP" value={kpis.ocopProducts} tone="gold" icon={<KpiIconOcop />} />
        <KpiCard label="Thành viên" value={formatNumber(kpis.totalMembers)} tone="green" icon={<KpiIconMembers />} />
        <KpiCard label="Diện tích" value={formatNumber(kpis.totalLandHa, 0)} unit="ha" tone="lime" icon={<KpiIconArea />} />
        <KpiCard label="Thu nhập" value={formatBillionVnd(kpis.totalRevenueMillion)} tone="gold" icon={<KpiIconRevenue />} />
        <KpiCard label="Mô hình HQ" value={kpis.effectiveModels} tone="sky" icon={<KpiIconModel />} />
      </section>

      <div className="ioc-chart-grid">
        <IocPanel title="Cơ cấu ngành nghề" compact>
          <DonutChart data={charts.sectorDistribution} size={100} compact />
        </IocPanel>

        <IocPanel title="Phân bố khu vực" compact className="ioc-panel-col-chart">
          <VerticalBarChart data={charts.areaDistribution.slice(0, 5)} compact />
        </IocPanel>

        <IocPanel title="OCOP & Thủy lợi" compact className="ioc-panel-dual-donut">
          <div className="ioc-dual-donut">
            <DonutChart
              data={charts.ocopStars}
              size={128}
              compact
              hideLegend
              emphasizeCenter
              className="ioc-dual-donut-item"
            />
            <DonutChart
              data={charts.bomType}
              size={128}
              compact
              hideLegend
              emphasizeCenter
              className="ioc-dual-donut-item"
            />
          </div>
          <div className="ioc-dual-legend">
            <span>OCOP 3–4 sao</span>
            <span>Bơm điện / dầu</span>
          </div>
        </IocPanel>

        <IocPanel title="Tài chính (triệu đ)" compact>
          <GroupedBarChart data={charts.financialCompare} compact />
        </IocPanel>

        <IocPanel title="Top thu nhập HTX/THT" compact>
          <TopRevenueChart data={charts.topRevenue} compact limit={4} />
        </IocPanel>

        <IocPanel title="Mô hình hiệu quả" compact>
          <DonutChart data={charts.modelGroups} size={100} compact />
        </IocPanel>

        <IocPanel title="Vùng sản xuất (ha)" compact className="ioc-panel-line-chart">
          <LineChart data={productionZoneLand} compact />
        </IocPanel>

        <IocPanel title="Điểm nổi bật" compact>
          <div className="ioc-mini-table-wrap">
            <table className="ioc-table ioc-table--compact">
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Tên</th>
                  <th>KV</th>
                </tr>
              </thead>
              <tbody>
                {charts.productionZones.slice(0, 2).map((z) => (
                  <tr key={z.name}>
                    <td>
                      <span className="ioc-tag">Vùng SX</span>
                    </td>
                    <td className="ioc-table-name">{z.name}</td>
                    <td>{z.area}</td>
                  </tr>
                ))}
                {highlights.ocop.slice(0, 3).map((item, i) => (
                  <tr key={`${item.product}-${i}`}>
                    <td>
                      <span className="ioc-star-badge">{item.stars}</span>
                    </td>
                    <td className="ioc-table-name">{item.product}</td>
                    <td>{item.area}</td>
                  </tr>
                ))}
                {highlights.thuyLoi.slice(0, 2).map((s) => (
                  <tr key={s.name}>
                    <td>
                      <span className="ioc-tag">Bơm</span>
                    </td>
                    <td className="ioc-table-name">{s.name}</td>
                    <td>{s.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </IocPanel>
      </div>
    </div>
  );
}
