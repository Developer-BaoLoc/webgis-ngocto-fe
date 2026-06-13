import type { ImportJob } from "@/types/api/import";

interface ImportProgressProps {
  job: ImportJob | null;
  isPolling: boolean;
}

const statusLabels: Record<string, string> = {
  queued: "Đang chờ",
  waiting: "Đang chờ",
  processing: "Đang xử lý",
  active: "Đang xử lý",
  completed: "Hoàn tất",
  done: "Hoàn tất",
  failed: "Thất bại",
  error: "Thất bại",
};

export function ImportProgress({ job, isPolling }: ImportProgressProps) {
  if (!job) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Đang khởi tạo job...
      </div>
    );
  }

  const progress = job.progress;
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {statusLabels[job.status.toLowerCase()] ?? job.status}
        </span>
        {isPolling && (
          <span className="text-muted">Đang cập nhật...</span>
        )}
      </div>

      {progress && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>
          <div className="flex gap-4 text-sm text-muted">
            <span>
              Đã xử lý: {progress.processed}/{progress.total}
            </span>
            {progress.errors > 0 && (
              <span className="text-red-600">Lỗi: {progress.errors}</span>
            )}
            {percent !== null && <span>{percent}%</span>}
          </div>
        </>
      )}

      {job.errorMessage && (
        <p className="text-sm text-red-600">{job.errorMessage}</p>
      )}
    </div>
  );
}
