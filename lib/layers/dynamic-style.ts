import type { ExpressionSpecification } from "maplibre-gl";
import type {
  LayerFallbackStyle,
  LayerStyle,
  LayerStyleRule,
  LayerStyleValue,
} from "@/types/api/admin";

export const DYNAMIC_STYLE_PALETTE = [
  { fillColor: "#ef4444", strokeColor: "#991b1b" },
  { fillColor: "#22c55e", strokeColor: "#166534" },
  { fillColor: "#f59e0b", strokeColor: "#92400e" },
  { fillColor: "#38bdf8", strokeColor: "#0369a1" },
  { fillColor: "#a78bfa", strokeColor: "#6d28d9" },
  { fillColor: "#f472b6", strokeColor: "#9d174d" },
  { fillColor: "#2dd4bf", strokeColor: "#0f766e" },
  { fillColor: "#fb923c", strokeColor: "#c2410c" },
] as const;

export const DEFAULT_DYNAMIC_FALLBACK: Required<LayerFallbackStyle> = {
  fillColor: "#94a3b8",
  strokeColor: "#475569",
  lineColor: "#64748b",
};

export function isDynamicLayerStyle(style?: LayerStyle | null): boolean {
  return Boolean(
    style?.styleMode === "by_value" &&
    style.styleField &&
    style.styleRules?.length,
  );
}

export function buildColorMatchExpression(
  style: LayerStyle,
  colorKind: "fill" | "stroke" | "line",
  singleFallback: string,
): string | ExpressionSpecification {
  if (!isDynamicLayerStyle(style)) return singleFallback;

  const rules = style.styleRules ?? [];
  const expression: unknown[] = ["match", ["get", style.styleField]];
  const seen = new Set<string>();
  for (const rule of rules) {
    const identity = valueIdentity(rule.value);
    if (seen.has(identity)) continue;
    seen.add(identity);
    expression.push(rule.value, getRuleColor(rule, colorKind));
  }
  expression.push(getFallbackColor(style, colorKind, singleFallback));
  return expression as ExpressionSpecification;
}

export function getRuleColor(
  rule: LayerStyleRule,
  colorKind: "fill" | "stroke" | "line" = "fill",
): string {
  if (colorKind === "stroke") {
    return rule.strokeColor ?? rule.lineColor ?? rule.fillColor ?? "#475569";
  }
  if (colorKind === "line") {
    return rule.lineColor ?? rule.strokeColor ?? rule.fillColor ?? "#64748b";
  }
  return rule.fillColor ?? rule.lineColor ?? rule.strokeColor ?? "#94a3b8";
}

export function getFallbackColor(
  style: LayerStyle,
  colorKind: "fill" | "stroke" | "line",
  singleFallback: string,
): string {
  if (colorKind === "stroke") {
    return (
      style.fallbackStyle?.strokeColor ??
      style.fallbackStyle?.lineColor ??
      singleFallback
    );
  }
  if (colorKind === "line") {
    return (
      style.fallbackStyle?.lineColor ??
      style.fallbackStyle?.strokeColor ??
      singleFallback
    );
  }
  return style.fallbackStyle?.fillColor ?? singleFallback;
}

export function createStyleRule(
  value: LayerStyleValue,
  label: string,
  index: number,
): LayerStyleRule {
  const colors = DYNAMIC_STYLE_PALETTE[index % DYNAMIC_STYLE_PALETTE.length];
  return { value, label, ...colors, lineColor: colors.fillColor };
}

export function valueIdentity(value: LayerStyleValue): string {
  return `${typeof value}:${String(value)}`;
}
