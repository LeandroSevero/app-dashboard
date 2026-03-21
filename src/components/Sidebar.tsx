import {
  LayoutDashboard,
  Server,
  BookOpen,
  ShieldCheck,
  Bug,
  Globe,
  BarChart3,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  section: string;
  available: boolean;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-4.5 h-4.5" />, label: "Dashboard", section: "dashboard", available: true },
  { icon: <Server className="w-4.5 h-4.5" />, label: "Aplicações", section: "applications", available: true },
  { icon: <BookOpen className="w-4.5 h-4.5" />, label: "Cursos", section: "courses", available: false },
  { icon: <ShieldCheck className="w-4.5 h-4.5" />, label: "Monitor SSL", section: "ssl", available: false },
  { icon: <Bug className="w-4.5 h-4.5" />, label: "Vulnerabilidades", section: "vulnerabilities", available: false },
  { icon: <Globe className="w-4.5 h-4.5" />, label: "Blacklist IP", section: "blacklist", available: false },
  { icon: <BarChart3 className="w-4.5 h-4.5" />, label: "Observabilidade", section: "observability", available: false },
];

export default function Sidebar({ activeSection, onSectionChange, collapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 z-30 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Server className="w-4 h-4 text-blue-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-slate-100 font-semibold text-sm leading-tight">Leandro Severo</p>
            <p className="text-slate-500 text-xs">Painel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              onClick={() => item.available && onSectionChange(item.section)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : item.available
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-600 cursor-not-allowed"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {!item.available && (
                    <span className="text-xs bg-slate-700/60 text-slate-500 px-1.5 py-0.5 rounded-md whitespace-nowrap">Em breve</span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-slate-600 text-xs">v1.0.0 · DevOps Panel</p>
        </div>
      )}
    </aside>
  );
}
