import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  Server,
  RefreshCw,
  Trash2,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Package,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  Search,
  User,
  Phone,
  Mail,
  FileText,
  Camera,
  Boxes,
  ScrollText,
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  Filter,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ApplicationCard from "../components/ApplicationCard";
import ApplicationDetailModal from "../components/ApplicationDetailModal";
import CreateApplicationModal from "../components/CreateApplicationModal";
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateApplication,
  adminDeleteApplication,
  adminRotatePassword,
  adminGetStats,
  adminGetLogs,
  listApplications,
  createApplication,
  deleteApplication,
} from "../lib/api";
import type { AdminStats, AdminLog } from "../services/adminService";
import type { AdminUser, Application, Notification } from "../types/database";
import { useAuth } from "../context/AuthContext";
import { invokeWithAuth } from "../lib/supabase";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  triggerExpireApplications,
} from "../services/notificationService";

type AdminSection =
  | "admin-dashboard"
  | "applications"
  | "admin-users"
  | "admin-apps"
  | "admin-resources"
  | "admin-logs"
  | "admin-settings";

export default function AdminDashboard() {
  const { user, session } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("admin-dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetched, setUsersFetched] = useState(false);

  const [myApps, setMyApps] = useState<Application[]>([]);
  const [myAppsLoading, setMyAppsLoading] = useState(false);
  const [myAppsFetched, setMyAppsFetched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [usersRoleFilter, setUsersRoleFilter] = useState<string>("");
  const [appsTypeFilter, setAppsTypeFilter] = useState<string>("");
  const [logsTypeFilter, setLogsTypeFilter] = useState<string>("");

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

  function navigateTo(section: AdminSection, filters?: { role?: string; appType?: string; logType?: string }) {
    if (filters?.role !== undefined) setUsersRoleFilter(filters.role);
    if (filters?.appType !== undefined) setAppsTypeFilter(filters.appType);
    if (filters?.logType !== undefined) setLogsTypeFilter(filters.logType);
    setActiveSection(section);
  }

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const { users: u } = await adminListUsers();
    setUsers(u);
    setUsersLoading(false);
    setUsersFetched(true);
  }, []);

  const fetchMyApps = useCallback(async () => {
    setMyAppsLoading(true);
    const { applications } = await listApplications();
    setMyApps(applications);
    setMyAppsLoading(false);
    setMyAppsFetched(true);
  }, []);

  const loadNotifications = useCallback(async () => {
    const result = await fetchNotifications();
    if (result.success && result.data) setNotifications(result.data);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadNotifications();

    const runExpiration = async () => {
      await triggerExpireApplications();
      await loadNotifications();
    };
    runExpiration();
    const interval = setInterval(runExpiration, 60000);
    return () => clearInterval(interval);
  }, [session, loadNotifications]);

  useEffect(() => {
    if ((activeSection === "admin-users" || activeSection === "admin-apps" || activeSection === "admin-resources" || activeSection === "admin-logs") && !usersFetched) {
      fetchUsers();
    }
  }, [activeSection, usersFetched, fetchUsers]);

  useEffect(() => {
    if (activeSection === "applications" && !myAppsFetched) {
      fetchMyApps();
    }
  }, [activeSection, myAppsFetched, fetchMyApps]);

  function handleUserUpdated(userId: string, updates: Partial<AdminUser>) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  }

  function handleUserDeleted(userId: string) {
    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, deleted_at: new Date().toISOString() } : u)
    );
  }

  function handleAppUpdated(appId: string, updates: Partial<Application>) {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        applications: u.applications.map((a) => (a.id === appId ? { ...a, ...updates } : a)),
      }))
    );
  }

  function handleAppDeleted(appId: string) {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        applications: u.applications.filter((a) => a.id !== appId),
      }))
    );
  }

  async function handleMyAppCreate(name: string, type: string, ttlHours: number | null): Promise<{ error?: string; next_allowed_at?: string }> {
    const result = await createApplication(name, type, ttlHours);
    if (result.error) return { error: result.error, next_allowed_at: result.next_allowed_at };
    setShowCreateModal(false);
    await fetchMyApps();
    return {};
  }

  async function handleMyAppDelete(id: string) {
    setDeletingId(id);
    const result = await deleteApplication(id);
    if (!result.error) setMyApps((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  const allAppsWithDeleted: (Application & { userEmail: string; userId: string })[] = users.flatMap((u) =>
    u.applications.map((a) => ({ ...a, userEmail: u.email, userId: u.id }))
  );

  const allApps: (Application & { userEmail: string; userId: string })[] = allAppsWithDeleted.filter((a) => !a.deleted_at);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(s) => setActiveSection(s as AdminSection)}
        collapsed={sidebarCollapsed}
        isAdmin
      />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
        notifications={notifications}
        onMarkNotificationRead={async (id) => {
          await markNotificationRead(id);
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllNotificationsRead={async () => {
          await markAllNotificationsRead();
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
      />

      <main className={`${sidebarWidth} pt-14 transition-all duration-300 min-h-screen`}>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {activeSection === "admin-dashboard" && (
            <AdminDashboardSection onNavigate={navigateTo} />
          )}

          {activeSection === "applications" && (
            <MyApplicationsSection
              apps={myApps}
              allAppsWithOwner={allApps}
              loading={myAppsLoading || usersLoading}
              deletingId={deletingId}
              onDelete={handleMyAppDelete}
              onRefresh={() => { fetchMyApps(); if (!usersFetched) fetchUsers(); }}
              onOpenCreate={() => setShowCreateModal(true)}
              onViewDetails={setDetailApp}
              currentUserId={user?.id}
            />
          )}

          {activeSection === "admin-users" && (
            <UsersTab
              users={users}
              loading={usersLoading}
              onRefresh={fetchUsers}
              onUserUpdated={handleUserUpdated}
              onUserDeleted={handleUserDeleted}
              initialRoleFilter={usersRoleFilter}
              onRoleFilterConsumed={() => setUsersRoleFilter("")}
            />
          )}

          {activeSection === "admin-apps" && (
            <ApplicationsTab
              apps={allAppsWithDeleted}
              loading={usersLoading}
              onRefresh={fetchUsers}
              onAppUpdated={handleAppUpdated}
              onAppDeleted={handleAppDeleted}
              initialTypeFilter={appsTypeFilter}
              onTypeFilterConsumed={() => setAppsTypeFilter("")}
            />
          )}

          {activeSection === "admin-resources" && (
            <ResourcesTab apps={allApps} loading={usersLoading} onRefresh={fetchUsers} />
          )}

          {activeSection === "admin-logs" && (
            <LogsTab initialTypeFilter={logsTypeFilter} onTypeFilterConsumed={() => setLogsTypeFilter("")} />
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleMyAppCreate}
        />
      )}

      {detailApp && (
        <ApplicationDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
        />
      )}
    </div>
  );
}

function AdminDashboardSection({ onNavigate }: { onNavigate: (section: AdminSection, filters?: { role?: string; appType?: string; logType?: string }) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { stats: s, error: e } = await adminGetStats();
    if (e) setError(e);
    else setStats(s ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
        <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={fetchStats} className="ml-auto text-xs underline" style={{ color: '#ef4444' }}>Tentar novamente</button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Dashboard Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Visão geral da plataforma em tempo real.</p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-glass flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
        >
          <RefreshCw className="w-3 h-3" />
          Atualizar
        </button>
      </div>

      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
        }}
      >
        <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Modo Administrador ativo</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>Você tem acesso total a todos os usuários e aplicações.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <BigStatCard icon={<Users className="w-5 h-5" />} label="Usuários" value={stats.total_users} color="primary" onClick={() => onNavigate("admin-users", { role: "" })} />
        <BigStatCard icon={<Boxes className="w-5 h-5" />} label="Aplicações" value={stats.total_apps} color="orange" onClick={() => onNavigate("admin-apps", { appType: "" })} />
        <BigStatCard icon={<ShieldCheck className="w-5 h-5" />} label="Admins" value={stats.total_admins} color="cyan" onClick={() => onNavigate("admin-users", { role: "admin" })} />
        <BigStatCard icon={<AlertCircle className="w-5 h-5" />} label="Erros" value={stats.total_errors} color="red" onClick={() => onNavigate("admin-logs", { logType: "error" })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TypeCard icon={<img src="/RabbitMQ.svg" className="w-5 h-5" />} label="RabbitMQ" count={stats.by_type.rabbitmq} color="#f97316" bg="rgba(249,115,22,0.08)" border="rgba(249,115,22,0.2)" onClick={() => onNavigate("admin-apps", { appType: "rabbitmq" })} />
        <TypeCard icon={<img src="/LavinMQ.svg" className="w-5 h-5" />} label="LavinMQ" count={stats.by_type.lavinmq} color="#06b6d4" bg="rgba(6,182,212,0.08)" border="rgba(6,182,212,0.2)" onClick={() => onNavigate("admin-apps", { appType: "lavinmq" })} />
        <TypeCard icon={<img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />} label="MongoDB" count={stats.by_type.mongodb} color="#22c55e" bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)" onClick={() => onNavigate("admin-apps", { appType: "mongodb" })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MiniChart title="Aplicações (7 dias)" data={stats.apps_last_7_days} color="var(--color-primary)" />
        <MiniChart title="Usuários (7 dias)" data={stats.users_last_7_days} color="#22c55e" />
      </div>
    </div>
  );
}

function BigStatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const styles: Record<string, { bg: string; border: string; iconColor: string; glow: string }> = {
    primary: { bg: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: 'color-mix(in srgb, var(--color-primary) 18%, transparent)', iconColor: 'var(--color-primary)', glow: 'color-mix(in srgb, var(--color-primary) 22%, transparent)' },
    orange: { bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.18)', iconColor: '#f97316', glow: 'rgba(249,115,22,0.22)' },
    cyan: { bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.18)', iconColor: '#06b6d4', glow: 'rgba(6,182,212,0.22)' },
    red: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)', iconColor: '#ef4444', glow: 'rgba(239,68,68,0.22)' },
  };
  const s = styles[color];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl p-5 text-left w-full group"
      style={{
        background: hovered && onClick ? `color-mix(in srgb, ${s.glow} 60%, ${s.bg})` : s.bg,
        border: `1px solid ${hovered && onClick ? s.iconColor.replace('var(--color-primary)', 'color-mix(in srgb, var(--color-primary) 55%, transparent)') : s.border}`,
        cursor: onClick ? 'pointer' : 'default',
        outline: 'none',
        boxShadow: hovered && onClick ? `0 0 18px 3px ${s.glow}, 0 4px 16px ${s.glow}` : 'none',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
        <span style={{ color: s.iconColor }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-fg)' }}>{value}</p>
      {onClick && (
        <p className="text-xs mt-2 transition-opacity duration-150" style={{ color: s.iconColor, opacity: hovered ? 1 : 0 }}>Ver detalhes →</p>
      )}
    </button>
  );
}

function TypeCard({ icon, label, count, color, bg, border, onClick }: { icon: React.ReactNode; label: string; count: number; color: string; bg: string; border: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl p-4 flex items-center gap-4 w-full text-left"
      style={{
        background: hovered && onClick ? `color-mix(in srgb, ${color} 10%, ${bg})` : bg,
        border: `1px solid ${hovered && onClick ? color : border}`,
        cursor: onClick ? 'pointer' : 'default',
        outline: 'none',
        boxShadow: hovered && onClick ? `0 0 18px 3px ${color}33, 0 4px 16px ${color}22` : 'none',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-card)', border: `1px solid ${border}` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>{count}</p>
      </div>
      {onClick && (
        <span className="text-xs flex-shrink-0 transition-opacity duration-150" style={{ color, opacity: hovered ? 1 : 0 }}>→</span>
      )}
    </button>
  );
}

function MiniChart({ title, data, color }: { title: string; data: Array<{ date: string; count: number }>; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4" style={{ color }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>{title}</p>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          const day = new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end" style={{ height: 48 }}>
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{ height: `${Math.max(pct, 4)}%`, background: color, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--color-fg-muted)', fontSize: '0.6rem' }}>{day}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Total</p>
        <p className="text-sm font-bold" style={{ color: 'var(--color-fg)' }}>
          {data.reduce((s, d) => s + d.count, 0)}
        </p>
      </div>
    </div>
  );
}

interface MyApplicationsSectionProps {
  apps: Application[];
  allAppsWithOwner: AppWithOwner[];
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onViewDetails: (app: Application) => void;
  currentUserId?: string;
}

function MyApplicationsSection({ apps, allAppsWithOwner, loading, deletingId, onDelete, onRefresh, onOpenCreate, onViewDetails, currentUserId }: MyApplicationsSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const myOwnApps = currentUserId ? apps.filter((a) => a.user_id === currentUserId) : apps;
  const displayedApps = showAll ? allAppsWithOwner : myOwnApps;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Minhas Aplicações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Suas instâncias pessoais.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (!showAll) onRefresh(); setShowAll(!showAll); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={showAll
              ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }
              : { color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'transparent' }
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {showAll ? "Somente minhas" : "Mostrar todas"}
          </button>
          <button onClick={onRefresh} className="btn-glass p-2 rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={onOpenCreate} className="btn-glass-primary flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl">
            <Package className="w-4 h-4" />
            Criar
          </button>
        </div>
      </div>

      {!showAll && currentUserId && allAppsWithOwner.some((a) => a.user_id !== currentUserId) && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-fg-muted)' }}
        >
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
          Mostrando apenas suas aplicações. Clique em <strong style={{ color: 'var(--color-primary)' }}>"Mostrar todas"</strong> para ver as de todos os usuários.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
        </div>
      ) : displayedApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Server className="w-6 h-6" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--color-fg)' }}>Nenhuma aplicação</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-fg-muted)' }}>Crie sua primeira instância.</p>
          <button onClick={onOpenCreate} className="btn-glass-primary flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl">
            <Package className="w-4 h-4" />
            Criar aplicação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedApps.map((app) => {
            const ownerEmail = showAll && 'userEmail' in app ? (app as AppWithOwner).userEmail : undefined;
            return (
              <ApplicationCard
                key={app.id}
                app={app}
                onDelete={onDelete}
                deleting={deletingId === app.id}
                onViewDetails={onViewDetails}
                ownerEmail={ownerEmail}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface UsersTabProps {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
  onUserUpdated: (userId: string, updates: Partial<AdminUser>) => void;
  onUserDeleted: (userId: string) => void;
  initialRoleFilter?: string;
  onRoleFilterConsumed?: () => void;
}

type UserDeletedFilter = "all" | "active" | "deleted";

function UsersTab({ users, loading, onRefresh, onUserUpdated, onUserDeleted, initialRoleFilter, onRoleFilterConsumed }: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter ?? "");
  const [deletedFilter, setDeletedFilter] = useState<UserDeletedFilter>("active");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoleFilter !== undefined && initialRoleFilter !== roleFilter) {
      setRoleFilter(initialRoleFilter);
      onRoleFilterConsumed?.();
    }
  }, [initialRoleFilter]);

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter ? u.role === roleFilter : true;
    const isDeleted = !!u.deleted_at;
    const matchDeleted =
      deletedFilter === "all" ? true :
      deletedFilter === "deleted" ? isDeleted :
      !isDeleted;
    return matchSearch && matchRole && matchDeleted;
  });

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId);
    const result = await adminDeleteUser(userId);
    if (!result.error) onUserDeleted(userId);
    setDeletingUserId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Usuários</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Gerencie todos os usuários da plataforma.</p>
        </div>
        <button onClick={onRefresh} className="btn-glass p-2 rounded-xl" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-6 py-4 space-y-3"
          style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                Usuários ({filtered.length})
              </h2>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {([
                { value: "active", label: "Somente ativos" },
                { value: "all", label: "Ativos + excluídos" },
                { value: "deleted", label: "Somente excluídos" },
              ] as { value: UserDeletedFilter; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDeletedFilter(opt.value)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={deletedFilter === opt.value
                    ? { background: opt.value === 'deleted' ? 'rgba(239,68,68,0.15)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: opt.value === 'deleted' ? '#ef4444' : 'var(--color-primary)' }
                    : { color: 'var(--color-fg-muted)', background: 'transparent' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRoleFilter("")}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={roleFilter === ""
                  ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }
                  : { background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }
                }
              >Todos</button>
              <button
                onClick={() => setRoleFilter("admin")}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={roleFilter === "admin"
                  ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }
                  : { background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }
                }
              >Admins</button>
              <button
                onClick={() => setRoleFilter("user")}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={roleFilter === "user"
                  ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }
                  : { background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }
                }
              >Usuários</button>
            </div>
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-full"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-card)' }}>
            {filtered.map((user, idx) => (
              <div key={user.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
                <UserProfileRow
                  user={user}
                  editing={editingUserId === user.id}
                  onEditStart={() => setEditingUserId(user.id)}
                  onEditEnd={() => setEditingUserId(null)}
                  deleting={deletingUserId === user.id}
                  onDelete={() => handleDeleteUser(user.id)}
                  onUserUpdated={(updates) => onUserUpdated(user.id, updates)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface UserProfileRowProps {
  user: AdminUser;
  editing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  deleting: boolean;
  onDelete: () => void;
  onUserUpdated: (updates: Partial<AdminUser>) => void;
}

function UserProfileRow({ user, editing, onEditStart, onEditEnd, deleting, onDelete, onUserUpdated }: UserProfileRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const initials = (user.full_name || user.email).substring(0, 2).toUpperCase();

  const activeApps = user.applications.filter((a) => !a.deleted_at);
  const rabbitmqCount = activeApps.filter((a) => a.type === "rabbitmq").length;
  const lavinmqCount = activeApps.filter((a) => a.type === "lavinmq").length;
  const mongodbCount = activeApps.filter((a) => a.type === "mongodb").length;

  return (
    <div>
      <div className="flex items-center gap-4 px-6 py-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden"
          style={{
            background: user.avatar_url ? 'transparent' : user.role === "admin"
              ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
              : 'var(--color-bg-secondary)',
            color: user.role === "admin" ? 'var(--color-primary)' : 'var(--color-fg-muted)',
            border: `1px solid ${user.role === "admin" ? 'color-mix(in srgb, var(--color-primary) 25%, transparent)' : 'var(--color-border)'}`,
          }}
        >
          {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: user.deleted_at ? 'var(--color-fg-muted)' : 'var(--color-fg)' }}>
              {user.full_name || <span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>Sem nome</span>}
            </span>
            {user.role === "admin" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }}>
                ADM
              </span>
            )}
            {user.deleted_at && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                Excluído
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{user.email}</p>
          {user.deleted_at ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-border2)' }}>
              Excluído em {new Date(user.deleted_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {activeApps.length === 0 ? (
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Nenhuma aplicação</span>
              ) : (
                <>
                  {rabbitmqCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <img src="/RabbitMQ.svg" className="w-3 h-3" />
                      {rabbitmqCount}
                    </span>
                  )}
                  {lavinmqCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                      <img src="/LavinMQ.svg" className="w-3 h-3" />
                      {lavinmqCount}
                    </span>
                  )}
                  {mongodbCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <img src="/mongodb.svg" className="w-3 h-3" />
                      {mongodbCount}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--color-border2)' }}>
                    {activeApps.length} {activeApps.length === 1 ? "total" : "total"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!user.deleted_at && (
            <button onClick={onEditStart} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)' }} title="Editar usuário">
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}
          {!user.deleted_at && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Confirmar?</span>
                <button onClick={() => { onDelete(); setConfirmDelete(false); }} disabled={deleting} className="p-1.5 rounded-lg disabled:opacity-50" style={{ color: '#ef4444' }}>
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-fg-muted)' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={user.role === "admin"} className="p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" style={{ color: 'var(--color-fg-muted)' }} title={user.role === "admin" ? "Não é possível excluir admins" : "Excluir usuário"}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {editing && !user.deleted_at && <EditUserPanel user={user} onClose={onEditEnd} onUpdated={onUserUpdated} />}
    </div>
  );
}

interface EditUserPanelProps {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (updates: Partial<AdminUser>) => void;
}

function EditUserPanel({ user, onClose, onUpdated }: EditUserPanelProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    const updates: { newPassword?: string; newEmail?: string } = {};
    if (newPassword) updates.newPassword = newPassword;
    if (newEmail !== user.email) updates.newEmail = newEmail;
    if (!updates.newPassword && !updates.newEmail) { onClose(); return; }
    setLoading(true);
    const result = await adminUpdateUser(user.id, updates);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Usuário atualizado com sucesso.");
      const localUpdates: Partial<AdminUser> = {};
      if (updates.newEmail) localUpdates.email = updates.newEmail;
      if (fullName !== user.full_name) localUpdates.full_name = fullName;
      if (phone !== user.phone) localUpdates.phone = phone;
      if (bio !== user.bio) localUpdates.bio = bio;
      if (avatarUrl !== user.avatar_url) localUpdates.avatar_url = avatarUrl;
      onUpdated(localUpdates);
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div className="mx-6 mb-4 rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>Editar usuário</p>
        </div>
        <button onClick={onClose} style={{ color: 'var(--color-fg-muted)' }}><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><Mail className="w-3 h-3" /> E-mail</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><User className="w-3 h-3" /> Nome completo</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><Phone className="w-3 h-3" /> Telefone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><Camera className="w-3 h-3" /> URL da foto</label>
          <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><FileText className="w-3 h-3" /> Sobre</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}><KeyRound className="w-3 h-3" /> Nova senha</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} className="w-full rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-fg-muted)' }}>
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      {success && <p className="text-xs" style={{ color: 'var(--color-success)' }}>{success}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'transparent' }}>Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  );
}

type AppWithOwner = Application & { userEmail: string; userId: string };

interface ApplicationsTabProps {
  apps: AppWithOwner[];
  loading: boolean;
  onRefresh: () => void;
  onAppUpdated: (appId: string, updates: Partial<Application>) => void;
  onAppDeleted: (appId: string) => void;
  initialTypeFilter?: string;
  onTypeFilterConsumed?: () => void;
}

type DeletedFilter = "all" | "active" | "deleted";

function ApplicationsTab({ apps, loading, onRefresh, onAppUpdated, onAppDeleted, initialTypeFilter, onTypeFilterConsumed }: ApplicationsTabProps) {
  const [userFilter, setUserFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter ?? "");
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>("active");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [hoveredTypeOpt, setHoveredTypeOpt] = useState<string | null>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    }
    if (typeDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [typeDropdownOpen]);

  useEffect(() => {
    if (initialTypeFilter !== undefined && initialTypeFilter !== typeFilter) {
      setTypeFilter(initialTypeFilter);
      onTypeFilterConsumed?.();
    }
  }, [initialTypeFilter]);

  const filtered = apps.filter((a) => {
    const matchUser = a.userEmail.toLowerCase().includes(userFilter.toLowerCase());
    const matchApp = a.name.toLowerCase().includes(appFilter.toLowerCase());
    const matchType = typeFilter ? a.type === typeFilter : true;
    const isDeleted = !!a.deleted_at;
    const matchDeleted =
      deletedFilter === "all" ? true :
      deletedFilter === "deleted" ? isDeleted :
      !isDeleted;
    return matchUser && matchApp && matchType && matchDeleted;
  });

  const uniqueUsers = Array.from(new Set(apps.map((a) => a.userEmail))).sort();
  const hasActiveFilters = !!(userFilter || appFilter || typeFilter || deletedFilter !== "active");

  const deletedFilterOptions: { value: DeletedFilter; label: string }[] = [
    { value: "active", label: "Somente ativas" },
    { value: "all", label: "Ativas + excluídas" },
    { value: "deleted", label: "Somente excluídas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Aplicações Globais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Todas as instâncias da plataforma.</p>
        </div>
        <button onClick={onRefresh} className="btn-glass p-2 rounded-xl" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl" style={{ border: '1px solid var(--color-border)' }}>
        <div className="px-6 py-4 space-y-3 rounded-t-2xl" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Aplicações ({filtered.length})</h2>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {deletedFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDeletedFilter(opt.value)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={deletedFilter === opt.value
                    ? { background: opt.value === 'deleted' ? 'rgba(239,68,68,0.15)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: opt.value === 'deleted' ? '#ef4444' : 'var(--color-primary)' }
                    : { color: 'var(--color-fg-muted)', background: 'transparent' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
              <input type="text" value={appFilter} onChange={(e) => setAppFilter(e.target.value)} placeholder="Buscar por app..." className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
            </div>
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
              <input type="text" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filtrar por usuário..." className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
            </div>
            <div className="relative" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm min-w-[140px] justify-between"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
              >
                <span>{typeFilter === "" ? "Todos os tipos" : typeFilter === "rabbitmq" ? "RabbitMQ" : typeFilter === "lavinmq" ? "LavinMQ" : "MongoDB"}</span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-fg-muted)' }} />
              </button>
              {typeDropdownOpen && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-xl"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  {[{ value: "", label: "Todos os tipos" }, { value: "rabbitmq", label: "RabbitMQ" }, { value: "lavinmq", label: "LavinMQ" }, { value: "mongodb", label: "MongoDB" }].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setTypeFilter(opt.value); setTypeDropdownOpen(false); }}
                      onMouseEnter={() => setHoveredTypeOpt(opt.value)}
                      onMouseLeave={() => setHoveredTypeOpt(null)}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={typeFilter === opt.value
                        ? { background: hoveredTypeOpt === opt.value ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
                        : hoveredTypeOpt === opt.value
                          ? { background: 'rgba(255,255,255,0.06)', color: 'var(--color-fg)' }
                          : { color: 'var(--color-fg)', background: 'transparent' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setUserFilter(""); setAppFilter(""); setTypeFilter(""); setDeletedFilter("active"); }} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}>Limpar</button>
            )}
          </div>

          {uniqueUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {uniqueUsers.map((email) => (
                <button key={email} onClick={() => setUserFilter(userFilter === email ? "" : email)} className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={userFilter === email
                    ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }
                    : { background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }
                  }
                >
                  {email}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhuma aplicação encontrada.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-card)' }}>
            {filtered.map((app, idx) => (
              <div key={app.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
                <AdminAppRow app={app} onUpdated={(updates) => onAppUpdated(app.id, updates)} onDeleted={() => onAppDeleted(app.id)} showDeletedAt={deletedFilter !== "active"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ResourcesTabProps {
  apps: AppWithOwner[];
  loading: boolean;
  onRefresh: () => void;
}

const APP_TYPE_CONFIG = {
  rabbitmq: { label: "RabbitMQ", color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", icon: "/RabbitMQ.svg" },
  lavinmq: { label: "LavinMQ", color: "#06b6d4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)", icon: "/LavinMQ.svg" },
  mongodb: { label: "MongoDB", color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", icon: "/mongodb.svg" },
};

const RABBITMQ_RES_LIMITS = {
  connections: { max: 20, label: "Conexões abertas" },
  queues: { max: 150, label: "Filas" },
  messages: { max: 1_000_000, label: "Mensagens" },
  queue_length: { max: 10_000, label: "Tamanho máx. da fila" },
  idle_days: { max: 28, label: "Tempo máx. de inatividade", unit: "dias" },
  max_queue_size: { label: "Tamanho máx. por fila", value: "1 GB" },
};

const LAVINMQ_RES_LIMITS = {
  connections: { max: 40, label: "Conexões abertas" },
  queues: { max: 300, label: "Filas" },
  messages: { max: 2_000_000, label: "Mensagens" },
  queue_length: { max: 20_000, label: "Tamanho máx. da fila" },
  max_queue_size: { label: "Tamanho máx. por fila", value: "1 GB" },
};

const MONGODB_RES_LIMITS = {
  storage: { max: 20, label: "Armazenamento", displayMax: "20.00 MB" },
  collections: { max: 100, label: "Coleções" },
  connections: { max: 500, label: "Conexões simultâneas" },
};

function UsageBar({ used, max, color }: { used: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : color;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className="text-xs tabular-nums flex-shrink-0 w-16 text-right" style={{ color: barColor }}>
        {used}/{max} <span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>({pct}%)</span>
      </span>
    </div>
  );
}

function formatResNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("pt-BR");
}

interface AmqpStats {
  connections: number;
  queue_count: number;
  total_messages: number;
  max_queue_length: number;
  consumers?: number;
}

function AppLimitCard({ app, color }: { app: AppWithOwner; color: string }) {
  const isMongo = app.type === "mongodb";
  const isRabbit = app.type === "rabbitmq";
  const cfg = APP_TYPE_CONFIG[app.type as keyof typeof APP_TYPE_CONFIG];
  const limits = isRabbit ? RABBITMQ_RES_LIMITS : LAVINMQ_RES_LIMITS;

  const [amqpStats, setAmqpStats] = useState<AmqpStats | null>(null);
  const [loadingAmqp, setLoadingAmqp] = useState(!isMongo);
  const [amqpError, setAmqpError] = useState<string | null>(null);

  const fetchAmqpStats = useCallback(async () => {
    if (isMongo) return;
    setLoadingAmqp(true);
    setAmqpError(null);
    const { data, error } = await invokeWithAuth("app-stats", { appId: app.id });
    if (error) {
      setAmqpError("Erro ao buscar stats");
    } else {
      const d = data as Record<string, unknown>;
      if (d?.error) setAmqpError(d.error as string);
      else setAmqpStats((d?.stats as AmqpStats) ?? null);
    }
    setLoadingAmqp(false);
  }, [app.id, isMongo]);

  useEffect(() => {
    fetchAmqpStats();
  }, [fetchAmqpStats]);

  const connections = amqpStats?.connections ?? 0;
  const queueCount = amqpStats?.queue_count ?? 0;
  const totalMessages = amqpStats?.total_messages ?? 0;
  const maxQueueLen = amqpStats?.max_queue_length ?? 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2">
          <img src={cfg.icon} alt={cfg.label} className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>— {app.name}</span>
        </div>
        {!isMongo && (
          <button
            onClick={fetchAmqpStats}
            disabled={loadingAmqp}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
            style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'var(--color-card)', outline: 'none' }}
          >
            <RefreshCw className={`w-3 h-3 ${loadingAmqp ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        )}
      </div>

      <div className="p-4 space-y-3" style={{ background: 'var(--color-card)' }}>
        {isMongo ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{MONGODB_RES_LIMITS.storage.label}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>0.00 B / {MONGODB_RES_LIMITS.storage.displayMax} (0%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="h-full rounded-full" style={{ width: '0%', background: color }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{MONGODB_RES_LIMITS.collections.label}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>1 / {MONGODB_RES_LIMITS.collections.max} (1%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round(1 / MONGODB_RES_LIMITS.collections.max * 100)}%`, background: color }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{MONGODB_RES_LIMITS.connections.label}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>0 / {MONGODB_RES_LIMITS.connections.max} (0%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="h-full rounded-full" style={{ width: '0%', background: color }} />
              </div>
            </div>
          </>
        ) : amqpError ? (
          <p className="text-xs text-center py-2" style={{ color: '#ef4444' }}>{amqpError}</p>
        ) : loadingAmqp ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{limits.connections.label}</span>
              </div>
              <UsageBar used={connections} max={limits.connections.max} color={color} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{limits.queues.label}</span>
              </div>
              <UsageBar used={queueCount} max={limits.queues.max} color={color} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{limits.messages.label}</span>
              </div>
              <UsageBar used={totalMessages} max={limits.messages.max} color={color} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{limits.queue_length.label}</span>
              </div>
              <UsageBar used={maxQueueLen} max={limits.queue_length.max} color={color} />
            </div>
            {"idle_days" in limits && (
              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{(limits as typeof RABBITMQ_RES_LIMITS).idle_days.label}</span>
                <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-fg)' }}>{(limits as typeof RABBITMQ_RES_LIMITS).idle_days.max} {(limits as typeof RABBITMQ_RES_LIMITS).idle_days.unit}</span>
              </div>
            )}
            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{limits.max_queue_size.label}</span>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-fg)' }}>{limits.max_queue_size.value}</span>
            </div>
            {amqpStats !== null && (
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Mensagens na fila</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color }}>{formatResNum(totalMessages)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResourcesTab({ apps, loading, onRefresh }: ResourcesTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    adminGetStats().then(({ stats: s }) => {
      if (s) setStats(s);
      setStatsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const orgUsed = stats?.by_type ?? { rabbitmq: 0, lavinmq: 0, mongodb: 0 };
  const orgCapacity = stats?.capacity_by_type ?? { rabbitmq: 0, lavinmq: 0, mongodb: 0 };

  const isLoading = loading || statsLoading;

  const appTypes = ["rabbitmq", "lavinmq", "mongodb"] as const;

  const activeApps = apps.filter((a) => !a.deleted_at);

  const userGroups = activeApps.reduce<Record<string, { email: string; apps: AppWithOwner[] }>>((acc, app) => {
    if (!acc[app.userId]) acc[app.userId] = { email: app.userEmail, apps: [] };
    acc[app.userId].apps.push(app);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Recursos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Limites de uso por aplicação e visão geral da organização.</p>
        </div>
        <button onClick={() => { onRefresh(); loadStats(); }} className="btn-glass p-2 rounded-xl" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Visão Geral da Organização</h2>
            <span className="text-xs ml-1" style={{ color: 'var(--color-fg-muted)' }}>— total de slots usados vs. capacidade configurada</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {appTypes.map((type) => {
                const cfg = APP_TYPE_CONFIG[type];
                const used = orgUsed[type] || 0;
                const cap = orgCapacity[type] || 0;
                const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
                const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : cfg.color;
                return (
                  <div key={type} className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <img src={cfg.icon} alt={cfg.label} className="w-4 h-4" />
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: barColor }}>{used}<span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>/{cap} slots</span></span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <p className="text-xs mt-2 text-right" style={{ color: 'var(--color-fg-muted)' }}>{pct}% utilizado</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Limites por Usuário</h2>
          <span className="text-xs ml-1" style={{ color: 'var(--color-fg-muted)' }}>— visão detalhada de recursos por aplicação</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : Object.keys(userGroups).length === 0 ? (
          <div className="flex items-center justify-center py-10 rounded-2xl" style={{ border: '1px solid var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhuma instância ativa.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(userGroups).map(([userId, group]) => {
              const initials = group.email.substring(0, 2).toUpperCase();
              const typeOrder = ["mongodb", "lavinmq", "rabbitmq"] as const;
              const sortedApps = [...group.apps].sort((a, b) => {
                const ai = typeOrder.indexOf(a.type as typeof typeOrder[number]);
                const bi = typeOrder.indexOf(b.type as typeof typeOrder[number]);
                return ai - bi;
              });
              return (
                <div key={userId} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
                  <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg-muted)' }}>
                      {initials}
                    </div>
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-fg)' }}>{group.email}</span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--color-fg-muted)' }}>{sortedApps.length} app{sortedApps.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedApps.map((app) => {
                      const cfg = APP_TYPE_CONFIG[app.type as keyof typeof APP_TYPE_CONFIG];
                      return (
                        <AppLimitCard key={app.id} app={app} color={cfg?.color ?? "#94a3b8"} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: "Criação", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  delete: { label: "Exclusão", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  update: { label: "Atualização", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  rotate_password: { label: "Rotação de senha", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  error: { label: "Erro", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
};

function LogsTab({ initialTypeFilter, onTypeFilterConsumed }: { initialTypeFilter?: string; onTypeFilterConsumed?: () => void }) {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter ?? "");

  const fetchLogs = useCallback(async (eventType?: string) => {
    setLoading(true);
    setError(null);
    const { logs: l, error: e } = await adminGetLogs({ limit: 150, event_type: eventType || undefined });
    if (e) setError(e);
    else setLogs(l ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(initialTypeFilter || undefined);
    if (initialTypeFilter !== undefined) {
      setTypeFilter(initialTypeFilter);
      onTypeFilterConsumed?.();
    }
  }, [fetchLogs]);

  function handleFilterChange(t: string) {
    setTypeFilter(t);
    fetchLogs(t || undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Logs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Eventos recentes da plataforma.</p>
        </div>
        <button onClick={() => fetchLogs(typeFilter || undefined)} className="btn-glass p-2 rounded-xl" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 flex-1">
            <ScrollText className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Eventos ({logs.length})</h2>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--color-fg-muted)' }} />
            {[
              { value: "", label: "Todos" },
              { value: "create", label: "Criação" },
              { value: "delete", label: "Exclusão" },
              { value: "update", label: "Atualização" },
              { value: "rotate_password", label: "Rot. Senha" },
              { value: "error", label: "Erros" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={typeFilter === opt.value
                  ? { background: opt.value === "error" ? 'rgba(239,68,68,0.15)' : 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: opt.value === "error" ? '#ef4444' : 'var(--color-primary)', border: `1px solid ${opt.value === "error" ? 'rgba(239,68,68,0.35)' : 'color-mix(in srgb, var(--color-primary) 30%, transparent)'}` }
                  : { background: 'var(--color-bg-secondary)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }
                }
              >{opt.label}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ background: 'var(--color-card)' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ background: 'var(--color-card)' }}>
            <Activity className="w-8 h-8 mb-3" style={{ color: 'var(--color-fg-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhum evento encontrado.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-card)' }}>
            {logs.map((log, idx) => {
              const typeInfo = EVENT_TYPE_LABELS[log.event_type] || { label: log.event_type, color: 'var(--color-fg-muted)', bg: 'var(--color-bg-secondary)' };
              const date = new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-3.5" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 mt-0.5" style={{ color: typeInfo.color, background: typeInfo.bg }}>
                    {typeInfo.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--color-fg)' }}>
                      {log.user_email || log.user_id}
                    </p>
                    {log.application_id && (
                      <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--color-border2)' }}>
                        app: {log.application_id}
                      </p>
                    )}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-fg-muted)' }}>
                        {Object.entries(log.meta).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock className="w-3 h-3" style={{ color: 'var(--color-border2)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-border2)' }}>{date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminAppRowProps {
  app: AppWithOwner;
  onUpdated: (updates: Partial<Application>) => void;
  onDeleted: () => void;
  showDeletedAt?: boolean;
}

function AdminAppRow({ app, onUpdated, onDeleted, showDeletedAt }: AdminAppRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(app.name);
  const [savingRename, setSavingRename] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateResult, setRotateResult] = useState<{ newPassword?: string; newUrl?: string } | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const typeColor = app.type === "lavinmq"
    ? { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' }
    : app.type === "mongodb"
    ? { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' }
    : { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' };

  async function handleRename() {
    if (!newName.trim() || newName.trim() === app.name) { setRenaming(false); return; }
    setRenameError(null);
    setSavingRename(true);
    const result = await adminUpdateApplication(app.id, newName.trim());
    setSavingRename(false);
    if (result.error) {
      setRenameError(result.error);
    } else {
      onUpdated({ name: newName.trim() });
      setRenaming(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await adminDeleteApplication(app.id);
    setDeleting(false);
    if (!result.error) onDeleted();
  }

  async function handleRotatePassword() {
    setRotating(true);
    setRotateError(null);
    setRotateResult(null);
    const result = await adminRotatePassword(app.id);
    setRotating(false);
    if (result.error) {
      setRotateError(result.error);
    } else {
      setRotateResult({ newPassword: result.new_password, newUrl: result.new_url });
      if (result.new_password) {
        onUpdated({ password: result.new_password, amqp_url: result.new_url || app.amqp_url, mqtt_password: result.new_password });
      }
      setTimeout(() => setRotateResult(null), 6000);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-secondary)' }}>
          {app.type === "lavinmq"
            ? <img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />
            : app.type === "mongodb"
            ? <img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />
            : <img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }} className="flex-1 rounded-lg px-2 py-1 text-sm focus:outline-none" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-primary)', color: 'var(--color-fg)' }} autoFocus />
              <button onClick={handleRename} disabled={savingRename} style={{ color: 'var(--color-success)' }}>
                {savingRename ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRenaming(false); setNewName(app.name); }} style={{ color: 'var(--color-fg-muted)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: app.deleted_at ? 'var(--color-fg-muted)' : 'var(--color-fg)' }}>{app.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ color: typeColor.color, background: typeColor.bg, border: `1px solid ${typeColor.border}` }}>
                {app.type === "lavinmq" ? "LavinMQ" : app.type === "mongodb" ? "MongoDB" : "RabbitMQ"}
              </span>
              {app.deleted_at && (
                <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Excluída
                </span>
              )}
            </div>
          )}
          {renameError && <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{renameError}</p>}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
              Criado: {new Date(app.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            {showDeletedAt && app.deleted_at && (
              <>
                <span className="text-xs" style={{ color: 'var(--color-border)' }}>·</span>
                <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                  Excluído: {new Date(app.deleted_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </>
            )}
            <span className="text-xs" style={{ color: 'var(--color-border)' }}>·</span>
            <p className="text-xs truncate" style={{ color: 'var(--color-fg-muted)' }}>{app.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setShowDetails(!showDetails)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }} title="Ver credenciais">
            <Eye className="w-3.5 h-3.5" />
          </button>

          {(app.mqtt_hostname || app.panel_url) && (
            <a href={app.mqtt_hostname ? `https://${app.mqtt_hostname}/#/` : app.panel_url!} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)' }} title="Abrir painel">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button onClick={() => setRenaming(true)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)' }} title="Renomear">
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button onClick={handleRotatePassword} disabled={rotating} className="p-1.5 rounded-lg transition-all disabled:opacity-50" style={{ color: 'var(--color-fg-muted)' }} title="Rotacionar senha">
            {rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { handleDelete(); setConfirmDelete(false); }} disabled={deleting} className="p-1.5 rounded-lg disabled:opacity-50" style={{ color: '#ef4444' }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ color: 'var(--color-fg-muted)' }} className="p-1.5 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)' }} title="Deletar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {rotateError && (
        <div className="mx-6 mb-3 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs" style={{ color: '#ef4444' }}>{rotateError}</p>
        </div>
      )}

      {rotateResult && (
        <div className="mx-6 mb-3 rounded-lg px-3 py-2 space-y-1" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Senha rotacionada com sucesso!</p>
          {rotateResult.newPassword && (
            <p className="text-xs font-mono" style={{ color: 'var(--color-fg)' }}>
              Nova senha: <span style={{ color: '#22c55e' }}>{rotateResult.newPassword}</span>
            </p>
          )}
        </div>
      )}

      {showDetails && (
        <div className="mx-6 mb-4 rounded-xl p-4 space-y-4" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {app.type === "mongodb" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-fg-muted)' }}>Conexão</p>
              <div className="space-y-2">
                <CredRow label="String de conexão" value={app.connection_url || ""} secret />
                <CredRow label="Banco" value={app.mongo_db || ""} />
                <CredRow label="Usuário" value={app.mongo_user || ""} />
                <CredRow label="Senha" value={app.mongo_password || ""} secret />
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-fg-muted)' }}>Conexão do Painel Web</p>
                <div className="space-y-2">
                  <CredRow label="Hostname" value={app.mqtt_hostname || ""} />
                  <CredRow label="Porta" value={`${app.mqtt_port || 1883} / ${app.mqtt_port_tls || 8883} (TLS)`} />
                  <CredRow label="Usuário" value={app.mqtt_username || app.username} />
                  <CredRow label="Senha" value={app.mqtt_password || app.password} secret />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-fg-muted)' }}>Conexão da Aplicação</p>
                <div className="space-y-2">
                  <CredRow label="URL" value={app.amqp_url} secret />
                  <CredRow label="Usuário" value={app.username} />
                  <CredRow label="Senha" value={app.password} secret />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CredRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
      <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--color-fg)' }}>
        {secret && !show ? "••••••••••" : value || "—"}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {secret && (
          <button onClick={() => setShow(!show)} className="p-1 rounded" style={{ color: 'var(--color-fg-muted)' }}>
            {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
        <button onClick={handleCopy} className="p-1 rounded" style={{ color: copied ? 'var(--color-success)' : 'var(--color-fg-muted)' }} title="Copiar">
          {copied ? <Check className="w-3 h-3" /> : <Package className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
