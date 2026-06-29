import type { DashboardWidget, WidgetType } from "@/types/api/dashboard";
import type { DashboardTemplate, DashboardTemplateWidget } from "./types";

const CUSTOM_TEMPLATE_STORAGE_KEY = "gis_ngocto.dashboard.customTemplates.v1";

const WIDGET_TYPES = new Set<WidgetType>([
  "stat",
  "bar",
  "pie",
  "donut",
  "line",
  "table",
  "ranking",
  "map",
  "text",
  "global_filter",
  "timeline",
  "calendar",
  "progress",
  "milestone",
  "activity_history",
  "minimap",
  "progress_ring",
  "activity_feed",
  "treemap",
  "alert_center",
  "spatial_summary",
  "spatial_ranking",
  "thematic_map",
  "spatial_alert",
  "seasonal_calendar",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === "string" && WIDGET_TYPES.has(value as WidgetType);
}

function sanitizeWidget(widget: DashboardWidget, index: number): DashboardTemplateWidget {
  return {
    templateWidgetId: `custom-widget-${index + 1}`,
    title: widget.title || `Tiện ích ${index + 1}`,
    widgetType: widget.widgetType,
    layoutConfig: { ...widget.layoutConfig },
    ...(widget.dataSourceConfig
      ? { dataSourceConfig: structuredClone(widget.dataSourceConfig) }
      : {}),
    ...(widget.displayConfig ? { displayConfig: structuredClone(widget.displayConfig) } : {}),
  };
}

export function dashboardToTemplate(input: {
  dashboardName: string;
  description?: string | null;
  widgets: DashboardWidget[];
  name?: string;
  templateDescription?: string;
}): DashboardTemplate {
  const now = Date.now();
  return {
    id: `custom-template-${now}`,
    code: `custom_${now}`,
    name: input.name?.trim() || input.dashboardName || "Mẫu dashboard tùy chỉnh",
    description:
      input.templateDescription?.trim() ||
      input.description?.trim() ||
      "Mẫu được lưu từ trình thiết kế bảng điều khiển.",
    category: "custom",
    icon: "layout-template",
    tags: ["custom"],
    widgets: input.widgets.map(sanitizeWidget),
  };
}

export function validateDashboardTemplateJson(value: unknown): {
  valid: boolean;
  template?: DashboardTemplate;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ["JSON phải là một object template."] };
  }

  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const code =
    typeof value.code === "string" && value.code.trim()
      ? value.code.trim()
      : `custom_${Date.now()}`;
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const description =
    typeof value.description === "string" && value.description.trim()
      ? value.description.trim()
      : "Mẫu dashboard tùy chỉnh.";
  const widgets = Array.isArray(value.widgets) ? value.widgets : [];

  if (!id) errors.push("Thiếu id.");
  if (!name) errors.push("Thiếu name.");
  if (!widgets.length) errors.push("Mẫu phải có danh sách tiện ích.");

  const parsedWidgets: DashboardTemplateWidget[] = [];
  widgets.forEach((widget, index) => {
    if (!isRecord(widget)) {
      errors.push(`Tiện ích ${index + 1} không hợp lệ.`);
      return;
    }
    if (!isWidgetType(widget.widgetType)) {
      errors.push(`Tiện ích ${index + 1} có loại không hợp lệ.`);
      return;
    }
    const layout = isRecord(widget.layoutConfig) ? widget.layoutConfig : null;
    if (
      !layout ||
      typeof layout.x !== "number" ||
      typeof layout.y !== "number" ||
      typeof layout.w !== "number" ||
      typeof layout.h !== "number"
    ) {
      errors.push(`Tiện ích ${index + 1} thiếu cấu hình bố cục hợp lệ.`);
      return;
    }
    if (widget.placeholders !== undefined && !Array.isArray(widget.placeholders)) {
      errors.push(`Tiện ích ${index + 1} có vị trí liên kết không hợp lệ.`);
      return;
    }
    if (Array.isArray(widget.placeholders)) {
      const placeholderKeys = new Set<string>();
      widget.placeholders.forEach((placeholder, placeholderIndex) => {
        if (!isRecord(placeholder)) {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} không hợp lệ.`);
          return;
        }
        if (typeof placeholder.key !== "string" || !placeholder.key.trim()) {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} thiếu key.`);
        }
        if (typeof placeholder.label !== "string" || !placeholder.label.trim()) {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} thiếu label.`);
        }
        if (typeof placeholder.kind !== "string") {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} thiếu kind.`);
        }
        if (typeof placeholder.required !== "boolean") {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} thiếu required.`);
        }
        if (typeof placeholder.key === "string" && placeholder.key.trim()) {
          placeholderKeys.add(placeholder.key);
        }
      });
      widget.placeholders.forEach((placeholder, placeholderIndex) => {
        if (!isRecord(placeholder)) return;
        const kind = typeof placeholder.kind === "string" ? placeholder.kind : "";
        const isField =
          kind === "field" ||
          kind === "metric_field" ||
          kind === "dimension_field" ||
          kind === "date_field" ||
          kind === "zone_label_field";
        if (isField && (typeof placeholder.sourceKey !== "string" || !placeholder.sourceKey.trim())) {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} thiếu sourceKey.`);
        }
        if (
          typeof placeholder.sourceKey === "string" &&
          placeholder.sourceKey.trim() &&
          !placeholderKeys.has(placeholder.sourceKey)
        ) {
          errors.push(`Placeholder ${placeholderIndex + 1} của widget ${index + 1} có sourceKey không tồn tại.`);
        }
      });
    }
    parsedWidgets.push({
      templateWidgetId:
        typeof widget.templateWidgetId === "string" && widget.templateWidgetId
          ? widget.templateWidgetId
          : `imported-widget-${index + 1}`,
      title:
        typeof widget.title === "string" && widget.title
          ? widget.title
          : `Tiện ích ${index + 1}`,
      widgetType: widget.widgetType,
      layoutConfig: {
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
      },
      ...(isRecord(widget.dataSourceConfig)
        ? { dataSourceConfig: widget.dataSourceConfig }
        : {}),
      ...(isRecord(widget.displayConfig) ? { displayConfig: widget.displayConfig } : {}),
      ...(Array.isArray(widget.placeholders)
        ? { placeholders: widget.placeholders as DashboardTemplateWidget["placeholders"] }
        : {}),
    });
  });

  const template: DashboardTemplate = {
    id,
    code,
    name,
    description,
    category: "custom",
    icon: typeof value.icon === "string" ? value.icon : "layout-template",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : ["custom"],
    widgets: parsedWidgets,
  };

  return {
    valid: errors.length === 0,
    template: errors.length === 0 ? template : undefined,
    errors,
  };
}

export function templateToJson(template: DashboardTemplate) {
  return JSON.stringify(template, null, 2);
}

export function loadCustomDashboardTemplates(): DashboardTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => validateDashboardTemplateJson(item).template)
      .filter((item): item is DashboardTemplate => Boolean(item));
  } catch {
    return [];
  }
}

export function saveCustomDashboardTemplates(templates: DashboardTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export function upsertCustomDashboardTemplate(template: DashboardTemplate) {
  const current = loadCustomDashboardTemplates();
  const next = [
    template,
    ...current.filter((item) => item.id !== template.id && item.code !== template.code),
  ];
  saveCustomDashboardTemplates(next);
  return next;
}

export function deleteCustomDashboardTemplate(templateId: string) {
  const next = loadCustomDashboardTemplates().filter((item) => item.id !== templateId);
  saveCustomDashboardTemplates(next);
  return next;
}
