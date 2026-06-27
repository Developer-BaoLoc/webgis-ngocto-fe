import { isNoDataWidget } from "@/lib/dashboard/no-data-widgets";
import { fieldPlaceholder, layerPlaceholder } from "@/lib/dashboard/templates/placeholders";
import type {
  DashboardTemplatePlaceholder,
  DashboardTemplateWidget,
} from "@/lib/dashboard/templates";
import { WIDGET_TYPE_LABELS } from "@/lib/dashboard/utils";
import type { AggregationType, WidgetType } from "@/types/api/dashboard";
import { DASHBOARD_AI_WIDGET_TYPES } from "./schema";
import type {
  DashboardAiDataProfile,
  DashboardAiFieldProfile,
} from "./data-profiling";

export interface WidgetTypeRecommendation {
  widgetType: WidgetType;
  label: string;
  reason: string;
}

export interface WidgetTypeNormalizationResult {
  widget: DashboardTemplateWidget;
  warnings: string[];
}

const RECORD_WIDGETS = new Set<WidgetType>([
  "table",
  "alert_center",
  "activity_feed",
  "activity_history",
  "timeline",
  "calendar",
  "seasonal_calendar",
]);

const DIMENSION_WIDGETS = new Set<WidgetType>([
  "bar",
  "pie",
  "donut",
  "line",
  "ranking",
  "treemap",
]);

const SPATIAL_WIDGETS = new Set<WidgetType>([
  "spatial_summary",
  "spatial_ranking",
  "thematic_map",
  "spatial_alert",
]);

