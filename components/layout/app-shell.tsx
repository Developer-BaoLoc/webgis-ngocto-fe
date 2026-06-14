"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { SidebarProvider } from "./sidebar-provider";
import { cn } from "@/lib/utils";

const FULLSCREEN_ROUTES = ["/ban-do"];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <SidebarProvider>
      <div
        className={cn(
          "flex bg-background",
          isFullscreen ? "h-dvh overflow-hidden" : "min-h-screen",
        )}
      >
        <SidebarNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isFullscreen
                ? "overflow-hidden"
                : "overflow-auto p-6 lg:p-8",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
