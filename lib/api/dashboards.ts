import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type {
  CreateDashboardPayload,
  DashboardDetail,
  DashboardListItem,
  DataSourceLayer,
  UpdateDashboardDraftPayload,
} from "@/types/api/dashboard";

export async function getDashboards(): Promise<DashboardListItem[]> {
  const res = await apiFetch<ApiResponse<DashboardListItem[]>>("/dashboards");
  return unwrapData(res);
}

export async function createDashboard(
  payload: CreateDashboardPayload,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>("/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrapData(res);
}

export async function getDashboardDataSources(): Promise<DataSourceLayer[]> {
  const res = await apiFetch<ApiResponse<DataSourceLayer[]>>(
    "/dashboards/data-sources",
  );
  return unwrapData(res);
}

export async function getPublishedDashboard(
  dashboardId: string,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>(
    `/dashboards/${dashboardId}`,
  );
  return unwrapData(res);
}

export async function getDashboardDraft(
  dashboardId: string,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>(
    `/dashboards/${dashboardId}/draft`,
  );
  return unwrapData(res);
}

export async function updateDashboardDraft(
  dashboardId: string,
  payload: UpdateDashboardDraftPayload,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>(
    `/dashboards/${dashboardId}/draft`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return unwrapData(res);
}

export async function publishDashboard(
  dashboardId: string,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>(
    `/dashboards/${dashboardId}/publish`,
    { method: "POST" },
  );
  return unwrapData(res);
}

export async function createDashboardDraftFromPublished(
  dashboardId: string,
): Promise<DashboardDetail> {
  const res = await apiFetch<ApiResponse<DashboardDetail>>(
    `/dashboards/${dashboardId}/draft`,
    { method: "POST" },
  );
  return unwrapData(res);
}
