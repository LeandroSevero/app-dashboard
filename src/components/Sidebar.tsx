import {
  LayoutDashboard,
  Server,
  BookOpen,
  ShieldCheck,
  Bug,
  Globe,
  BarChart3,
  ChevronRight,
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

export default function Sidebar({ activeSection, onSectionChange, collapsed, isAdmin, profileCompletion }: SidebarProps) {
  const showProfileWarning = !isAdmin && profileCompletion !== undefined && profileCompletion < 100;
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-sidebar-border)' }}
    >
      <div
        className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "justify-center" : ""}`}
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
        >
          <Server className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-fg)' }}>Leandro Severo</p>
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
              {isAdmin ? "Administrador" : "Painel"}
            </p>
          </div>
        )}
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

      {!collapsed && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-border2)' }}>v1.0.0 · DevOps Panel</p>
        </div>
      )}
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
