"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppLogo, OneGisWordmark } from "@/components/layout/app-logo";
import { SidebarNav } from "./sidebar-nav";
import { SidebarProvider, useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";

const FULLSCREEN_ROUTES = ["/ban-do", "/"];

interface AppShellProps {
  children: ReactNode;
}

function MobileMenuButton({ floating }: { floating?: boolean }) {
  const { mobileOpen, toggleMobile } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleMobile}
      aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
      aria-expanded={mobileOpen}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground shadow-sm transition-colors hover:bg-slate-50 md:hidden",
        floating &&
          "fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30",
      )}
    >
      {mobileOpen ? (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      )}
    </button>
  );
}

function MobileSidebarBackdrop() {
  const { isMobile, mobileOpen, closeMobile } = useSidebar();

  if (!isMobile || !mobileOpen) return null;

  return (
    <button
      type="button"
      aria-label="Đóng menu"
      className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
      onClick={closeMobile}
    />
  );
}

function AppShellLayout({ children }: AppShellProps) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isDashboardHome = pathname === "/";

  return (
    <div
      className={cn(
        "flex bg-background",
        isFullscreen ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <SidebarNav />
      <MobileSidebarBackdrop />

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col">
        {isFullscreen ? (
          <MobileMenuButton floating />
        ) : (
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2 md:hidden">
            <MobileMenuButton />
            <AppLogo size="sm" />
            <div className="min-w-0">
              <OneGisWordmark size="sm" />
            </div>
          </header>
        )}

        <main
          className={cn(
            "flex min-h-0 min-w-0 max-w-full flex-1 flex-col",
            isFullscreen
              ? cn(
                  "overflow-hidden p-0",
                  isDashboardHome && "max-md:overflow-y-auto",
                )
              : "overflow-auto p-3 sm:p-6 lg:p-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  );
}
