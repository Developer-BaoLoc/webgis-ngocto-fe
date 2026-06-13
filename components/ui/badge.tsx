import type { LayerCatalogStatus } from "@/types/api/layer-catalog";
import { cn } from "@/lib/utils";

const statusStyles: Record<LayerCatalogStatus, string> = {
  planned: "bg-slate-100 text-slate-600 ring-slate-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

interface BadgeProps {
  label: string;
  status?: LayerCatalogStatus;
  color?: string;
}

export function LayerBadge({ label, status, color }: BadgeProps) {
  if (status) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
          statusStyles[status],
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}
