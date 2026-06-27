import type { DashboardWidget } from "@/types/api/dashboard";
import type {
  DashboardTemplate,
  DashboardTemplatePlaceholder,
} from "./types";

export type DashboardTemplatePlaceholderValues = Record<string, string>;

const PLACEHOLDER_PATTERN = /^__(layer|field|dataset|view):([A-Za-z0-9_-]+)__$/;
const ANY_PLACEHOLDER_PATTERN = /__(?:layer|field|dataset|view):[A-Za-z0-9_-]+__/;

export function collectTemplatePlaceholders(
  template: DashboardTemplate,
): DashboardTemplatePlaceholder[] {
  const byKey = new Map<string, DashboardTemplatePlaceholder>();
  for (const widget of template.widgets) {
    for (const placeholder of widget.placeholders ?? []) {
      const current = byKey.get(placeholder.key);
      byKey.set(placeholder.key, {
        ...current,
        ...placeholder,
        required: Boolean(current?.required || placeholder.required),
        fieldTypes: placeholder.fieldTypes ?? current?.fieldTypes,
        geometryType: placeholder.geometryType ?? current?.geometryType,
        sourceKey: placeholder.sourceKey ?? current?.sourceKey,
        scope: placeholder.scope ?? current?.scope,
      });
    }
  }
  return Array.from(byKey.values());
}

export function replaceTemplatePlaceholders(
  value: unknown,
  values: DashboardTemplatePlaceholderValues,
): unknown {
  if (typeof value === "string") {
    const match = PLACEHOLDER_PATTERN.exec(value);
    if (!match) return value;
    return values[match[2]] || undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => replaceTemplatePlaceholders(item, values))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [
          key,
          replaceTemplatePlaceholders(item, values),
        ])
        .filter(([, item]) => item !== undefined),
    );
  }

  return value;
}

export function hasUnresolvedPlaceholders(value: unknown): boolean {
  if (typeof value === "string") return ANY_PLACEHOLDER_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(hasUnresolvedPlaceholders);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasUnresolvedPlaceholders);
  }
  return false;
}

export function validateTemplateValues(
  template: DashboardTemplate,
  values: DashboardTemplatePlaceholderValues,
): string[] {
  const errors: string[] = [];
  for (const placeholder of collectTemplatePlaceholders(template)) {
    if (placeholder.required && !values[placeholder.key]) {
      errors.push(`Chưa chọn ${placeholder.label.toLowerCase()}.`);
    }
  }
  return errors;
}

export function applyDashboardTemplate(
  template: DashboardTemplate,
  values: DashboardTemplatePlaceholderValues,
): DashboardWidget[] {
  return template.widgets.map((templateWidget) => {
    const dataSourceConfig = replaceTemplatePlaceholders(
      templateWidget.dataSourceConfig,
      values,
    ) as DashboardWidget["dataSourceConfig"];
    const displayConfig = replaceTemplatePlaceholders(
      templateWidget.displayConfig,
      values,
    ) as DashboardWidget["displayConfig"];

    return {
      widgetType: templateWidget.widgetType,
      title: templateWidget.title,
      layoutConfig: { ...templateWidget.layoutConfig },
      ...(dataSourceConfig ? { dataSourceConfig } : {}),
      ...(displayConfig ? { displayConfig } : {}),
    };
  });
}
