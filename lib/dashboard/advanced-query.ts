import type {
  AdvancedQueryConfig,
  AdvancedFormulaConfig,
  AdvancedHavingRule,
  AdvancedQueryRule,
  AggregationType,
  DataSourceConfig,
  TimeCompareMode,
  TimePreset,
} from "@/types/api/dashboard";

const AGGREGATIONS = new Set<AggregationType>([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "top",
  "records",
]);

const SOURCE_TYPES = new Set(["dataset", "view", "layer"]);
const OPERATORS = new Set<AdvancedQueryRule["operator"]>([
  "eq",
  "neq",
  "in",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not_empty",
]);
const HAVING_OPERATORS = new Set<AdvancedHavingRule["operator"]>([
  "gt",
  "gte",
  "lt",
  "lte",
  "eq",
  "neq",
]);
const FORMULA_FIELD_CODE = "__formula";
const TIME_PRESETS = new Set<TimePreset>([
  "today",
  "this_week",
  "this_month",
  "this_quarter",
  "this_year",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "custom",
]);
const TIME_COMPARE_MODES = new Set<TimeCompareMode>([
  "none",
  "previous_period",
  "same_period_last_year",
]);

export function isAdvancedQueryEnabled(config?: DataSourceConfig): boolean {
  return config?.queryMode === "advanced" && Boolean(config.advancedQuery);
}

export function advancedQueryToDataSourceConfig(
  config: DataSourceConfig,
): DataSourceConfig {
  if (!isAdvancedQueryEnabled(config)) return config;

  const advancedQuery = normalizeAdvancedQueryConfig(config.advancedQuery);
  if (!advancedQuery) return config;

  const timeFilters =
    advancedQuery.time?.enabled &&
    (advancedQuery.time.compare ?? "none") === "none"
      ? buildTimeFilters(advancedQuery.time)
      : [];
  return {
    ...config,
    datasetId:
      advancedQuery.source.type === "dataset"
        ? advancedQuery.source.id
        : undefined,
    viewId:
      advancedQuery.source.type === "view" ? advancedQuery.source.id : undefined,
    layerId:
      advancedQuery.source.type === "layer"
        ? advancedQuery.source.id
        : undefined,
    aggregation: advancedQuery.select.aggregation,
    metricField: advancedQuery.formula?.enabled
      ? FORMULA_FIELD_CODE
      : advancedQuery.select.metricField,
    fieldCode: advancedQuery.formula?.enabled ? FORMULA_FIELD_CODE : undefined,
    dimensionField: advancedQuery.select.dimensionField,
    displayFields: advancedQuery.select.displayFields,
    filters: [
      ...(advancedQuery.filter?.rules.map((rule) => ({
        fieldCode: rule.fieldCode,
        operator: rule.operator,
        value: rule.value,
      })) ?? []),
      ...timeFilters,
    ],
    having: advancedQuery.having,
    time:
      advancedQuery.time?.enabled &&
      (advancedQuery.time.compare ?? "none") !== "none"
        ? advancedQuery.time
        : undefined,
    sort: advancedQuery.sort?.[0],
    limit: advancedQuery.limit,
    queryMode: "advanced",
    advancedQuery,
  };
}

export function buildAdvancedQueryFromSimpleConfig(
  config: DataSourceConfig,
): AdvancedQueryConfig | null {
  const source = resolveSimpleSource(config);
  if (!source) return null;

  return {
    version: 1,
    source,
    select: {
      aggregation: config.aggregation,
      ...(config.metricField ? { metricField: config.metricField } : {}),
      ...(config.dimensionField
        ? { dimensionField: config.dimensionField }
        : {}),
      ...(config.displayFields?.length
        ? { displayFields: config.displayFields }
        : {}),
    },
    ...(config.filters?.length
      ? {
          filter: {
            combinator: "and",
            rules: config.filters.map((filter) => ({
              fieldCode: filter.fieldCode,
              operator: filter.operator ?? "eq",
              value: filter.value,
            })),
          },
        }
      : {}),
    ...(config.having ? { having: config.having } : {}),
    ...(config.time ? { time: config.time } : {}),
    ...(config.sort ? { sort: [config.sort] } : {}),
    ...(typeof config.limit === "number" ? { limit: config.limit } : {}),
  };
}

