import { cn } from "@/lib/utils";

interface LoadingIndicatorProps {
  label?: string;
  className?: string;
}

export function LoadingIndicator({
  label = "Đang tải",
  className,
}: LoadingIndicatorProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm text-muted",
        className,
      )}
    >
      <span className="ioc-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
