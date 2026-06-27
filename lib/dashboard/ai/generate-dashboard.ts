import type { DashboardTemplate } from "@/lib/dashboard/templates";
import type {
  DataSourceLayer,
} from "@/types/api/dashboard";
import type { Dataset } from "@/types/api/dataset";
import type { SavedView } from "@/types/api/saved-view";
import {
  createDashboardAiProvider,
  DashboardAiProviderError,
  type DashboardAiProviderDiagnostics,
} from "./ai-provider";
import {
  buildDashboardAiGroundingContext,
  type DashboardAiMode,
} from "./context";
import type { DashboardAiDataPreparationPlan } from "./data-preparation";
import { parseDashboardTemplateResponse } from "./parser";
import { buildDashboardTemplatePrompt } from "./prompt";
import type { DashboardAiDataProfile } from "./data-profiling";

export interface GenerateDashboardTemplateInput {
  description: string;
  dataSources?: DataSourceLayer[];
  datasets?: Dataset[];
  savedViews?: SavedView[];
  mode?: DashboardAiMode;
  rawResponse?: string;
  validationErrors?: string[];
  dataProfiles?: DashboardAiDataProfile[];
}

export interface GenerateDashboardTemplateResult {
  template: DashboardTemplate;
  dataPreparationPlan?: DashboardAiDataPreparationPlan;
  diagnostics?: DashboardAiProviderDiagnostics;
}

export class DashboardAiGenerationError extends Error {
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
    this.name = "DashboardAiGenerationError";
    this.details = options?.details;
    this.rawResponse = options?.rawResponse;
    this.code = options?.code;
  }
}

const MAX_PROMPT_LENGTH = 22000;

function nextMode(mode: DashboardAiMode): DashboardAiMode | null {
  if (mode === "normal") return "compact";
  if (mode === "compact") return "intentOnly";
  return null;
}

export async function generateDashboardTemplate({
  description,
  dataSources = [],
  datasets = [],
  savedViews = [],
  mode = "normal",
  rawResponse,
  validationErrors,
  dataProfiles = [],
}: GenerateDashboardTemplateInput): Promise<GenerateDashboardTemplateResult> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new DashboardAiGenerationError(
      "Nhập mô tả dashboard trước khi sinh mẫu.",
    );
  }

  const provider = createDashboardAiProvider();
  let currentMode = mode;
  let context = buildDashboardAiGroundingContext({
    prompt: trimmed,
    mode: currentMode === "repair" ? "compact" : currentMode,
    dataSources,
    datasets,
    savedViews,
    dataProfiles,
  });
  let prompt = buildDashboardTemplatePrompt(trimmed, context);
  while (prompt.length > MAX_PROMPT_LENGTH) {
    const fallbackMode = nextMode(currentMode);
    if (!fallbackMode) break;
    currentMode = fallbackMode;
    context = buildDashboardAiGroundingContext({
      prompt: trimmed,
      mode: currentMode === "repair" ? "compact" : currentMode,
      dataSources,
      datasets,
      savedViews,
      dataProfiles,
    });
    prompt = buildDashboardTemplatePrompt(trimmed, context);
  }

  let providerResult;
  try {
    providerResult = await provider.generate({
      prompt,
      description: trimmed,
      context,
      mode: currentMode,
      rawResponse,
      validationErrors,
    });
  } catch (err) {
    if (err instanceof DashboardAiProviderError) {
      throw new DashboardAiGenerationError(err.message, {
        code: err.code,
        details: err.details,
        rawResponse: err.rawResponse,
      });
    }
    throw err;
  }
  const parsed = parseDashboardTemplateResponse(providerResult.text);

  if (!parsed.template) {
    throw new DashboardAiGenerationError(
      parsed.errors.join("\n") || "AI trả về template không hợp lệ.",
      {
        details: parsed.errors,
        rawResponse: providerResult.diagnostics?.rawResponse ?? providerResult.text,
      },
    );
  }

  return {
    template: {
      ...parsed.template,
      id: parsed.template.id.startsWith("ai-template-")
        ? parsed.template.id
        : `ai-template-${Date.now()}-${parsed.template.id}`,
      code: parsed.template.code.startsWith("ai_")
        ? parsed.template.code
        : `ai_${Date.now()}_${parsed.template.code}`,
      tags: Array.from(new Set([...(parsed.template.tags ?? []), "ai"])),
    },
    dataPreparationPlan: parsed.dataPreparationPlan,
    diagnostics: providerResult.diagnostics,
  };
}
