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
    <header className="fixed top-0 right-0 left-0 h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20 flex items-center px-4 gap-3">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
        title="Alternar menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all relative">
        <Bell className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <span className="text-blue-400 text-xs font-bold">{initials}</span>
        </div>
        <span className="text-slate-300 text-sm hidden sm:block max-w-[160px] truncate">
          {user?.email}
        </span>
        <button
          onClick={signOut}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
