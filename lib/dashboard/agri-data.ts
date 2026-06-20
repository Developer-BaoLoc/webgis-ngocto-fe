import raw from "@/data/agri-dashboard.json";
import type {
  AgriAlert,
  AgriDashboardData,
  CitizenFeedback,
  ForecastPoint,
} from "@/types/agri-dashboard";

export const agriDashboardData = raw as AgriDashboardData;

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function formatBillionVnd(millionVnd: number): string {
  if (millionVnd >= 1000) {
    return `${formatNumber(millionVnd / 1000, 1)} tỷ đ`;
  }
  return `${formatNumber(millionVnd, 0)} triệu đ`;
}

/**
 * Dự báo doanh thu nông nghiệp theo quý (tỷ đồng).
 * Phân bổ tổng doanh thu thực tế từ Excel theo hệ số mùa vụ ĐBSCL,
 * 4 quý gần nhất là số liệu, 2 quý sau là dự báo (tăng trưởng nhẹ).
 */
export function getRevenueForecast(): ForecastPoint[] {
  const annualBillion = agriDashboardData.kpis.totalRevenueMillion / 1000;
  const seasonal = [0.21, 0.27, 0.29, 0.23];
  const actual = seasonal.map((w) => annualBillion * w);
  const growth = 1.07;

  const points: ForecastPoint[] = [
    { name: "Q1/25", value: actual[0] },
    { name: "Q2/25", value: actual[1] },
    { name: "Q3/25", value: actual[2] },
    { name: "Q4/25", value: actual[3] },
    { name: "Q1/26", value: actual[0] * growth, forecast: true },
    { name: "Q2/26", value: actual[1] * growth, forecast: true },
  ];

  return points.map((p) => ({ ...p, value: Math.round(p.value * 100) / 100 }));
}

/** Sản lượng quy đổi theo lĩnh vực (tỷ đồng doanh thu) — từ financialCompare. */
export function getOutputBySector(): { name: string; value: number }[] {
  return agriDashboardData.charts.financialCompare
    .map((row) => ({
      name: row.label,
      value: Math.round((row.revenue / 1000) * 10) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}

const ALERT_SEVERITY_ORDER: Record<AgriAlert["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Cảnh báo nông nghiệp — suy ra từ dữ liệu thật (vùng SX, trạm bơm, OCOP, lợi nhuận). */
export function getAgriAlerts(): AgriAlert[] {
  const { charts, highlights } = agriDashboardData;
  const alerts: AgriAlert[] = [];

  const idleZone = charts.productionZones.find((z) =>
    /(không|k\s*sx|ngừng|tạm)/i.test(z.status),
  );
  if (idleZone) {
    alerts.push({
      id: "zone-idle",
      title: `${idleZone.name} tạm ngừng sản xuất theo vụ`,
      area: idleZone.area,
      severity: "medium",
      time: "Hôm nay",
    });
  }

  const dauBom = charts.bomType.find((b) => /dầu/i.test(b.name));
  if (dauBom && dauBom.value > 0) {
    alerts.push({
      id: "pump-oil",
      title: `${dauBom.value} trạm bơm dầu cần chuyển đổi sang bơm điện`,
      area: "Toàn phường",
      severity: "medium",
      time: "2 ngày trước",
    });
  }

  const lowMargin = [...highlights.htx, ...highlights.tht]
    .filter(
      (o) =>
        o.revenueMillion &&
        o.profitMillion != null &&
        o.revenueMillion > 1000 &&
        o.profitMillion / o.revenueMillion < 0.05,
    )
    .sort(
      (a, b) =>
        (a.profitMillion ?? 0) / (a.revenueMillion ?? 1) -
        (b.profitMillion ?? 0) / (b.revenueMillion ?? 1),
    )[0];
  if (lowMargin && lowMargin.revenueMillion) {
    const margin = Math.round(
      ((lowMargin.profitMillion ?? 0) / lowMargin.revenueMillion) * 1000,
    ) / 10;
    alerts.push({
      id: "low-margin",
      title: `${lowMargin.name}: biên lợi nhuận thấp (${margin}%)`,
      area: lowMargin.area,
      severity: "high",
      time: "3 ngày trước",
    });
  }

  const star3 = charts.ocopStars.find((s) => /3/.test(s.name));
  if (star3 && star3.value > 0) {
    alerts.push({
      id: "ocop-upgrade",
      title: `${star3.value} sản phẩm OCOP 3 sao đủ điều kiện nâng hạng`,
      area: "Toàn phường",
      severity: "low",
      time: "Tuần này",
    });
  }

  return alerts
    .sort(
      (a, b) =>
        ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity],
    )
    .slice(0, 4);
}

/** Phản ánh người dân — nội dung gắn với khu vực thật trong dữ liệu. */
export function getCitizenFeedback(): CitizenFeedback[] {
  const areas = agriDashboardData.charts.areaDistribution.map((a) => a.name);
  const pick = (i: number) => areas[i % areas.length] ?? "Ngọc Tố";

  return [
    {
      id: "fb-1",
      title: "Đề nghị nạo vét kênh tưới phục vụ vụ Đông Xuân",
      area: pick(4),
      status: "resolved",
      time: "Hôm qua",
    },
    {
      id: "fb-2",
      title: "Phản ánh sạt lở bờ kênh ảnh hưởng vùng canh tác",
      area: pick(8),
      status: "processing",
      time: "2 ngày trước",
    },
    {
      id: "fb-3",
      title: "Kiến nghị hỗ trợ giống lúa chất lượng cao",
      area: pick(1),
      status: "new",
      time: "3 ngày trước",
    },
    {
      id: "fb-4",
      title: "Đề xuất mở lớp tập huấn canh tác VietGAP",
      area: pick(2),
      status: "processing",
      time: "Tuần này",
    },
  ];
}

export function getFeedbackStats() {
  const items = getCitizenFeedback();
  return {
    total: items.length,
    resolved: items.filter((i) => i.status === "resolved").length,
    processing: items.filter((i) => i.status === "processing").length,
    new: items.filter((i) => i.status === "new").length,
  };
}
