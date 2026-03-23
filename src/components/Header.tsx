import { useState } from "react";
import { LogOut, Bell, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationsPanel from "./NotificationsPanel";
import type { Notification } from "../types/database";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export default function Header({
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick,
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "LS";

  return (
    <header
      className="fixed top-0 right-0 left-0 h-14 backdrop-blur-md z-20 flex items-center px-4 gap-3"
      style={{
        background: "var(--color-header-bg)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 1px 8px var(--color-header-shadow)",
      }}
    >
      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setShowNotifications((v) => !v)}
          className="p-2 rounded-lg transition-all relative"
          style={{ color: "var(--color-fg-muted)" }}
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: "var(--color-primary)" }}
            />
          )}
        </button>

        {showNotifications && (
          <NotificationsPanel
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            onMarkRead={(id) => {
              onMarkNotificationRead(id);
            }}
            onMarkAllRead={() => {
              onMarkAllNotificationsRead();
            }}
            onNotificationClick={onNotificationClick ? (notif) => {
              setShowNotifications(false);
              onNotificationClick(notif);
            } : undefined}
          />
        )}
      </div>

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg transition-all flex items-center justify-center"
        style={{ background: "var(--color-toggle-bg)", color: "var(--color-fg-muted)" }}
        title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div
        className="flex items-center gap-2.5 pl-2"
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
          }}
        >
          <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
            {initials}
          </span>
        </div>
        <span
          className="text-sm hidden sm:block max-w-[160px] truncate"
          style={{ color: "var(--color-fg)" }}
        >
          {user?.email}
        </span>
        <button
          onClick={signOut}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: "var(--color-fg-muted)" }}
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
