import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  color?: string;
  variant?: "default" | "muted";
}

export function LayerBadge({ label, color, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant === "muted"
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
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
