import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  AnalyticsPreviewPayload,
  AnalyticsResult,
  DataSourceConfig,
} from "@/types/api/dashboard";

export async function queryAnalytics(
  config: DataSourceConfig,
): Promise<AnalyticsResult> {
  const res = await apiFetch<ApiResponse<AnalyticsResult>>("/analytics/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return unwrapData(res);
}

export async function previewAnalytics(
  payload: AnalyticsPreviewPayload,
): Promise<AnalyticsResult> {
  const res = await apiFetch<ApiResponse<AnalyticsResult>>(
    "/analytics/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}
