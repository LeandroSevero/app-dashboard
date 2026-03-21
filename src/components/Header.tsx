import { Menu, LogOut, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, signOut } = useAuth();

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "LS";

  return (
    <header
      className="fixed top-0 right-0 left-0 h-14 backdrop-blur-md z-20 flex items-center px-4 gap-3"
      style={{
        background: 'var(--color-header-bg)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 8px var(--color-header-shadow)',
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg transition-all"
        style={{ color: 'var(--color-fg-muted)' }}
        title="Alternar menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      <button
        className="p-2 rounded-lg transition-all relative"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <Bell className="w-4 h-4" />
      </button>

      <div
        className="flex items-center gap-2.5 pl-2"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{initials}</span>
        </div>
        <span className="text-sm hidden sm:block max-w-[160px] truncate" style={{ color: 'var(--color-fg)' }}>
          {user?.email}
        </span>
        <button
          onClick={signOut}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-fg-muted)' }}
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
