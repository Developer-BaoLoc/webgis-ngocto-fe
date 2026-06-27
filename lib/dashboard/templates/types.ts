import type {
  DataSourceConfig,
  WidgetLayoutConfig,
  WidgetType,
} from "@/types/api/dashboard";

export interface DashboardTemplate {
  id: string;
  code: string;
  name: string;
  description: string;
  category:
    | "ioc"
    | "aquaculture"
    | "rice"
    | "crop"
    | "irrigation"
    | "ocop"
    | "alert"
    | "custom";
  icon?: string;
  tags?: string[];
  widgets: DashboardTemplateWidget[];
  requirements?: DashboardTemplateRequirement[];
}

export interface DashboardTemplateWidget {
  templateWidgetId: string;
  title: string;
  purpose?: string;
  widgetTypeReason?: string;
  widgetType: WidgetType;
  layoutConfig: WidgetLayoutConfig;
  dataSourceConfig?: Partial<DataSourceConfig>;
  displayConfig?: Record<string, unknown>;
  placeholders?: DashboardTemplatePlaceholder[];
}

export interface DashboardTemplatePlaceholder {
  key: string;
  label: string;
  description?: string;
  kind:
    | "layer"
    | "saved_view"
    | "dataset"
    | "field"
    | "metric_field"
    | "dimension_field"
    | "date_field"
    | "zone_layer"
    | "zone_label_field";
  required: boolean;
  geometryType?: "point" | "line" | "polygon" | "any";
  fieldTypes?: string[];
  sourceKey?: string;
  scope?: "widget" | "template";
}

export interface DashboardTemplateRequirement {
  label: string;
  description?: string;
  kind: "layer" | "dataset" | "saved_view" | "field";
  required: boolean;
}
