import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface AdminListPanelProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-11 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  );
}

export function AdminListPanel({
  title,
  description,
  isLoading,
  isEmpty,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription,
  emptyAction,
  children,
  className,
}: AdminListPanelProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className="border-b border-border/60 bg-slate-50/50">
          {title && (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="pt-5">
        {isLoading ? (
          <TableSkeleton />
        ) : isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            className="border-none bg-transparent py-10"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
