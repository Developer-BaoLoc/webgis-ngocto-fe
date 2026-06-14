import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SectionCardAccent = "blue" | "emerald" | "violet" | "amber" | "slate";

const accentStyles: Record<
  SectionCardAccent,
  { icon: string; bar: string; hover: string }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-600 ring-blue-100",
    bar: "from-blue-500 to-blue-400",
    hover: "hover:border-blue-200 hover:shadow-blue-100/50",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    bar: "from-emerald-500 to-emerald-400",
    hover: "hover:border-emerald-200 hover:shadow-emerald-100/50",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 ring-violet-100",
    bar: "from-violet-500 to-violet-400",
    hover: "hover:border-violet-200 hover:shadow-violet-100/50",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    bar: "from-amber-500 to-amber-400",
    hover: "hover:border-amber-200 hover:shadow-amber-100/50",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600 ring-slate-200",
    bar: "from-slate-500 to-slate-400",
    hover: "hover:border-slate-300 hover:shadow-slate-200/50",
  },
};

interface SectionCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent?: SectionCardAccent;
  meta?: string;
}

export function SectionCard({
  href,
  title,
  description,
  icon,
  accent = "blue",
  meta,
}: SectionCardProps) {
  const styles = accentStyles[accent];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        styles.hover,
      )}
    >
      <div className={cn("h-1 bg-gradient-to-r", styles.bar)} />
      <div className="flex flex-1 flex-col p-5">
        <div
          className={cn(
            "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset",
            styles.icon,
          )}
        >
          {icon}
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
          {title}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="text-sm font-medium text-primary">
            Mở
            <span
              className="ml-1 inline-block transition-transform group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </span>
          {meta && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-muted">
              {meta}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