function normalizedIntent(widget: DashboardTemplateWidget) {
  return `${widget.title} ${widget.purpose ?? ""} ${widget.widgetTypeReason ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function profileForWidget(
  widget: DashboardTemplateWidget,
  profiles: DashboardAiDataProfile[],
) {
  if (!profiles.length) return undefined;
  const widgetText = normalizeSearch(
    [
      widget.title,
      widget.purpose,
      widget.widgetTypeReason,
      ...(widget.placeholders ?? []).flatMap((item) => [item.key, item.label]),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return profiles
    .map((profile) => {
      let score = 0;
      for (const token of normalizeSearch(
        `${profile.sourceCode ?? ""} ${profile.sourceName}`,
      ).split(" ")) {
        if (token.length > 2 && widgetText.includes(token)) score += 8;
      }
      for (const field of profile.fields) {
        const fieldText = normalizeSearch(`${field.key} ${field.label ?? ""}`);
        if (fieldText && widgetText.includes(fieldText)) score += 30;
        for (const token of fieldText.split(" ")) {
          if (token.length > 3 && widgetText.includes(token)) score += 4;
        }
      }
      return { profile, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.profile;
}

function fieldLabel(field?: DashboardAiFieldProfile) {
  return field?.label || field?.key || "";
}

function profileEvidence(
  widget: DashboardTemplateWidget,
  profiles: DashboardAiDataProfile[],
) {
  const profile = profileForWidget(widget, profiles);
  if (!profile) return null;
  const numeric = profile.fields.find((field) => Boolean(field.numeric));
  const date = profile.fields.find((field) => Boolean(field.dateRange));
  const status = profile.fields.find((field) =>
    /status|severity|trang thai|tinh trang|muc do|cap do/.test(
      normalizeSearch(`${field.key} ${field.label ?? ""}`),
    ),
  );
  const category = profile.fields.find(
    (field) =>
      Boolean(field.topValues?.length) &&
      !field.numeric &&
      !field.dateRange &&
      field !== status,
  );
  return { profile, numeric, date, status, category };
}

function recommendation(
  widgetType: WidgetType,
  reason: string,
): WidgetTypeRecommendation {
  return {
    widgetType,
    label: WIDGET_TYPE_LABELS[widgetType] ?? widgetType,
    reason,
  };
}

export function recommendWidgetTypes(
  widget: DashboardTemplateWidget,
  profiles: DashboardAiDataProfile[] = [],
): WidgetTypeRecommendation[] {
  const intent = normalizedIntent(widget);
  const evidence = profileEvidence(widget, profiles);
  let recommendations: WidgetTypeRecommendation[] = [];

  if (
    evidence?.status &&
    /canh bao|su co|phan anh|trang thai|muc do/.test(intent)
  ) {
    recommendations = [
      recommendation(
        "alert_center",
        `Dữ liệu có field ${fieldLabel(evidence.status)} thể hiện trạng thái/mức độ.`,
      ),
      recommendation("activity_feed", "Phù hợp để theo dõi bản ghi trạng thái gần đây."),
      recommendation("table", "Giữ đầy đủ các cột trạng thái để đối chiếu."),
    ];
  } else if (
    evidence?.date &&
    evidence.numeric &&
    (/xu huong|thoi gian|theo ngay|theo thang|theo nam|dien bien/.test(intent) ||
      widget.widgetType === "line")
  ) {
    recommendations = [
      recommendation(
        "line",
        `Có field ${fieldLabel(evidence.date)} dạng thời gian và ${fieldLabel(evidence.numeric)} dạng số.`,
      ),
      recommendation("bar", "Phù hợp khi muốn so sánh từng kỳ rời rạc."),
      recommendation("table", "Phù hợp để kiểm tra dữ liệu từng thời điểm."),
    ];
  } else if (
    evidence?.category &&
    evidence.numeric &&
    !/tong |tong$|kpi/.test(intent)
  ) {
    recommendations = [
      recommendation(
        /xep hang|top|cao nhat|thap nhat/.test(intent) ? "ranking" : "bar",
        `Có field ${fieldLabel(evidence.numeric)} dạng số và ${fieldLabel(evidence.category)} dạng nhóm.`,
      ),
      recommendation("ranking", "Phù hợp khi cần sắp xếp nhóm theo giá trị."),
      recommendation("pie", "Phù hợp nếu cần xem tỷ trọng và số nhóm không nhiều."),
      recommendation("treemap", "Phù hợp để xem cơ cấu khi có nhiều nhóm."),
    ];
  } else if (/xep hang|top|bottom|cao nhat|thap nhat|so sanh/.test(intent)) {
    recommendations = [
      recommendation("ranking", "Phù hợp để xếp thứ tự và nhấn mạnh vị trí."),
      recommendation("bar", "Phù hợp để so sánh giá trị giữa các nhóm."),
      recommendation("table", "Phù hợp khi cần xem thêm cột chi tiết."),
    ];
  } else if (/ty trong|co cau|phan bo|phan tram/.test(intent)) {
    recommendations = [
      recommendation("pie", "Phù hợp để xem tỷ trọng của ít nhóm."),
      recommendation("donut", "Tỷ trọng rõ, có khoảng trống cho tổng số."),
      recommendation("treemap", "Phù hợp khi có nhiều nhóm cơ cấu."),
    ];
  } else if (/xu huong|thoi gian|theo ngay|theo thang|theo nam|dien bien/.test(intent)) {
    recommendations = [
      recommendation("line", "Phù hợp để theo dõi xu hướng theo thời gian."),
      recommendation("bar", "Phù hợp để so sánh các kỳ rời rạc."),
      recommendation("table", "Giữ dữ liệu thời gian ở dạng chi tiết."),
    ];
  } else if (/canh bao|su co|phan anh/.test(intent)) {
    recommendations = [
      recommendation("alert_center", "Hiển thị danh sách cảnh báo theo mức độ."),
      recommendation("activity_feed", "Phù hợp cho luồng hoạt động mới nhất."),
      recommendation("spatial_alert", "Phù hợp khi cảnh báo cần gom theo khu vực."),
    ];
  } else if (/ban do|vi tri|khong gian|khu vuc/.test(intent)) {
    recommendations = [
      recommendation("minimap", "Hiển thị ngữ cảnh bản đồ và không cần analytics."),
      recommendation("thematic_map", "Tô màu khu vực theo một chỉ số."),
      recommendation("spatial_summary", "Tổng hợp dữ liệu theo vùng hành chính."),
    ];
  } else if (/tien do|hoan thanh|phan tram/.test(intent)) {
    recommendations = [
      recommendation("progress_ring", "Nhấn mạnh tỷ lệ hoặc mức hoàn thành."),
      recommendation("stat", "Hiển thị một giá trị tiến độ nổi bật."),
      recommendation("progress", "Theo dõi danh sách công việc và tiến độ."),
    ];
  } else if (/mua vu|lich|ke hoach/.test(intent)) {
    recommendations = [
      recommendation("seasonal_calendar", "Phù hợp lịch mùa vụ hoặc chu kỳ sản xuất."),
      recommendation("calendar", "Phù hợp sự kiện có ngày bắt đầu/kết thúc."),
      recommendation("timeline", "Phù hợp chuỗi mốc theo thời gian."),
    ];
  } else if (/danh sach|chi tiet|bang/.test(intent)) {
    recommendations = [
      recommendation("table", "Hiển thị nhiều trường dữ liệu chi tiết."),
      recommendation("activity_feed", "Phù hợp danh sách hoạt động gần đây."),
      recommendation("alert_center", "Phù hợp danh sách có mức độ cảnh báo."),
    ];
  } else {
    recommendations = [
      recommendation("stat", "Phù hợp một KPI tổng hợp."),
      recommendation("bar", "Phù hợp so sánh chỉ số giữa các nhóm."),
      recommendation("table", "Phù hợp khi mục tiêu cần dữ liệu chi tiết."),
    ];
  }

  if (
    evidence?.numeric &&
    (/tong |tong$|kpi|so luong/.test(intent) || widget.widgetType === "stat")
  ) {
    recommendations = [
      recommendation(
        "stat",
        `Field ${fieldLabel(evidence.numeric)} có dữ liệu số, phù hợp hiển thị một KPI tổng hợp.`,
      ),
      ...recommendations.filter((item) => item.widgetType !== "stat"),
    ];
  }
  if (
    evidence?.profile.hasGeometry &&
    /ban do|vi tri|khong gian/.test(intent)
  ) {
    recommendations = [
      recommendation("minimap", "Nguồn có geometry nên có thể hiển thị ngữ cảnh bản đồ."),
      ...recommendations.filter((item) => item.widgetType !== "minimap"),
    ];
  }

  recommendations = recommendations.filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.widgetType === item.widgetType) === index,
  );

  if (!recommendations.some((item) => item.widgetType === widget.widgetType)) {
    recommendations.unshift(
      recommendation(
        widget.widgetType,
        widget.widgetTypeReason || "Loại widget AI đang đề xuất.",
      ),
    );
  }
  return recommendations;
}

export function describeWidgetProfileEvidence(
  widget: DashboardTemplateWidget,
  profiles: DashboardAiDataProfile[],
) {
  const evidence = profileEvidence(widget, profiles);
  if (!evidence) return null;
  if (evidence.date && evidence.numeric) {
    return `Nguồn ${evidence.profile.sourceName} có ${fieldLabel(evidence.date)} dạng thời gian và ${fieldLabel(evidence.numeric)} dạng số.`;
  }
  if (evidence.category && evidence.numeric) {
    return `Nguồn ${evidence.profile.sourceName} có ${fieldLabel(evidence.numeric)} dạng số và ${fieldLabel(evidence.category)} dạng nhóm.`;
  }
  if (evidence.status) {
    return `Nguồn ${evidence.profile.sourceName} có field trạng thái/mức độ ${fieldLabel(evidence.status)}.`;
  }
  if (evidence.numeric) {
    return `Nguồn ${evidence.profile.sourceName} có field số ${fieldLabel(evidence.numeric)} để tổng hợp KPI.`;
  }
  if (evidence.profile.hasGeometry) {
    return `Nguồn ${evidence.profile.sourceName} có geometry và có thể hiển thị trên bản đồ.`;
  }
  return `${evidence.profile.sourceName}: ${evidence.profile.rowCount.toLocaleString("vi-VN")} bản ghi, đã lấy mẫu ${evidence.profile.sampledRowCount}.`;
}

export function describeWidgetPurpose(widget: DashboardTemplateWidget) {
  if (widget.purpose?.trim()) return widget.purpose.trim();
  if (isNoDataWidget(widget.widgetType)) {
    return "Bổ sung ngữ cảnh trực quan, không cần truy vấn analytics.";
  }
  if (RECORD_WIDGETS.has(widget.widgetType)) {
    return `Hiển thị danh sách chi tiết cho “${widget.title}”.`;
  }
  if (widget.widgetType === "stat" || widget.widgetType === "progress_ring") {
    return `Nhấn mạnh một chỉ số tổng hợp cho “${widget.title}”.`;
  }
  return `Trực quan hóa dữ liệu cho “${widget.title}”.`;
}

export function describeWidgetFields(widget: DashboardTemplateWidget) {
  const config = widget.dataSourceConfig;
  if (!config || isNoDataWidget(widget.widgetType)) return "Không cần field analytics";
  const values = [
    config.dimensionField,
    config.metricField,
    config.titleField,
    config.severityField,
    config.dateField,
    config.spatial?.metricField,
    config.spatial?.zoneLabelField,
  ].filter((value): value is string => typeof value === "string" && Boolean(value));
  if (!values.length) {
    return config.aggregation === "count" ? "Đếm bản ghi" : "Sẽ map trong Wizard";
  }
  const labels = values.map((value) => {
    const placeholder = /^__field:([A-Za-z0-9_-]+)__$/.exec(value)?.[1];
    return (
      widget.placeholders?.find((item) => item.key === placeholder)?.label ?? value
    );
  });
  return Array.from(new Set(labels)).join(" · ");
}

function cloneWidget(widget: DashboardTemplateWidget): DashboardTemplateWidget {
  return structuredClone(widget);
}

function firstSourcePlaceholder(widget: DashboardTemplateWidget) {
  return widget.placeholders?.find((placeholder) =>
    ["layer", "dataset", "saved_view"].includes(placeholder.kind),
  );
}

function ensureSource(widget: DashboardTemplateWidget) {
  const existing = firstSourcePlaceholder(widget);
  if (existing) return existing;
  const key = `${widget.templateWidgetId.replace(/[^A-Za-z0-9_-]/g, "_")}_source`;
  const placeholder: DashboardTemplatePlaceholder = {
    key,
    label: `Nguồn dữ liệu cho ${widget.title}`,
    kind: "layer",
    required: true,
    geometryType: "any",
    scope: "widget",
  };
  widget.placeholders = [...(widget.placeholders ?? []), placeholder];
  widget.dataSourceConfig = {
    aggregation: "count",
    layerId: layerPlaceholder(key),
  };
  return placeholder;
}

function sourceToken(source: DashboardTemplatePlaceholder) {
  if (source.kind === "dataset") return `__dataset:${source.key}__`;
  if (source.kind === "saved_view") return `__view:${source.key}__`;
  return layerPlaceholder(source.key);
}

function ensureField(
  widget: DashboardTemplateWidget,
  role: "metric" | "dimension",
  source: DashboardTemplatePlaceholder,
) {
  const config = widget.dataSourceConfig as Record<string, unknown>;
  const configKey = role === "metric" ? "metricField" : "dimensionField";
  if (typeof config[configKey] === "string" && config[configKey]) return false;
  const key = `${widget.templateWidgetId.replace(/[^A-Za-z0-9_-]/g, "_")}_${role}`;
  const placeholder: DashboardTemplatePlaceholder = {
    key,
    label: role === "metric" ? "Trường chỉ số" : "Trường phân nhóm",
    kind: role === "metric" ? "metric_field" : "dimension_field",
    required: true,
    sourceKey: source.key,
    fieldTypes:
      role === "metric"
        ? ["number", "integer", "decimal", "currency", "float", "numeric"]
        : ["text", "string", "select", "enum", "category", "date"],
  };
  widget.placeholders = [
    ...(widget.placeholders ?? []).filter((item) => item.key !== key),
    placeholder,
  ];
  config[configKey] = fieldPlaceholder(key);
  return true;
}

function addFieldPlaceholder(
  widget: DashboardTemplateWidget,
  options: {
    keySuffix: string;
    label: string;
    sourceKey: string;
    fieldTypes: string[];
    required: boolean;
  },
) {
  const key = `${widget.templateWidgetId.replace(/[^A-Za-z0-9_-]/g, "_")}_${options.keySuffix}`;
  widget.placeholders = [
    ...(widget.placeholders ?? []).filter((item) => item.key !== key),
    {
      key,
      label: options.label,
      kind: "field",
      required: options.required,
      sourceKey: options.sourceKey,
      fieldTypes: options.fieldTypes,
    },
  ];
  return fieldPlaceholder(key);
}

function buildSpatialConfig(
  widget: DashboardTemplateWidget,
  target: WidgetType,
) {
  const prefix = widget.templateWidgetId.replace(/[^A-Za-z0-9_-]/g, "_");
  const sourceKey = `${prefix}_spatial_source`;
  const zoneKey = `${prefix}_zone`;
  const zoneLabelKey = `${prefix}_zone_label`;
  widget.placeholders = [
    {
      key: sourceKey,
      label: "Layer nguồn cần thống kê",
      kind: "layer",
      required: true,
      geometryType: "any",
      scope: "widget",
    },
    {
      key: zoneKey,
      label: "Layer phân vùng",
      kind: "zone_layer",
      required: true,
      geometryType: "polygon",
      scope: "widget",
    },
    {
      key: zoneLabelKey,
      label: "Trường tên vùng",
      kind: "zone_label_field",
      required: true,
      sourceKey: zoneKey,
      fieldTypes: ["text", "string", "select", "enum", "category"],
    },
  ];
  widget.dataSourceConfig = {
    aggregation: target === "spatial_ranking" ? "top" : "count",
    spatial: {
      mode:
        target === "spatial_ranking"
          ? "ranking"
          : target === "thematic_map"
            ? "thematic_map"
            : target === "spatial_alert"
              ? "alert"
              : "summary",
      sourceLayerId: layerPlaceholder(sourceKey),
      zoneLayerId: layerPlaceholder(zoneKey),
      zoneLabelField: fieldPlaceholder(zoneLabelKey),
      metricAggregation: "count",
      ...(target === "spatial_ranking" ? { limit: 5 } : {}),
    },
  };
}

function referencedPlaceholderKeys(value: unknown, found = new Set<string>()) {
  if (typeof value === "string") {
    const match = /^__(?:layer|field|dataset|view):([A-Za-z0-9_-]+)__$/.exec(value);
    if (match) found.add(match[1]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => referencedPlaceholderKeys(item, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => referencedPlaceholderKeys(item, found));
  }
  return found;
}

function retainReferencedPlaceholders(widget: DashboardTemplateWidget) {
  const keys = referencedPlaceholderKeys(widget.dataSourceConfig);
  const placeholders = widget.placeholders ?? [];
  for (const placeholder of placeholders) {
    if (keys.has(placeholder.key) && placeholder.sourceKey) {
      keys.add(placeholder.sourceKey);
    }
  }
  widget.placeholders = placeholders.filter((placeholder) => keys.has(placeholder.key));
}

function aggregationForTarget(
  target: WidgetType,
  current: AggregationType | undefined,
  hasMetric: boolean,
): AggregationType {
  if (target === "ranking" || target === "spatial_ranking") return "top";
  if (RECORD_WIDGETS.has(target)) return "records";
  if (target === "progress_ring") return "avg";
  if (!current || current === "records" || current === "top") {
    return hasMetric ? "sum" : "count";
  }
  return current;
}

export function normalizeTemplateWidgetType(
  original: DashboardTemplateWidget,
  target: WidgetType,
): WidgetTypeNormalizationResult {
  const widget = cloneWidget(original);
  const warnings: string[] = [];
  widget.widgetType = target;

  if (isNoDataWidget(target)) {
    widget.dataSourceConfig = undefined;
    widget.placeholders = [];
    widget.displayConfig = target === "text" ? { content: widget.title } : {};
    return { widget, warnings };
  }

  if (SPATIAL_WIDGETS.has(target)) {
    if (!SPATIAL_WIDGETS.has(original.widgetType)) {
      warnings.push("Loại không gian cần map lại layer nguồn, layer vùng và field vùng.");
      buildSpatialConfig(widget, target);
    }
    return { widget, warnings };
  }

  const source = ensureSource(widget);
  const config = (widget.dataSourceConfig ??= {
    aggregation: "count",
    layerId: sourceToken(source),
  });
  if (!config.layerId && !config.datasetId && !config.viewId) {
    if (source.kind === "dataset") config.datasetId = sourceToken(source);
    else if (source.kind === "saved_view") config.viewId = sourceToken(source);
    else config.layerId = sourceToken(source);
  }

  if (RECORD_WIDGETS.has(target)) {
    config.aggregation = "records";
    delete config.metricField;
    delete config.dimensionField;
    if (target === "alert_center") {
      config.titleField = addFieldPlaceholder(widget, {
        keySuffix: "title",
        label: "Trường tiêu đề cảnh báo",
        sourceKey: source.key,
        fieldTypes: ["text", "string", "textarea"],
        required: true,
      });
      config.severityField = addFieldPlaceholder(widget, {
        keySuffix: "severity",
        label: "Trường mức độ cảnh báo",
        sourceKey: source.key,
        fieldTypes: ["text", "string", "select", "enum", "category"],
        required: true,
      });
      config.dateField = addFieldPlaceholder(widget, {
        keySuffix: "date",
        label: "Trường ngày cảnh báo",
        sourceKey: source.key,
        fieldTypes: ["date", "datetime", "timestamp", "text"],
        required: false,
      });
    }
    warnings.push("Widget dạng danh sách sẽ map lại các field hiển thị trong Wizard.");
  } else {
    const needsDimension = DIMENSION_WIDGETS.has(target);
    const needsMetric = target !== "stat" || config.aggregation !== "count";
    if (needsDimension && ensureField(widget, "dimension", source)) {
      warnings.push("Loại widget mới cần map thêm trường phân nhóm.");
    }
    if (needsMetric && ensureField(widget, "metric", source)) {
      warnings.push("Loại widget mới cần map thêm trường chỉ số.");
    }
    config.aggregation = aggregationForTarget(
      target,
      config.aggregation,
      Boolean(config.metricField),
    );
    if (target === "ranking") {
      config.sort = {
        field: config.metricField ?? "",
        direction: "desc",
      };
      config.limit ??= 5;
    }
  }

  retainReferencedPlaceholders(widget);
  return { widget, warnings };
}

export function allReviewableWidgetTypes() {
  return DASHBOARD_AI_WIDGET_TYPES.map((widgetType) => ({
    widgetType,
    label: WIDGET_TYPE_LABELS[widgetType] ?? widgetType,
  }));
}
