import type { ReactNode } from "react";
import { PageBackLink } from "@/components/layout/page-back-link";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Quay lại",
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <div className="mb-3">
            <PageBackLink href={backHref} label={backLabel} />
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
