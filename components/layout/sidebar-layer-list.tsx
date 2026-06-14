"use client";

import { LayerSymbol } from "@/components/layers/layer-symbol";
import { useMapLayerVisibility } from "@/providers/map-layer-visibility-provider";
import type { Layer } from "@/types/layer.types";
import { cn } from "@/lib/utils";

interface SidebarLayerListProps {
  layers: Layer[];
  collapsed: boolean;
}

function LayerMapSymbol({
  layer,
  size = "md",
}: {
  layer: Layer;
  size?: "sm" | "md";
}) {
  return <LayerSymbol layer={layer} size={size} />;
}

function LayerVisibilityCheckbox({
  visible,
  layerName,
  onToggle,
  size = "md",
}: {
  visible: boolean;
  layerName: string;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const boxClass = size === "sm" ? "h-5 w-5" : "h-[1.375rem] w-[1.375rem]";

  return (
    <label
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center",
        boxClass,
      )}
      title={visible ? "Đang hiển thị — bỏ chọn để ẩn" : "Đang ẩn — chọn để hiện"}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={visible}
        onChange={() => onToggle()}
        aria-label={`Hiển thị lớp ${layerName} trên bản đồ`}
        className={cn(
          "cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white transition-colors",
          "checked:border-primary checked:bg-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
          boxClass,
        )}
      />
      <svg
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          visible ? "opacity-100" : "opacity-0",
        )}
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path
          d="M2.5 6.2 4.8 8.5 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}

export function SidebarLayerList({ layers, collapsed }: SidebarLayerListProps) {
  const { isLayerVisible, toggleLayerVisibility } = useMapLayerVisibility();

  const visibleCount = layers.filter((layer) =>
    isLayerVisible(layer.id),
  ).length;

  if (collapsed) {
    return (
      <div className="space-y-2">
        {layers.map((layer) => {
          const visible = isLayerVisible(layer.id);
          return (
            <div
              key={layer.id}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-1 py-1 transition-opacity",
                visible ? "opacity-100" : "opacity-55",
              )}
              title={layer.name}
            >
              <LayerVisibilityCheckbox
                size="sm"
                visible={visible}
                layerName={layer.name}
                onToggle={() => toggleLayerVisibility(layer.id)}
              />
              <LayerMapSymbol layer={layer} size="sm" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Lớp dữ liệu
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">
          {visibleCount}/{layers.length}
        </span>
      </div>

      {layers.map((layer) => {
        const visible = isLayerVisible(layer.id);

        return (
          <div
            key={layer.id}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg border px-2 py-1.5 transition-colors",
              visible
                ? "border-transparent hover:border-border hover:bg-slate-50/80"
                : "border-transparent bg-slate-50/50 opacity-65",
            )}
          >
            <LayerVisibilityCheckbox
              visible={visible}
              layerName={layer.name}
              onToggle={() => toggleLayerVisibility(layer.id)}
            />

            <LayerMapSymbol layer={layer} />

            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {layer.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
