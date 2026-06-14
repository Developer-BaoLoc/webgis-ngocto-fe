"use client";

import { cn } from "@/lib/utils";

interface LayerImportToolbarProps {
  templateLoading?: boolean;
  onDownloadTemplate: () => void;
  onImport: () => void;
  onAddRecord: () => void;
  className?: string;
}

const buttonBase =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors";

export function LayerImportToolbar({
  templateLoading = false,
  onDownloadTemplate,
  onImport,
  onAddRecord,
  className,
}: LayerImportToolbarProps) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        disabled={templateLoading}
        onClick={onDownloadTemplate}
        className={cn(
          buttonBase,
          "bg-emerald-600 text-white hover:bg-emerald-700",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {templateLoading ? (
          <SpinnerIcon />
        ) : (
          <DownloadIcon />
        )}
        {templateLoading ? "Đang tải..." : "Tải mẫu Excel"}
      </button>

      <button
        type="button"
        onClick={onImport}
        className={cn(
          buttonBase,
          "bg-sky-600 text-white hover:bg-sky-700",
        )}
      >
        <UploadIcon />
        Import Excel
      </button>

      <button
        type="button"
        onClick={onAddRecord}
        className={cn(
          buttonBase,
          "bg-violet-600 text-white hover:bg-violet-700",
        )}
      >
        <PlusIcon />
        Thêm bản ghi
      </button>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 11.25 12 15.75m0 0 4.5-4.5M12 15.75V3"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
      />
    </svg>
  );
}
