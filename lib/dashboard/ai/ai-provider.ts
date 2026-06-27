export interface DashboardAiProvider {
  generate(request: DashboardAiProviderRequest): Promise<DashboardAiProviderResult>;
}

export interface DashboardAiProviderRequest {
  prompt?: string;
  description?: string;
  context?: unknown;
  mode?: "normal" | "compact" | "intentOnly" | "repair";
  rawResponse?: string;
  validationErrors?: string[];
}

export interface DashboardAiProviderDiagnostics {
  repairAttempts?: number;
  messages?: string[];
  rawResponse?: string;
}

export interface DashboardAiProviderResult {
  text: string;
  diagnostics?: DashboardAiProviderDiagnostics;
}

export class DashboardAiProviderError extends Error {
  details?: string[];
  rawResponse?: string;
  code?: string;

  constructor(
    message: string,
    options?: {
      details?: string[];
      rawResponse?: string;
      code?: string;
    },
  ) {
    super(message);
    this.name = "DashboardAiProviderError";
    this.details = options?.details;
    this.rawResponse = options?.rawResponse;
    this.code = options?.code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractTextFromProviderResponse(value: unknown): DashboardAiProviderResult | null {
  if (typeof value === "string") return { text: value };
  if (!isRecord(value)) return null;

  const diagnostics = isRecord(value.diagnostics)
    ? {
        repairAttempts:
          typeof value.diagnostics.repairAttempts === "number"
            ? value.diagnostics.repairAttempts
            : undefined,
        messages: Array.isArray(value.diagnostics.messages)
          ? value.diagnostics.messages.filter(
              (item): item is string => typeof item === "string",
            )
          : undefined,
        rawResponse:
          typeof value.diagnostics.rawResponse === "string"
            ? value.diagnostics.rawResponse
            : undefined,
      }
    : undefined;

  if (isRecord(value.template)) {
    return {
      text: JSON.stringify({
        template: value.template,
        ...(value.dataPreparationPlan !== undefined
          ? { dataPreparationPlan: value.dataPreparationPlan }
          : {}),
      }),
      diagnostics,
    };
  }

  for (const key of ["text", "output", "content", "response"]) {
    if (typeof value[key] === "string") {
      return { text: value[key], diagnostics };
    }
  }

  const choices = value.choices;
  if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
    const choice = choices[0];
    if (typeof choice.text === "string") return { text: choice.text, diagnostics };
    if (isRecord(choice.message) && typeof choice.message.content === "string") {
      return { text: choice.message.content, diagnostics };
    }
  }

  return null;
}

export class HttpDashboardAiProvider implements DashboardAiProvider {
  constructor(private readonly endpoint: string) {}

  async generate(request: DashboardAiProviderRequest): Promise<DashboardAiProviderResult> {
    if (this.endpoint.trim().startsWith("sk-")) {
      throw new DashboardAiProviderError(
        "NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT đang giống API key. Không được đưa API key ra browser; hãy dùng /api/dashboard-ai.",
      );
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new DashboardAiProviderError(
        "AI proxy không trả JSON hợp lệ. Kiểm tra route /api/dashboard-ai.",
      );
    }

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : `AI provider trả lỗi HTTP ${response.status}.`;
      throw new DashboardAiProviderError(message, {
        code:
          isRecord(payload) && typeof payload.code === "string"
            ? payload.code
            : undefined,
        details:
          isRecord(payload) && Array.isArray(payload.details)
            ? payload.details.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined,
        rawResponse:
          isRecord(payload) && typeof payload.rawResponse === "string"
            ? payload.rawResponse
            : undefined,
      });
    }

    const extracted = extractTextFromProviderResponse(payload);
    if (!extracted) {
      throw new DashboardAiProviderError(
        "AI proxy trả JSON nhưng thiếu nội dung template. Cần có trường template, text, output hoặc content.",
      );
    }
    return extracted;
  }
}

export function createDashboardAiProvider(): DashboardAiProvider {
  const endpoint = process.env.NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT;

  if (!endpoint) {
    return {
      async generate() {
        throw new DashboardAiProviderError(
          "Chưa cấu hình NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT cho AI Dashboard Assistant.",
        );
      },
    };
  }

  if (endpoint.trim().startsWith("sk-")) {
    return {
      async generate() {
        throw new DashboardAiProviderError(
          "NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT đang là API key. Hãy đặt NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT=/api/dashboard-ai và OPENAI_API_KEY ở server env.",
        );
      },
    };
  }

  return new HttpDashboardAiProvider(endpoint);
}
