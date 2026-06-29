"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AUDIT_LOG_EVENT,
  clearAuditLog,
  getAuditLog,
  type AuditLogEntry,
} from "@/lib/audit/audit-log";
import { useAuth } from "@/providers/auth-provider";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageOptions {
  title?: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface MessageEntry {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
  duration: number;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface MessageApi {
  success: (content: string, options?: MessageOptions) => string;
  error: (content: string, options?: MessageOptions) => string;
  warning: (content: string, options?: MessageOptions) => string;
  info: (content: string, options?: MessageOptions) => string;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const fallbackApi: MessageApi = {
  success: (content) => (console.info(content), ""),
  error: (content) => (console.error(content), ""),
  warning: (content) => (console.warn(content), ""),
  info: (content) => (console.info(content), ""),
  confirm: async () => false,
};

const MessageContext = createContext<MessageApi>(fallbackApi);
const STORAGE_KEY = "gis_ngocto.message_history.v1";
const MAX_HISTORY = 50;

function defaultTitle(type: MessageType) {
  if (type === "success") return "Thành công";
  if (type === "error") return "Có lỗi xảy ra";
  if (type === "warning") return "Cần lưu ý";
  return "Thông tin";
}

function styleFor(type: MessageType) {
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (type === "error") return "border-red-200 bg-red-50 text-red-900";
  if (type === "warning") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function serializableMessage(entry: MessageEntry) {
  const copy = { ...entry };
  delete copy.onAction;
  return copy;
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<MessageEntry[]>([]);
  const [history, setHistory] = useState<MessageEntry[]>([]);
  const [centerOpen, setCenterOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<"messages" | "audit">("messages");
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [confirmation, setConfirmation] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const centerButtonRef = useRef<HTMLButtonElement>(null);
  const centerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch {
        setHistory([]);
      }
      setAuditEntries(getAuditLog());
    }, 0);
    const updateAudit = () => setAuditEntries(getAuditLog());
    window.addEventListener(AUDIT_LOG_EVENT, updateAudit);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(AUDIT_LOG_EVENT, updateAudit);
    };
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!centerOpen) return;
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !centerRef.current?.contains(target) &&
        !centerButtonRef.current?.contains(target)
      ) {
        setCenterOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCenterOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [centerOpen]);

  useEffect(() => {
    if (!confirmation) return;
    const currentConfirmation = confirmation;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        currentConfirmation.resolve(false);
        setConfirmation(null);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmation]);

  const push = useCallback(
    (type: MessageType, content: string, options?: MessageOptions) => {
      const entry: MessageEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        title: options?.title ?? defaultTitle(type),
        content,
        createdAt: new Date().toISOString(),
        read: false,
        duration: options?.duration ?? (type === "error" ? 9000 : 4500),
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      };
      setToasts((current) => [entry, ...current].slice(0, 5));
      setHistory((current) => {
        const next = [entry, ...current].slice(0, MAX_HISTORY);
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(next.map(serializableMessage)),
          );
        } catch {
          // The toast remains usable when storage is unavailable.
        }
        return next;
      });
      if (entry.duration > 0) {
        window.setTimeout(() => closeToast(entry.id), entry.duration);
      }
      return entry.id;
    },
    [closeToast],
  );

  const api = useMemo<MessageApi>(
    () => ({
      success: (content, options) => push("success", content, options),
      error: (content, options) => push("error", content, options),
      warning: (content, options) => push("warning", content, options),
      info: (content, options) => push("info", content, options),
      confirm: (options) =>
        new Promise<boolean>((resolve) => setConfirmation({ options, resolve })),
    }),
    [push],
  );

  function resolveConfirmation(value: boolean) {
    confirmation?.resolve(value);
    setConfirmation(null);
  }

  const unread = history.filter((item) => !item.read).length;

  return (
    <MessageContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <article key={toast.id} className={`pointer-events-auto rounded-xl border p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] ${styleFor(toast.type)}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-0.5 break-words text-sm opacity-90">{toast.content}</p>
                {toast.actionLabel && toast.onAction ? (
                  <button type="button" onClick={() => void Promise.resolve(toast.onAction?.()).finally(() => closeToast(toast.id))} className="mt-2 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-semibold hover:bg-white">
                    {toast.actionLabel}
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={() => closeToast(toast.id)} className="shrink-0 rounded p-1 text-lg leading-none opacity-60 hover:bg-white/60 hover:opacity-100" aria-label="Đóng thông báo">×</button>
            </div>
          </article>
        ))}
      </div>

      <button ref={centerButtonRef} type="button" onClick={() => { setCenterOpen((open) => !open); setHistory((current) => { const next = current.map((item) => ({ ...item, read: true })); try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(serializableMessage))); } catch { /* History still works in memory. */ } return next; }); }} className="fixed bottom-4 right-4 z-[105] rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 sm:bottom-5 sm:right-10" aria-label="Mở trung tâm thông báo" aria-expanded={centerOpen} aria-haspopup="dialog">
        Thông báo{unread ? ` (${unread})` : ""}
      </button>

      {centerOpen ? (
        <aside ref={centerRef} role="dialog" className="fixed bottom-16 right-4 z-[110] flex max-h-[min(70vh,42rem)] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)] sm:right-10" aria-label="Trung tâm thông báo">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setCenterTab("messages")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${centerTab === "messages" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Thông báo</button>
              <button type="button" onClick={() => setCenterTab("audit")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${centerTab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Nhật ký thao tác</button>
            </div>
            <button type="button" onClick={() => setCenterOpen(false)} className="rounded p-1 text-xl leading-none text-slate-400 hover:bg-slate-100" aria-label="Đóng trung tâm thông báo">×</button>
          </div>
          <div className="overflow-y-auto p-3">
            {centerTab === "messages" ? (
              history.length ? <div className="space-y-2">{history.map((item) => <div key={item.id} className={`rounded-lg border px-3 py-2 ${styleFor(item.type)}`}><div className="flex justify-between gap-3"><p className="text-xs font-semibold">{item.title}</p><time className="shrink-0 text-[10px] opacity-60">{new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time></div><p className="mt-1 text-xs">{item.content}</p></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">Chưa có thông báo.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end"><button type="button" onClick={() => { clearAuditLog(); setAuditEntries([]); }} className="text-xs font-medium text-slate-500 hover:text-red-600">Xóa lịch sử phiên</button></div>
                {auditEntries.length ? auditEntries.map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2"><div className="flex justify-between gap-3"><p className="text-xs font-semibold text-slate-800">{entry.action}</p><time className="shrink-0 text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleString("vi-VN")}</time></div><p className="mt-1 text-xs text-slate-600">{entry.objectType}: {entry.objectName}</p>{entry.metadata && Object.keys(entry.metadata).length ? <p className="mt-1 truncate text-[11px] text-slate-400" title={JSON.stringify(entry.metadata)}>{Object.entries(entry.metadata).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</p> : null}{entry.user || user?.fullName ? <p className="mt-1 text-[11px] text-slate-400">Người dùng: {entry.user ?? user?.fullName}</p> : null}</div>) : <p className="py-8 text-center text-sm text-slate-500">Chưa có thao tác được ghi nhận.</p>}
              </div>
            )}
          </div>
        </aside>
      ) : null}

      {confirmation ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resolveConfirmation(false); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="message-confirm-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 id="message-confirm-title" className="text-base font-semibold text-slate-900">{confirmation.options.title}</h2>
            {confirmation.options.description ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{confirmation.options.description}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => resolveConfirmation(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{confirmation.options.cancelLabel ?? "Hủy"}</button>
              <button type="button" onClick={() => resolveConfirmation(true)} className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${confirmation.options.danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"}`}>{confirmation.options.confirmLabel ?? "Xác nhận"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </MessageContext.Provider>
  );
}

export function useMessage() {
  return useContext(MessageContext);
}
