import { NextResponse, type NextRequest } from "next/server";
import { parseDashboardTemplateResponse } from "@/lib/dashboard/ai/parser";
import { buildDashboardTemplatePrompt } from "@/lib/dashboard/ai/prompt";
import type {
  DashboardAiGroundingContext,
  DashboardAiMode,
} from "@/lib/dashboard/ai/context";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonError(
  status: number,
  error: string,
  details?: string[],
  code?: string,
) {
  return NextResponse.json(
    {
      error,
      ...(code ? { code } : {}),
      ...(details?.length ? { details } : {}),
    },
    { status },
  );
}

function jsonTemplateError(
  status: number,
  error: string,
  details?: string[],
  rawResponse?: string,
  code?: string,
) {
  return NextResponse.json(
    {
      error,
      ...(code ? { code } : {}),
      ...(details?.length ? { details } : {}),
      ...(rawResponse ? { rawResponse } : {}),
    },
    { status },
  );
}

function extractOpenAiText(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.output_text === "string") return value.output_text;
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string") return value.content;

  const output = value.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!isRecord(item)) continue;
      const content = item.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!isRecord(part)) continue;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
      }
    }
  }

  const choices = value.choices;
  if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
    const choice = choices[0];
    if (typeof choice.text === "string") return choice.text;
    if (isRecord(choice.message) && typeof choice.message.content === "string") {
      return choice.message.content;
    }
  }

  return null;
}

async function readJsonBody(request: NextRequest) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function isGroundingContext(value: unknown): value is DashboardAiGroundingContext {
  return (
    isRecord(value) &&
    Array.isArray(value.layers) &&
    Array.isArray(value.datasets) &&
    Array.isArray(value.savedViews)
  );
}

async function callOpenAiTemplate(input: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
      temperature: 0.15,
    }),
  });

  let providerPayload: unknown = null;
  try {
    providerPayload = await response.json();
  } catch {
    throw new Error("OpenAI không trả JSON hợp lệ cho AI dashboard proxy.");
  }

  if (!response.ok) {
    const message =
      isRecord(providerPayload) &&
      isRecord(providerPayload.error) &&
      typeof providerPayload.error.message === "string"
        ? providerPayload.error.message
        : "OpenAI trả lỗi khi sinh dashboard template.";
    throw new Error(message);
  }

  const text = extractOpenAiText(providerPayload);
  if (!text) {
    throw new Error("Không đọc được nội dung JSON template từ phản hồi OpenAI.");
  }
  return text;
}

function buildRepairPrompt(input: {
  originalPrompt: string;
  rawResponse: string;
  errors: string[];
}) {
  return [
    "Bạn cần sửa DashboardTemplate JSON bị lỗi.",
    "Chỉ trả JSON object đã sửa. Không markdown, không giải thích, không code fence.",
    "Có thể trả DashboardTemplate trực tiếp hoặc envelope {\"template\": DashboardTemplate, \"dataPreparationPlan\": {...}}.",
    "Giữ đúng yêu cầu gốc và schema. Không sinh HTML/JS/SQL/backend.",
    "",
    "YÊU CẦU GỐC:",
    input.originalPrompt,
    "",
    "LỖI VALIDATION CẦN SỬA:",
    input.errors.map((error, index) => `${index + 1}. ${error}`).join("\n"),
    "",
    "JSON CŨ CẦN SỬA:",
    input.rawResponse.slice(0, 18000),
  ].join("\n");
}

function modeFromValue(value: unknown): DashboardAiMode {
  if (
    value === "normal" ||
    value === "compact" ||
    value === "intentOnly" ||
    value === "repair"
  ) {
    return value;
  }
  return "normal";
}

function contextForMode(
  context: DashboardAiGroundingContext | undefined,
  mode: DashboardAiMode,
): DashboardAiGroundingContext | undefined {
  if (!context || mode === "intentOnly" || mode === "repair") return undefined;
  if (mode === "compact") {
    return {
      mode: "compact",
      layers: context.layers.slice(0, 3).map((source) => ({
        ...source,
        fields: source.fields.slice(0, 8),
      })),
      datasets: context.datasets.slice(0, 2).map((source) => ({
        ...source,
        fields: source.fields.slice(0, 8),
      })),
      savedViews: context.savedViews.slice(0, 2).map((source) => ({
        ...source,
        fields: source.fields.slice(0, 8),
      })),
      dataProfiles: context.dataProfiles?.slice(0, 3).map((profile) => ({
        ...profile,
        fields: profile.fields.slice(0, 8),
      })),
    };
  }
  return context;
}

