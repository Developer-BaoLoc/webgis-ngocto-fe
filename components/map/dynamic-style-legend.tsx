import {
  getFallbackColor,
  getRuleColor,
  isDynamicLayerStyle,
} from "@/lib/layers/dynamic-style";
import { extractStyleFromLayer } from "@/lib/layers/style";
import type { Layer } from "@/types/layer.types";

export function DynamicStyleLegend({ layers }: { layers: Layer[] }) {
  const items = layers.flatMap((layer) => {
    const style = extractStyleFromLayer(layer);
    if (!isDynamicLayerStyle(style)) return [];
    return [{ layer, style }];
  });

  if (!items.length) return null;

  return (
    <aside
      aria-label="Chú giải màu layer"
      className="absolute bottom-4 left-4 z-10 max-h-[45%] w-[min(18rem,calc(100%-5rem))] space-y-3 overflow-y-auto rounded-xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur"
    >
      {items.map(({ layer, style }) => {
        const isLine = ["line", "linestring", "multilinestring"].includes(
          layer.geometryType.toLocaleLowerCase(),
        );
        return (
          <section key={layer.id}>
            <h3
              className="truncate text-sm font-semibold text-slate-900"
              title={layer.name}
            >
              {layer.name}
            </h3>
            <p
              className="mb-2 truncate text-[11px] text-slate-500"
              title={style.styleField}
            >
              Theo trường: {style.styleField}
            </p>
            <ul className="space-y-1.5">
              {(style.styleRules ?? []).map((rule, index) => (
                <li
                  key={`${typeof rule.value}:${String(rule.value)}:${index}`}
                  className="flex min-w-0 items-center gap-2 text-xs text-slate-700"
                  title={rule.label ?? String(rule.value)}
                >
                  <span
                    className={
                      isLine
                        ? "h-1 w-5 shrink-0 rounded-full"
                        : "h-3.5 w-3.5 shrink-0 rounded-sm border"
                    }
                    style={{
                      backgroundColor: getRuleColor(
                        rule,
                        isLine ? "line" : "fill",
                      ),
                      borderColor: getRuleColor(rule, "stroke"),
                    }}
                    aria-hidden
                  />
                  <span className="truncate">
                    {rule.label || String(rule.value)}
                  </span>
                </li>
              ))}
              <li className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                <span
                  className={
                    isLine
                      ? "h-1 w-5 shrink-0 rounded-full"
                      : "h-3.5 w-3.5 shrink-0 rounded-sm border"
                  }
                  style={{
                    backgroundColor: getFallbackColor(
                      style,
                      isLine ? "line" : "fill",
                      layer.color,
                    ),
                    borderColor: getFallbackColor(style, "stroke", "#475569"),
                  }}
                  aria-hidden
                />
                <span className="truncate">Giá trị khác</span>
              </li>
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
