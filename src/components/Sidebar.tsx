import {
  LayoutDashboard,
  Server,
  BookOpen,
  ShieldCheck,
  Bug,
  Globe,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Users,
  User,
  Database,
  ScrollText,
  Settings,
  Boxes,
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  section: string;
  available: boolean;
  adminOnly?: boolean;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin?: boolean;
  profileCompletion?: number;
}

const userNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", section: "dashboard", available: true },
  { icon: <Server className="w-4 h-4" />, label: "Aplicações", section: "applications", available: true },
  { icon: <BookOpen className="w-4 h-4" />, label: "Cursos", section: "courses", available: false },
  { icon: <ShieldCheck className="w-4 h-4" />, label: "Monitor SSL", section: "ssl", available: false },
  { icon: <Bug className="w-4 h-4" />, label: "Vulnerabilidades", section: "vulnerabilities", available: false },
  { icon: <Globe className="w-4 h-4" />, label: "Blacklist IP", section: "blacklist", available: false },
  { icon: <BarChart3 className="w-4 h-4" />, label: "Observabilidade", section: "observability", available: false },
];

const adminNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", section: "admin-dashboard", available: true, adminOnly: true },
  { icon: <Server className="w-4 h-4" />, label: "Aplicações", section: "applications", available: true },
];

const adminOnlyItems: NavItem[] = [
  { icon: <Users className="w-4 h-4" />, label: "Usuários", section: "admin-users", available: true, adminOnly: true },
  { icon: <Boxes className="w-4 h-4" />, label: "Aplicações", section: "admin-apps", available: true, adminOnly: true },
  { icon: <Database className="w-4 h-4" />, label: "Recursos", section: "admin-resources", available: true, adminOnly: true },
  { icon: <ScrollText className="w-4 h-4" />, label: "Logs", section: "admin-logs", available: true, adminOnly: true },
  { icon: <Settings className="w-4 h-4" />, label: "Configurações", section: "admin-settings", available: false, adminOnly: true },
];

export default function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, isAdmin, profileCompletion }: SidebarProps) {
  const showProfileWarning = !isAdmin && profileCompletion !== undefined && profileCompletion < 100;
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-sidebar-border)' }}
    >
      <div
        className={`flex items-center gap-3 px-4 py-4 ${collapsed ? "justify-center" : ""}`}
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => onSectionChange(isAdmin ? "admin-dashboard" : "dashboard")}
          className="flex items-center focus:outline-none"
          title="Dashboard"
        >
          {collapsed ? (
            <img
              src="/Green_and_Black_Minimal_Code_Search_Logo_(1).svg"
              alt="Logo"
              className="w-8 h-8 object-contain flex-shrink-0"
            />
          ) : (
            <img
              src="/Green_and_Black_Minimal_Code_Search_Logo_(1).svg"
              alt="Logo"
              className="h-8 object-contain flex-shrink-0"
              style={{ maxWidth: '140px' }}
            />
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavButton
            key={item.section}
            item={item}
            isActive={activeSection === item.section}
            collapsed={collapsed}
            onSelect={onSectionChange}
          />
        ))}

        {!isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-border2)' }}>
                  Conta
                </p>
              </div>
            )}
            {collapsed && <div className="h-px mx-2 my-2" style={{ background: 'var(--color-border)' }} />}
            <NavButton
              item={{ icon: <User className="w-4 h-4" />, label: "Meu Perfil", section: "profile", available: true }}
              isActive={activeSection === "profile"}
              collapsed={collapsed}
              onSelect={onSectionChange}
              badge={showProfileWarning ? `${profileCompletion}%` : undefined}
            />
          </>
        )}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-border2)' }}>
                  Admin
                </p>
              </div>
            )}
            {collapsed && <div className="h-px mx-2 my-2" style={{ background: 'var(--color-border)' }} />}
            {adminOnlyItems.map((item) => (
              <NavButton
                key={item.section}
                item={item}
                isActive={activeSection === item.section}
                collapsed={collapsed}
                onSelect={onSectionChange}
              />
            ))}
          </>
        )}
      </nav>

      <div
        className={`px-2 py-3 flex ${collapsed ? "justify-center" : "justify-between items-center px-4"}`}
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {!collapsed && (
          <p className="text-xs" style={{ color: 'var(--color-border2)' }}>v1.0.0 · DevOps Panel</p>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--color-fg-muted)' }}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onSelect: (section: string) => void;
  badge?: string;
}

function NavButton({ item, isActive, collapsed, onSelect, badge }: NavButtonProps) {
  return (
    <button
      onClick={() => item.available && onSelect(item.section)}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
      style={
        isActive
          ? {
              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
            }
          : item.available
          ? { color: 'var(--color-fg-muted)', border: '1px solid transparent' }
          : { color: 'var(--color-border2)', border: '1px solid transparent', cursor: 'not-allowed' }
      }
    >
      <span className="flex-shrink-0 relative">
        {item.icon}
        {badge && collapsed && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
            style={{ background: '#f97316' }}
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{item.label}</span>
          {!item.available && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap"
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)' }}
            >
              Em breve
            </span>
          )}
          {badge && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              {badge}
            </span>
          )}
          {isActive && !badge && item.available && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />}
        </>
      )}
    </button>
  );
}
