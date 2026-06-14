import raw from "@/data/agri-dashboard.json";
import type { AgriDashboardData } from "@/types/agri-dashboard";

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
