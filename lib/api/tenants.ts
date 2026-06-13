import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type { Organization, Tenant } from "@/types/api/tenant";

export async function getCurrentTenant(token?: string): Promise<Tenant> {
  const res = await apiFetch<ApiResponse<Tenant>>("/tenants/current", {
    token,
  });
  return unwrapData(res);
}

export async function getOrganizations(
  token?: string,
): Promise<Organization[]> {
  const res = await apiFetch<ApiResponse<Organization[]>>("/organizations", {
    token,
  });
  return unwrapData(res);
}