function parseStrictDashboardTemplateResponse(text: string) {
  if (/^```/i.test(text.trim())) {
    return {
      errors: ["AI trả markdown/code fence. Chỉ được trả JSON object thuần."],
    };
  }
  return parseDashboardTemplateResponse(text);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      500,
      "Chưa cấu hình OPENAI_API_KEY ở server environment.",
    );
  }

  const body = await readJsonBody(request);
  if (!isRecord(body)) {
    return jsonError(400, "Request body phải là JSON object.");
  }

  const context = isGroundingContext(body.context) ? body.context : undefined;
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : "";
  const mode = modeFromValue(body.mode);
  const rawResponse =
    typeof body.rawResponse === "string" ? body.rawResponse : "";
  const validationErrors = Array.isArray(body.validationErrors)
    ? body.validationErrors.filter((item): item is string => typeof item === "string")
    : [];

  let prompt =
    mode === "repair"
      ? rawResponse
        ? buildRepairPrompt({
            originalPrompt:
              description || (typeof body.prompt === "string" ? body.prompt : ""),
            rawResponse,
            errors: validationErrors.length
              ? validationErrors
              : ["Mẫu JSON không hợp lệ."],
          })
        : ""
      : description
        ? buildDashboardTemplatePrompt(
            description,
            contextForMode(context, mode),
          )
        : typeof body.prompt === "string"
          ? body.prompt
          : "";

  if (!prompt.trim()) {
    return jsonError(400, "Thiếu prompt hoặc description.");
  }

  if (prompt.length > 24000) {
    if (description && mode === "normal") {
      prompt = buildDashboardTemplatePrompt(
        description,
        contextForMode(context, "compact"),
      );
    }
    if (prompt.length > 24000 && description) {
      prompt = buildDashboardTemplatePrompt(description, undefined);
    }
    if (prompt.length > 24000) {
      return jsonError(
        400,
        "Prompt vẫn quá dài sau khi rút gọn context.",
        undefined,
        "context_too_large",
      );
    }
  }

  const model =
    typeof process.env.OPENAI_DASHBOARD_MODEL === "string" &&
    process.env.OPENAI_DASHBOARD_MODEL.trim()
      ? process.env.OPENAI_DASHBOARD_MODEL.trim()
      : "gpt-4.1-mini";

  try {
    const messages: string[] = ["Đã gọi AI sinh template."];
    let text = await callOpenAiTemplate({ apiKey, model, prompt });
    let parsed = parseStrictDashboardTemplateResponse(text);
    let repairAttempts = 0;

    while (!parsed.template && repairAttempts < 2) {
      repairAttempts += 1;
      messages.push(`Đã tự sửa lần ${repairAttempts}.`);
      text = await callOpenAiTemplate({
        apiKey,
        model,
        prompt: buildRepairPrompt({
          originalPrompt: prompt,
          rawResponse: text,
          errors: parsed.errors,
        }),
      });
      parsed = parseStrictDashboardTemplateResponse(text);
    }

    if (!parsed.template) {
      return jsonTemplateError(
        422,
        "AI trả về mẫu bảng điều khiển không hợp lệ sau khi tự sửa.",
        parsed.errors,
        text,
        parsed.errors.some((error) => error.includes("JSON không hợp lệ"))
          ? "ai_invalid_json"
          : "ai_validation_failed",
      );
    }

    return NextResponse.json({
      template: parsed.template,
      ...(parsed.dataPreparationPlan
        ? { dataPreparationPlan: parsed.dataPreparationPlan }
        : {}),
      diagnostics: {
        repairAttempts,
        messages,
        rawResponse: text,
      },
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error
        ? err.message
        : "Không gọi được AI dashboard proxy.",
      undefined,
      "api_error",
    );
  }
}
