export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  meta?: ApiMeta;
}

/** Response có thể bọc { data } hoặc raw (prototype) */
export function unwrapData<T>(payload: ApiResponse<T> | T): T {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiResponse<T>).data !== undefined
  ) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
