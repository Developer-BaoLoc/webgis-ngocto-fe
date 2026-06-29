"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { wardConfig } from "@/config/ward.config";
import { mainNavigation } from "@/constants/navigation";
import { AppLogo, OneGisWordmark } from "@/components/layout/app-logo";
import { SidebarLayerList } from "@/components/layout/sidebar-layer-list";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { SidebarUserPanel } from "@/components/layout/sidebar-user-panel";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

function NavIcon({ icon }: { icon: (typeof mainNavigation)[number]["icon"] }) {
  const className = "h-5 w-5 shrink-0";

  switch (icon) {
    case "dashboard":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
          />
        </svg>
      );
    case "map":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.369 1.684a1.125 1.125 0 0 1-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689A1.125 1.125 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.369-1.684c.381-.19.622-.58.622-1.006Z"
          />
        </svg>
      );
    case "layers":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
          />
        </svg>
      );
    case "admin":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      );
  }
}

export function SidebarNav() {
  const pathname = usePathname();
  const { layers, error } = useLayerCatalog();
  const { user, logout } = useAuth();
  const { collapsed, toggle, isMobile, mobileOpen, closeMobile } = useSidebar();
  const isMapPage =
    pathname === "/ban-do" || pathname.startsWith("/ban-do/");

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const showExpanded = isMobile || !collapsed;

  return (
    <aside
      className={cn(
        "relative top-0 z-40 flex h-dvh min-h-0 shrink-0 flex-col overflow-visible border-r border-border bg-surface transition-[transform,width] duration-200 ease-in-out md:sticky",
        isMobile
          ? cn(
              "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] shadow-xl",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )
          : cn(
              collapsed ? "w-[4.25rem]" : "w-64",
            ),
      )}
      aria-hidden={isMobile && !mobileOpen}
    >
      <div
        className={cn(
          "border-b border-border",
          showExpanded ? "px-4 py-4" : "px-2 py-3",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            showExpanded ? "gap-3" : "flex-col gap-2",
          )}
        >
          <AppLogo
            size="sm"
            className={cn(!showExpanded && "h-8 max-w-[2rem]")}
          />
          {showExpanded && (
            <div className="min-w-0 flex-1">
              <OneGisWordmark size="md" />
              <p className="text-sm font-semibold text-foreground">
                {wardConfig.locationLabel}
              </p>
            </div>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Đóng menu"
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-foreground"
            >
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
            </button>
          )}
        </div>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto overflow-x-hidden",
          showExpanded ? "p-3" : "p-2",
        )}
      >
        {mainNavigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={showExpanded ? undefined : item.label}
              onClick={closeMobile}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                showExpanded
                  ? "gap-3 px-3 py-2.5"
                  : "justify-center px-2 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-slate-100 hover:text-foreground",
              )}
            >
              <NavIcon icon={item.icon} />
              {showExpanded && <span>{item.label}</span>}
            </Link>
          );
        })}

        {isMapPage && layers.length > 0 && (
          <div className={cn(showExpanded ? "pt-4" : "pt-2")}>
            {!showExpanded && (
              <div className="mb-2 flex justify-center">
                <span className="h-px w-6 bg-border" aria-hidden />
              </div>
            )}
            <SidebarLayerList layers={layers} collapsed={!showExpanded} />
          </div>
        )}

        {error && showExpanded && (
          <p className="px-3 pt-4 text-xs text-red-600">
            Không kết nối được API. Kiểm tra BE :4000.
          </p>
        )}
      </nav>

      {!isMobile && (
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="absolute top-[50vh] -right-3 z-[70] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-colors hover:bg-slate-50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      )}

      <SidebarUserPanel
        user={user}
        onLogout={logout}
        collapsed={!showExpanded}
      />
    </aside>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {collapsed ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
      )}
    </svg>
  );
}
