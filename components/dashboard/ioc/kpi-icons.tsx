import type { ReactNode } from "react";

type KpiIconProps = {
  className?: string;
};

function IconBase({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function KpiIconHtx({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </IconBase>
  );
}

export function KpiIconTht({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function KpiIconPump({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S13 6 12 2" />
      <path d="M12 22a7 7 0 0 1-7-7c0-2 1-3.9 3-5.5S11 6 12 2" />
    </IconBase>
  );
}

export function KpiIconOcop({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

export function KpiIconMembers({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function KpiIconArea({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M3 6l9-4 9 4v12l-9 4-9-4z" />
      <path d="M12 22V10" />
      <path d="M3 6l9 4 9-4" />
    </IconBase>
  );
}

export function KpiIconRevenue({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

export function KpiIconModel({ className }: KpiIconProps) {
  return (
    <IconBase className={className}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </IconBase>
  );
}
