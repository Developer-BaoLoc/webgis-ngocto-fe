"use client";

import type { AuthUser } from "@/types/api/auth";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(fullName: string): string {
  const suffix = " Ngọc Tố";
  if (fullName.endsWith(suffix)) {
    return fullName.slice(0, -suffix.length);
  }
  return fullName;
}

interface SidebarUserPanelProps {
  user: AuthUser | null;
  onLogout: () => void;
  collapsed?: boolean;
}

export function SidebarUserPanel({
  user,
  onLogout,
  collapsed = false,
}: SidebarUserPanelProps) {
  if (!user) return null;

  const displayName = getDisplayName(user.fullName);
  const initials = getInitials(displayName);

  if (collapsed) {
    return (
      <div className="border-t border-border p-2">
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2b59c3] to-[#4fb050] text-[0.625rem] font-bold text-white"
            title={`${displayName} (${user.email})`}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Đăng xuất"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 border-t border-border px-3 py-3">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2b59c3] to-[#4fb050] text-[0.625rem] font-bold text-white"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-50"
      >
        <LogoutIcon />
        Đăng xuất
      </button>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  );
}
