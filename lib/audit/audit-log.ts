export type AuditActionType =
  | "dashboard.create"
  | "dashboard.update"
  | "dashboard.publish"
  | "widget.add"
  | "widget.update"
  | "widget.remove"
  | "data.export"
  | "template.import"
  | "dashboard.ai_generate"
  | "dataset.virtual_create"
  | "layer.search"
  | "layer.filter";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType | string;
  objectType: string;
  objectName: string;
  user?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const STORAGE_KEY = "gis_ngocto.audit_log.v1";
const EVENT_NAME = "gis:audit-log-updated";
const MAX_ENTRIES = 200;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getAuditLog(): AuditLogEntry[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logAuditAction(
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
) {
  const next: AuditLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  if (!canUseStorage()) return next;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([next, ...getAuditLog()].slice(0, MAX_ENTRIES)),
    );
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  } catch {
    // Audit logging must never block the user action.
  }
  return next;
}

export function clearAuditLog() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Ignore unavailable storage.
  }
}

export const AUDIT_LOG_EVENT = EVENT_NAME;
