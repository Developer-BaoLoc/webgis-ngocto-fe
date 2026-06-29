import type {
  DashboardTemplate,
  DashboardTemplatePlaceholder,
  DashboardTemplateWidget,
} from "@/lib/dashboard/templates";
import type { WidgetLayoutConfig } from "@/types/api/dashboard";
import { isNoDataWidget } from "@/lib/dashboard/no-data-widgets";
import {
  DASHBOARD_AI_ANY_PLACEHOLDER_PATTERN,
  DASHBOARD_AI_PLACEHOLDER_PATTERN,
  dashboardAiCategorySet,
  dashboardAiGeometryTypeSet,
  dashboardAiPlaceholderKindSet,
  dashboardAiWidgetTypeSet,
} from "./schema";

export interface DashboardAiValidationResult {
  valid: boolean;
  template?: DashboardTemplate;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateLayout(value: unknown, label: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${label} thiếu layoutConfig.`);
    return null;
  }

  const layoutKeys: Array<keyof WidgetLayoutConfig> = ["x", "y", "w", "h"];
  for (const key of layoutKeys) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      errors.push(`${label} layoutConfig.${key} phải là số.`);
    }
  }

  if (typeof value.w === "number" && value.w <= 0) {
    errors.push(`${label} layoutConfig.w phải lớn hơn 0.`);
  }
  if (typeof value.h === "number" && value.h <= 0) {
    errors.push(`${label} layoutConfig.h phải lớn hơn 0.`);
  }
  if (typeof value.w === "number" && value.w > 12) {
    errors.push(`${label} layoutConfig.w không được vượt quá 12 cột.`);
  }

  return {
    x: Number(value.x ?? 0),
    y: Number(value.y ?? 0),
    w: Number(value.w ?? 4),
    h: Number(value.h ?? 3),
  };
}

function validatePlaceholderStrings(
  value: unknown,
  path: string,
  errors: string[],
  foundKeys?: Set<string>,
) {
  if (typeof value === "string") {
    if (value.startsWith("__") || DASHBOARD_AI_ANY_PLACEHOLDER_PATTERN.test(value)) {
      const match = DASHBOARD_AI_PLACEHOLDER_PATTERN.exec(value);
      if (!match) {
        errors.push(`${path} có placeholder sai định dạng: ${value}`);
      } else {
        foundKeys?.add(match[2]);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validatePlaceholderStrings(item, `${path}[${index}]`, errors, foundKeys),
    );
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) =>
      validatePlaceholderStrings(item, `${path}.${key}`, errors, foundKeys),
    );
  }
}

function sanitizePlaceholder(
  value: unknown,
  label: string,
  errors: string[],
): DashboardTemplatePlaceholder | null {
  if (!isRecord(value)) {
    errors.push(`${label} không hợp lệ.`);
    return null;
  }
  if (!nonEmptyString(value.key)) errors.push(`${label} thiếu key.`);
  if (!nonEmptyString(value.label)) errors.push(`${label} thiếu label.`);
  if (!nonEmptyString(value.kind)) errors.push(`${label} thiếu kind.`);
  if (
    nonEmptyString(value.kind) &&
    !dashboardAiPlaceholderKindSet.has(value.kind)
  ) {
    errors.push(`${label} có kind không hợp lệ: ${String(value.kind)}`);
  }
  if (typeof value.required !== "boolean") {
    errors.push(`${label} thiếu required boolean.`);
  }
  if (
    value.geometryType !== undefined &&
    (!nonEmptyString(value.geometryType) ||
      !dashboardAiGeometryTypeSet.has(value.geometryType))
  ) {
    errors.push(`${label} có geometryType không hợp lệ.`);
  }
  if (value.fieldTypes !== undefined && !Array.isArray(value.fieldTypes)) {
    errors.push(`${label} fieldTypes phải là array.`);
  }
  if (value.sourceKey !== undefined && !nonEmptyString(value.sourceKey)) {
    errors.push(`${label} sourceKey phải là chuỗi không rỗng.`);
  }

  if (
    !nonEmptyString(value.key) ||
    !nonEmptyString(value.label) ||
    !nonEmptyString(value.kind) ||
    !dashboardAiPlaceholderKindSet.has(value.kind) ||
    typeof value.required !== "boolean"
  ) {
    return null;
  }

  return {
    key: value.key.trim(),
    label: value.label.trim(),
    ...(nonEmptyString(value.description)
      ? { description: value.description.trim() }
      : {}),
    kind: value.kind as DashboardTemplatePlaceholder["kind"],
    required: value.required,
    ...(nonEmptyString(value.geometryType) &&
    dashboardAiGeometryTypeSet.has(value.geometryType)
      ? {
          geometryType:
            value.geometryType as DashboardTemplatePlaceholder["geometryType"],
        }
      : {}),
    ...(Array.isArray(value.fieldTypes)
      ? {
          fieldTypes: value.fieldTypes.filter(
            (item): item is string => typeof item === "string",
          ),
        }
      : {}),
    ...(nonEmptyString(value.sourceKey)
      ? { sourceKey: value.sourceKey.trim() }
      : {}),
    ...(value.scope === "widget" || value.scope === "template"
      ? { scope: value.scope }
      : {}),
  };
}

function sanitizeWidget(
  value: unknown,
  index: number,
  errors: string[],
): DashboardTemplateWidget | null {
  const label = `Tiện ích ${index + 1}`;
  if (!isRecord(value)) {
    errors.push(`${label} không hợp lệ.`);
    return null;
  }
  if (!nonEmptyString(value.templateWidgetId)) {
    errors.push(`${label} thiếu ID trong mẫu.`);
  }
  if (!nonEmptyString(value.title)) errors.push(`${label} thiếu title.`);
  if (!nonEmptyString(value.widgetType)) {
    errors.push(`${label} thiếu widgetType.`);
  } else if (!dashboardAiWidgetTypeSet.has(value.widgetType)) {
    errors.push(`${label} có widgetType không tồn tại: ${value.widgetType}`);
  }
  const layout = validateLayout(value.layoutConfig, label, errors);
  const noDataWidget =
    nonEmptyString(value.widgetType) &&
    dashboardAiWidgetTypeSet.has(value.widgetType) &&
    isNoDataWidget(value.widgetType as DashboardTemplateWidget["widgetType"]);

  if (noDataWidget) {
    if (
      !nonEmptyString(value.templateWidgetId) ||
      !nonEmptyString(value.title) ||
      !nonEmptyString(value.widgetType) ||
      !layout
    ) {
      return null;
    }

    return {
      templateWidgetId: value.templateWidgetId.trim(),
      title: value.title.trim(),
      ...(nonEmptyString(value.purpose) ? { purpose: value.purpose.trim() } : {}),
      ...(nonEmptyString(value.widgetTypeReason)
        ? { widgetTypeReason: value.widgetTypeReason.trim() }
        : {}),
      widgetType: value.widgetType as DashboardTemplateWidget["widgetType"],
      layoutConfig: layout,
      ...(isRecord(value.displayConfig) ? { displayConfig: value.displayConfig } : {}),
      placeholders: [],
    };
  }

  if (value.dataSourceConfig !== undefined && !isRecord(value.dataSourceConfig)) {
    errors.push(`${label} dataSourceConfig phải là object.`);
  }
  if (value.displayConfig !== undefined && !isRecord(value.displayConfig)) {
    errors.push(`${label} displayConfig phải là object.`);
  }
  const referencedPlaceholderKeys = new Set<string>();
  validatePlaceholderStrings(
    value.dataSourceConfig,
    `${label}.dataSourceConfig`,
    errors,
    referencedPlaceholderKeys,
  );
  validatePlaceholderStrings(
    value.displayConfig,
    `${label}.displayConfig`,
    errors,
    referencedPlaceholderKeys,
  );

  const placeholders = Array.isArray(value.placeholders)
    ? value.placeholders
        .map((placeholder, placeholderIndex) =>
          sanitizePlaceholder(
            placeholder,
            `${label} placeholder ${placeholderIndex + 1}`,
            errors,
          ),
        )
        .filter((item): item is DashboardTemplatePlaceholder => Boolean(item))
    : [];

  const placeholderKeys = new Set(placeholders.map((placeholder) => placeholder.key));
  for (const key of referencedPlaceholderKeys) {
    if (!placeholderKeys.has(key)) {
      errors.push(`${label} dùng placeholder ${key} nhưng chưa khai báo trong placeholders.`);
    }
  }
  for (const placeholder of placeholders) {
    const isField =
      placeholder.kind === "field" ||
      placeholder.kind === "metric_field" ||
      placeholder.kind === "dimension_field" ||
      placeholder.kind === "date_field" ||
      placeholder.kind === "zone_label_field";
    if (isField && !placeholder.sourceKey) {
      errors.push(`${label} placeholder field ${placeholder.key} thiếu sourceKey.`);
    }
    if (placeholder.sourceKey && !placeholderKeys.has(placeholder.sourceKey)) {
      errors.push(
        `${label} placeholder ${placeholder.key} có sourceKey không tồn tại: ${placeholder.sourceKey}`,
      );
    }
  }

  const dataSourceConfig = isRecord(value.dataSourceConfig)
    ? value.dataSourceConfig
    : undefined;
  if (dataSourceConfig) {
    const hasLayer = typeof dataSourceConfig.layerId === "string";
    const hasDataset = typeof dataSourceConfig.datasetId === "string";
    const hasView = typeof dataSourceConfig.viewId === "string";
    const hasSpatial = isRecord(dataSourceConfig.spatial);
    if (!hasLayer && !hasDataset && !hasView && !hasSpatial) {
      errors.push(`${label} dataSourceConfig thiếu nguồn layerId/datasetId/viewId/spatial.`);
    }
    if (
      typeof dataSourceConfig.aggregation === "string" &&
      !["count", "sum", "avg", "min", "max", "top", "records"].includes(
        dataSourceConfig.aggregation,
      )
    ) {
      errors.push(`${label} aggregation không hợp lệ.`);
    }
  }

  if (
    !nonEmptyString(value.templateWidgetId) ||
    !nonEmptyString(value.title) ||
    !nonEmptyString(value.widgetType) ||
    !dashboardAiWidgetTypeSet.has(value.widgetType) ||
    !layout
  ) {
    return null;
  }

  return {
    templateWidgetId: value.templateWidgetId.trim(),
    title: value.title.trim(),
    ...(nonEmptyString(value.purpose) ? { purpose: value.purpose.trim() } : {}),
    ...(nonEmptyString(value.widgetTypeReason)
      ? { widgetTypeReason: value.widgetTypeReason.trim() }
      : {}),
    widgetType: value.widgetType as DashboardTemplateWidget["widgetType"],
    layoutConfig: layout,
    ...(isRecord(value.dataSourceConfig)
      ? { dataSourceConfig: value.dataSourceConfig }
      : {}),
    ...(isRecord(value.displayConfig) ? { displayConfig: value.displayConfig } : {}),
    ...(placeholders.length ? { placeholders } : {}),
  };
}

export function validateDashboardAiTemplate(
  value: unknown,
): DashboardAiValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ["AI phải trả về một JSON object template."] };
  }

  if (!nonEmptyString(value.id)) errors.push("Mẫu thiếu ID.");
  if (!nonEmptyString(value.code)) errors.push("Mẫu thiếu mã.");
  if (!nonEmptyString(value.name)) errors.push("Mẫu thiếu tên.");
  if (!nonEmptyString(value.description)) {
    errors.push("Mẫu thiếu mô tả.");
  }
  if (!nonEmptyString(value.category)) {
    errors.push("Mẫu thiếu danh mục.");
  } else if (!dashboardAiCategorySet.has(value.category)) {
    errors.push(`Mẫu có danh mục không hợp lệ: ${value.category}`);
  }
  if (!Array.isArray(value.widgets) || value.widgets.length === 0) {
    errors.push("Mẫu phải có ít nhất một tiện ích.");
  }

  const widgets = Array.isArray(value.widgets)
    ? value.widgets
        .map((widget, index) => sanitizeWidget(widget, index, errors))
        .filter((widget): widget is DashboardTemplateWidget => Boolean(widget))
    : [];

  const widgetIds = new Set<string>();
  widgets.forEach((widget) => {
    if (widgetIds.has(widget.templateWidgetId)) {
      errors.push(`Trùng ID tiện ích trong mẫu: ${widget.templateWidgetId}`);
    }
    widgetIds.add(widget.templateWidgetId);
  });

  const template: DashboardTemplate = {
    id: nonEmptyString(value.id) ? value.id.trim() : `ai-template-${Date.now()}`,
    code: nonEmptyString(value.code) ? value.code.trim() : `ai_${Date.now()}`,
    name: nonEmptyString(value.name)
      ? value.name.trim()
      : "Mẫu dashboard từ AI",
    description: nonEmptyString(value.description)
      ? value.description.trim()
      : "Mẫu dashboard sinh từ AI Assistant.",
    category: dashboardAiCategorySet.has(String(value.category))
      ? (value.category as DashboardTemplate["category"])
      : "custom",
    icon: nonEmptyString(value.icon) ? value.icon.trim() : "sparkles",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : ["ai"],
    widgets,
    ...(Array.isArray(value.requirements)
      ? { requirements: value.requirements as DashboardTemplate["requirements"] }
      : {}),
  };

  return {
    valid: errors.length === 0,
    template: errors.length === 0 ? template : undefined,
    errors,
  };
}
