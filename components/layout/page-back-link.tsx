import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageBackLinkProps {
  href: string;
  label: string;
  className?: string;
}

export function PageBackLink({ href, label, className }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary",
        className,
      )}
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
