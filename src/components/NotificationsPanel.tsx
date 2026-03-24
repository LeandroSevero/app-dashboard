import { useEffect, useRef } from "react";
import { Bell, X, CheckCheck, AlertTriangle, Info, AlertCircle, Clock } from "lucide-react";
import type { Notification } from "../types/database";

interface NotificationsPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "app_expired") return <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />;
  if (type === "error") return <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />;
  if (type === "warning") return <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />;
  return <Info className="w-4 h-4" style={{ color: "var(--color-primary)" }} />;
}

export default function NotificationsPanel({ notifications, onClose, onMarkRead, onMarkAllRead, onNotificationClick }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      style={{
        background: "var(--color-card-solid)",
        border: "1px solid var(--color-border)",
        maxHeight: "480px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: "var(--color-fg-muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-fg)" }}>
            Notificações
          </span>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-all"
              style={{ color: "var(--color-primary)" }}
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Todas lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--color-fg-muted)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="w-8 h-8 mb-3" style={{ color: "var(--color-border2)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-fg-muted)" }}>
              Nenhuma notificação
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-border2)" }}>
              Você será notificado quando eventos importantes ocorrerem.
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  if (!notif.read) onMarkRead(notif.id);
                  if (onNotificationClick) {
                    onNotificationClick(notif);
                  }
                }}
                className="w-full text-left px-4 py-3 transition-all flex gap-3"
                style={{
                  background: notif.read ? "transparent" : "color-mix(in srgb, var(--color-primary) 10%, var(--color-card-solid))",
                  borderBottom: "1px solid var(--color-border)",
                  cursor: "pointer",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: notif.type === "app_expired" || notif.type === "warning"
                      ? "rgba(245,158,11,0.1)"
                      : notif.type === "error"
                      ? "rgba(239,68,68,0.1)"
                      : "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                    border: notif.type === "app_expired" || notif.type === "warning"
                      ? "1px solid rgba(245,158,11,0.2)"
                      : notif.type === "error"
                      ? "1px solid rgba(239,68,68,0.2)"
                      : "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                  }}
                >
                  <NotificationIcon type={notif.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-xs font-semibold leading-snug"
                      style={{ color: "var(--color-fg)" }}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                        style={{ background: "var(--color-primary)" }}
                      />
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3" style={{ color: "var(--color-border2)" }} />
                    <span className="text-xs" style={{ color: "var(--color-border2)" }}>
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
