"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface DataTableContextValue {
  stickyHeader: boolean;
  stickyActions: boolean;
}

const DataTableContext = createContext<DataTableContextValue>({
  stickyHeader: false,
  stickyActions: false,
});

function useDataTableContext() {
  return useContext(DataTableContext);
}

interface DataTableProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
  /** Bật cuộn dọc + ngang trong vùng bảng */
  scrollable?: boolean;
  /** Cố định hàng header khi cuộn dọc */
  stickyHeader?: boolean;
  /** Cố định cột thao tác bên phải khi cuộn ngang */
  stickyActions?: boolean;
  maxHeight?: string;
}

const STICKY_ACTION_SHADOW =
  "shadow-[-6px_0_10px_-6px_rgba(15,23,42,0.14)]";

export function DataTable({
  children,
  minWidth = "640px",
  className,
  scrollable = false,
  stickyHeader = false,
  stickyActions = false,
  maxHeight = "min(70vh, 720px)",
}: DataTableProps) {
  const enableStickyHeader = scrollable && stickyHeader;
  const enableStickyActions = scrollable && stickyActions;

  return (
    <DataTableContext.Provider
      value={{
        stickyHeader: enableStickyHeader,
        stickyActions: enableStickyActions,
      }}
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
          className,
        )}
      >
        <div
          className={cn(scrollable ? "overflow-auto" : "overflow-x-auto")}
          style={scrollable ? { maxHeight } : undefined}
        >
          <table
            className={cn(
              "border-separate border-spacing-0 text-left text-sm",
              scrollable ? "w-max min-w-full" : "w-full",
            )}
            style={scrollable ? undefined : { minWidth }}
          >
            {children}
          </table>
        </div>
      </div>
    </DataTableContext.Provider>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  const { stickyHeader } = useDataTableContext();

  return (
    <thead
      className={cn(
        "bg-gradient-to-r from-slate-50 to-slate-100/95",
        "[&_th]:border-b [&_th]:border-slate-200",
        stickyHeader && "[&_th]:sticky [&_th]:top-0 [&_th]:z-20",
      )}
    >
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "group transition-colors",
        "even:bg-slate-50/80",
        "hover:bg-primary/[0.04]",
        "[&_td]:border-b [&_td]:border-slate-200",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function DataTableHeaderCell({
  children,
  className,
  align = "left",
  pinned,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  /** Cố định cột bên phải — mặc định bật khi align=right và stickyActions */
  pinned?: "right";
}) {
  const { stickyHeader, stickyActions } = useDataTableContext();
  const pinRight = pinned === "right" || (stickyActions && align === "right");

  return (
    <th
      className={cn(
        "px-4 py-3.5 text-sm font-semibold text-foreground",
        align === "center" && "text-center",
        align === "right" && "text-right",
        stickyHeader && "bg-gradient-to-r from-slate-50 to-slate-100/95",
        pinRight &&
          cn(
            "sticky right-0 z-30 min-w-[8.5rem]",
            STICKY_ACTION_SHADOW,
            stickyHeader && "top-0",
          ),
        className,
      )}
    >
      {children}
    </th>
  );
}

type CellVariant = "default" | "primary" | "muted" | "index" | "actions";

export function DataTableCell({
  children,
  className,
  variant = "default",
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  variant?: CellVariant;
  align?: "left" | "center" | "right";
}) {
  const { stickyActions } = useDataTableContext();
  const pinActions = stickyActions && variant === "actions";

  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle",
        variant === "primary" && "font-medium text-foreground",
        variant === "muted" && "text-muted",
        variant === "index" && "w-16 text-center text-xs tabular-nums text-muted",
        variant === "actions" && "min-w-[8.5rem] whitespace-nowrap",
        align === "center" && "text-center",
        align === "right" && "text-right",
        variant === "default" && "text-foreground/90",
        pinActions &&
          cn(
            "sticky right-0 z-10 bg-surface",
            STICKY_ACTION_SHADOW,
            "group-even:bg-slate-50/80 group-hover:bg-slate-50",
          ),
        className,
      )}
    >
      {children}
    </td>
  );
}

export function DataTableEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-surface to-slate-50/50 px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg
          className="h-6 w-6"
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
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function DataTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  label = "bản ghi",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  label?: string;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const showPager = totalPages > 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
        <span>
          Hiển thị{" "}
          <span className="font-medium text-foreground">
            {start}–{end}
          </span>{" "}
          /{" "}
          <span className="font-medium text-foreground">{total}</span> {label}
        </span>
        {showPager && (
          <span>
            · Trang{" "}
            <span className="font-medium text-foreground">
              {page}/{totalPages}
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-muted">
            <span className="text-xs">Số dòng</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium text-foreground"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        {showPager && (
          <div className="flex gap-1.5">
            <PaginationButton
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="Trang đầu"
            >
              «
            </PaginationButton>
            <PaginationButton
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ← Trước
            </PaginationButton>
            <PaginationButton
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Sau →
            </PaginationButton>
            <PaginationButton
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Trang cuối"
            >
              »
            </PaginationButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function TableActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center justify-end gap-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ActionVariant = "primary" | "neutral" | "danger";

const actionStyles: Record<ActionVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
  neutral:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow",
};

function actionClass(variant: ActionVariant) {
  return cn(
    "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
    actionStyles[variant],
  );
}

export function TableActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
}) {
  return (
    <Link href={href} className={actionClass(variant)}>
      {children}
    </Link>
  );
}

export function TableActionButton({
  onClick,
  children,
  variant = "neutral",
  disabled = false,
  size = "md",
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: ActionVariant;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        actionClass(variant),
        size === "sm" && "px-2.5 py-1 text-xs",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

type BadgeVariant = "default" | "success" | "warning" | "muted" | "danger";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-amber-100",
  muted: "bg-slate-50 text-slate-500 ring-slate-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
};

export function TableBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeStyles[variant],
      )}
    >
      {children}
    </span>
  );
}

export function DataTableCountBadge({ count, label }: { count: number; label?: string }) {
  return (
    <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
      {count}
      {label ? ` ${label}` : ""}
    </span>
  );
}
