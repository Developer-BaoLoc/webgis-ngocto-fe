import { getStoredToken } from "@/lib/auth/token";
import type { ApiErrorBody } from "@/types/api/common";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"
  );
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const { token: tokenOverride, ...fetchInit } = init ?? {};
  const token =
    tokenOverride !== undefined ? tokenOverride : getStoredToken();

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    cache: "no-store",
    ...fetchInit,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchInit.headers,
    },
  });

  if (!res.ok) {
    let message = `API ${res.status}: ${path}`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