export function normalizeAdvancedQueryConfig(
  query: unknown,
): AdvancedQueryConfig | null {
  if (!isRecord(query)) return null;
  if (query.version !== 1) return null;

  const source = normalizeSource(query.source);
  const select = normalizeSelect(query.select);
  if (!source || !select) return null;

  const filter = normalizeFilter(query.filter);
  const having = normalizeHaving(query.having);
  const formula = normalizeFormula(query.formula);
  const time = normalizeTime(query.time);
  const sort = normalizeSort(query.sort);
  const limit =
    typeof query.limit === "number" && Number.isFinite(query.limit)
      ? query.limit
      : undefined;

  return {
    version: 1,
    source,
    select,
    ...(filter ? { filter } : {}),
    ...(having ? { having } : {}),
    ...(formula ? { formula } : {}),
    ...(time ? { time } : {}),
    ...(sort ? { sort } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
}

export function resolveTimeRangeForPreset(
  preset: TimePreset,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): { from: string; to: string } | null {
  const today = startOfDay(now);
  const endToday = endOfDay(now);
  if (preset === "custom") {
    if (!customFrom || !customTo) return null;
    return { from: customFrom, to: customTo };
  }
  if (preset === "today") {
    return { from: dateKey(today), to: dateKey(endToday) };
  }
  if (preset === "this_week") {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = addDays(today, mondayOffset);
    return { from: dateKey(from), to: dateKey(endToday) };
  }
  if (preset === "this_month") {
    return {
      from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: dateKey(endToday),
    };
  }
  if (preset === "this_quarter") {
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
    return {
      from: dateKey(new Date(today.getFullYear(), quarterMonth, 1)),
      to: dateKey(endToday),
    };
  }
  if (preset === "this_year") {
    return {
      from: dateKey(new Date(today.getFullYear(), 0, 1)),
      to: dateKey(endToday),
    };
  }
  const rollingDays = {
    last_7_days: 6,
    last_30_days: 29,
    last_90_days: 89,
  }[preset];
  if (rollingDays !== undefined) {
    return { from: dateKey(addDays(today, -rollingDays)), to: dateKey(endToday) };
  }
  return null;
}

function buildTimeFilters(time: AdvancedQueryConfig["time"]) {
  if (!time?.enabled || !time.dateField) return [];
  const range = resolveTimeRangeForPreset(
    time.preset,
    time.customFrom,
    time.customTo,
  );
  if (!range) return [];
  return [
    { fieldCode: time.dateField, operator: "gte" as const, value: range.from },
    { fieldCode: time.dateField, operator: "lte" as const, value: range.to },
  ];
}

function normalizeTime(value: unknown): AdvancedQueryConfig["time"] | null {
  if (!isRecord(value)) return null;
  if (value.enabled !== true) return null;
  if (typeof value.dateField !== "string" || value.dateField.trim() === "") {
    return null;
  }
  if (
    typeof value.preset !== "string" ||
    !TIME_PRESETS.has(value.preset as TimePreset)
  ) {
    return null;
  }
  const compare =
    typeof value.compare === "string" &&
    TIME_COMPARE_MODES.has(value.compare as TimeCompareMode)
      ? (value.compare as TimeCompareMode)
      : "none";
  return {
    enabled: true,
    dateField: value.dateField.trim(),
    preset: value.preset as TimePreset,
    ...(typeof value.customFrom === "string" && value.customFrom
      ? { customFrom: value.customFrom }
      : {}),
    ...(typeof value.customTo === "string" && value.customTo
      ? { customTo: value.customTo }
      : {}),
    compare,
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveSimpleSource(config: DataSourceConfig) {
  if (config.datasetId) {
    return { type: "dataset" as const, id: config.datasetId };
  }
  if (config.viewId) {
    return { type: "view" as const, id: config.viewId };
  }
  if (config.layerId) {
    return { type: "layer" as const, id: config.layerId };
  }
  return null;
}

function normalizeSource(value: unknown): AdvancedQueryConfig["source"] | null {
  if (!isRecord(value)) return null;
  if (typeof value.type !== "string" || !SOURCE_TYPES.has(value.type)) {
    return null;
  }
  if (typeof value.id !== "string" || value.id.trim() === "") return null;
  return {
    type: value.type as AdvancedQueryConfig["source"]["type"],
    id: value.id,
  };
}

function normalizeSelect(value: unknown): AdvancedQueryConfig["select"] | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.aggregation !== "string" ||
    !AGGREGATIONS.has(value.aggregation as AggregationType)
  ) {
    return null;
  }
  const displayFields = Array.isArray(value.displayFields)
    ? value.displayFields.filter(
        (field): field is string => typeof field === "string",
      )
    : undefined;
  return {
    aggregation: value.aggregation as AggregationType,
    ...(typeof value.metricField === "string" && value.metricField
      ? { metricField: value.metricField }
      : {}),
    ...(typeof value.dimensionField === "string" && value.dimensionField
      ? { dimensionField: value.dimensionField }
      : {}),
    ...(displayFields?.length ? { displayFields } : {}),
  };
}

function normalizeFilter(
  value: unknown,
): AdvancedQueryConfig["filter"] | null {
  if (!isRecord(value)) return null;
  if (value.combinator !== "and" || !Array.isArray(value.rules)) return null;
  const rules = value.rules
    .map(normalizeRule)
    .filter((rule): rule is AdvancedQueryRule => Boolean(rule));
  return { combinator: "and", rules };
}

function normalizeFormula(value: unknown): AdvancedFormulaConfig | null {
  if (!isRecord(value)) return null;
  if (value.enabled !== true) return null;
  if (typeof value.label !== "string" || value.label.trim() === "") return null;
  if (
    typeof value.expression !== "string" ||
    value.expression.trim() === ""
  ) {
    return null;
  }
  const fields = Array.isArray(value.fields)
    ? value.fields.filter((field): field is string => typeof field === "string")
    : [];
  return {
    enabled: true,
    label: value.label.trim(),
    ...(typeof value.unit === "string" && value.unit.trim()
      ? { unit: value.unit.trim() }
      : {}),
    expression: value.expression.trim(),
    fields,
  };
}

function normalizeHaving(
  value: unknown,
): AdvancedQueryConfig["having"] | null {
  if (!isRecord(value)) return null;
  if (value.combinator !== "and" || !Array.isArray(value.rules)) return null;
  const rules = value.rules
    .map(normalizeHavingRule)
    .filter((rule): rule is AdvancedHavingRule => Boolean(rule));
  return rules.length ? { combinator: "and", rules } : null;
}

function normalizeHavingRule(value: unknown): AdvancedHavingRule | null {
  if (!isRecord(value)) return null;
  if (typeof value.field !== "string" || value.field.trim() === "") {
    return null;
  }
  if (
    typeof value.aggregation !== "string" ||
    !AGGREGATIONS.has(value.aggregation as AggregationType)
  ) {
    return null;
  }
  if (
    typeof value.operator !== "string" ||
    !HAVING_OPERATORS.has(value.operator as AdvancedHavingRule["operator"])
  ) {
    return null;
  }
  const numberValue = Number(value.value);
  if (!Number.isFinite(numberValue)) return null;
  return {
    field: value.field,
    aggregation: value.aggregation as AggregationType,
    operator: value.operator as AdvancedHavingRule["operator"],
    value: numberValue,
  };
}

function normalizeRule(value: unknown): AdvancedQueryRule | null {
  if (!isRecord(value)) return null;
  if (typeof value.fieldCode !== "string" || value.fieldCode.trim() === "") {
    return null;
  }
  if (
    typeof value.operator !== "string" ||
    !OPERATORS.has(value.operator as AdvancedQueryRule["operator"])
  ) {
    return null;
  }
  return {
    fieldCode: value.fieldCode,
    operator: value.operator as AdvancedQueryRule["operator"],
    ...(value.value !== undefined ? { value: value.value } : {}),
  };
}

function normalizeSort(value: unknown): AdvancedQueryConfig["sort"] | null {
  if (!Array.isArray(value)) return null;
  const sort = value
    .map((item) => {
      if (!isRecord(item)) return null;
      if (typeof item.field !== "string" || item.field.trim() === "") {
        return null;
      }
      if (item.direction !== "asc" && item.direction !== "desc") return null;
      return { field: item.field, direction: item.direction };
    })
    .filter(
      (item): item is { field: string; direction: "asc" | "desc" } =>
        Boolean(item),
    );
  return sort.length ? sort : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
