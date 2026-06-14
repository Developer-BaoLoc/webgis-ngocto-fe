"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site.config";
import { wardConfig } from "@/config/ward.config";
import { mainNavigation } from "@/constants/navigation";
import { GeometryTypeIcon } from "@/components/layers/layer-utils";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

function NavIcon({ icon }: { icon: (typeof mainNavigation)[number]["icon"] }) {
  const className = "h-5 w-5";

  switch (icon) {
    case "dashboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      );
    case "map":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.369 1.684a1.125 1.125 0 0 1-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689A1.125 1.125 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.369-1.684c.381-.19.622-.58.622-1.006Z" />
        </svg>
      );
    case "layers":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      );
    case "admin":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
  }
}

export function SidebarNav() {
  const pathname = usePathname();
  const { catalog, layers, error } = useLayerCatalog();
  const { user, tenant, logout } = useAuth();

  const project = catalog?.project;
  const district =
    tenant?.settings.district ?? project?.district ?? wardConfig.district;
  const city =
    tenant?.settings.province ?? project?.province ?? wardConfig.city;
  const wardName = tenant?.settings.ward
    ? `Phường ${tenant.settings.ward}`
    : project?.ward
      ? `Phường ${project.ward}`
      : wardConfig.name;
  const displayName = tenant?.name ?? project?.name ?? siteConfig.shortName;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            LB
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="text-xs text-muted">{wardName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNavigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-slate-100 hover:text-foreground",
              )}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </Link>
          );
        })}

        {layers.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Lớp GIS
            </p>
            {layers.map((layer) => {
              const href = `/lop-du-lieu/${layer.code}`;
              const isActive = pathname === href;

              return (
                <Link
                  key={layer.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:bg-slate-100 hover:text-foreground",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{layer.name}</span>
                  <GeometryTypeIcon type={layer.geometryTypeDisplay} />
                </Link>
              );
            })}
          </div>
        )}

        {error && (
          <p className="px-3 pt-4 text-xs text-red-600">
            Không kết nối được API. Kiểm tra BE :4000.
          </p>
        )}
      </nav>

      <div className="border-t border-border px-5 py-4">
        {user && (
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-foreground">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            {user.roles.length > 0 && (
              <p className="mt-1 text-xs text-muted">{user.roles.join(", ")}</p>
            )}
          </div>
        )}
        <p className="text-xs text-muted">{district}</p>
        <p className="text-xs text-muted">{city}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
