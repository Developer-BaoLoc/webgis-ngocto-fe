import { apiFetch } from "./client";
import { unwrapData, type ApiResponse } from "@/types/api/common";
import type { AuthUser, LoginRequest, LoginResponse } from "@/types/api/auth";

export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const res = await apiFetch<ApiResponse<LoginResponse>>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    token: null,
  });
  return unwrapData(res);
}

export async function getMe(token?: string): Promise<AuthUser> {
  const res = await apiFetch<ApiResponse<AuthUser>>("/auth/me", { token });
  return unwrapData(res);
}
