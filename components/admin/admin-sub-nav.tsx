"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/quan-tri/lop-du-lieu", label: "Lớp dữ liệu" },
  { href: "/quan-tri/danh-muc", label: "Danh mục dùng chung" },
  { href: "/quan-tri/dashboard", label: "Dashboard" },
];

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-slate-50 p-1">
      {adminLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              isActive
                ? "bg-white text-primary shadow-sm ring-1 ring-border"
                : "text-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
