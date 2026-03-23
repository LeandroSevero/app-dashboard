import { useState, useEffect, useCallback } from "react";
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
import type { AdminUser, Application } from "../types/database";

type AdminSection =
  | "admin-dashboard"
  | "applications"
  | "admin-users"
  | "admin-apps"
  | "admin-resources"
  | "admin-logs"
  | "admin-settings";

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("admin-dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetched, setUsersFetched] = useState(false);

  const [myApps, setMyApps] = useState<Application[]>([]);
  const [myAppsLoading, setMyAppsLoading] = useState(false);
  const [myAppsFetched, setMyAppsFetched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

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

  useEffect(() => {
    if ((activeSection === "admin-users" || activeSection === "admin-apps" || activeSection === "admin-resources") && !usersFetched) {
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
    setUsers((prev) => prev.filter((u) => u.id !== userId));
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

  const allApps: (Application & { userEmail: string; userId: string })[] = users.flatMap((u) =>
    u.applications.map((a) => ({ ...a, userEmail: u.email, userId: u.id }))
  );

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
      />

      <main className={`${sidebarWidth} pt-14 transition-all duration-300 min-h-screen`}>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {activeSection === "admin-dashboard" && (
            <AdminDashboardSection />
          )}

          {activeSection === "applications" && (
            <MyApplicationsSection
              apps={myApps}
              loading={myAppsLoading}
              deletingId={deletingId}
              onDelete={handleMyAppDelete}
              onRefresh={fetchMyApps}
              onOpenCreate={() => setShowCreateModal(true)}
              onViewDetails={setDetailApp}
            />
          )}

          {activeSection === "admin-users" && (
            <UsersTab
              users={users}
              loading={usersLoading}
              onRefresh={fetchUsers}
              onUserUpdated={handleUserUpdated}
              onUserDeleted={handleUserDeleted}
            />
          )}

          {activeSection === "admin-apps" && (
            <ApplicationsTab
              apps={allApps}
              loading={usersLoading}
              onRefresh={fetchUsers}
              onAppUpdated={handleAppUpdated}
              onAppDeleted={handleAppDeleted}
            />
          )}

          {activeSection === "admin-resources" && (
            <ResourcesTab apps={allApps} loading={usersLoading} onRefresh={fetchUsers} />
          )}

          {activeSection === "admin-logs" && (
            <LogsTab />
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

function AdminDashboardSection() {
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
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}
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
        <BigStatCard icon={<Users className="w-5 h-5" />} label="Usuários" value={stats.total_users} color="primary" />
        <BigStatCard icon={<Boxes className="w-5 h-5" />} label="Aplicações" value={stats.total_apps} color="orange" />
        <BigStatCard icon={<ShieldCheck className="w-5 h-5" />} label="Admins" value={stats.total_admins} color="cyan" />
        <BigStatCard icon={<AlertCircle className="w-5 h-5" />} label="Erros" value={stats.total_errors} color="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TypeCard icon={<img src="/RabbitMQ.svg" className="w-5 h-5" />} label="RabbitMQ" count={stats.by_type.rabbitmq} color="#f97316" bg="rgba(249,115,22,0.08)" border="rgba(249,115,22,0.2)" />
        <TypeCard icon={<img src="/LavinMQ.svg" className="w-5 h-5" />} label="LavinMQ" count={stats.by_type.lavinmq} color="#06b6d4" bg="rgba(6,182,212,0.08)" border="rgba(6,182,212,0.2)" />
        <TypeCard icon={<img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />} label="MongoDB" count={stats.by_type.mongodb} color="#22c55e" bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MiniChart title="Aplicações (7 dias)" data={stats.apps_last_7_days} color="var(--color-primary)" />
        <MiniChart title="Usuários (7 dias)" data={stats.users_last_7_days} color="#22c55e" />
      </div>
    </div>
  );
}

function BigStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const styles: Record<string, { bg: string; border: string; iconColor: string }> = {
    primary: { bg: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', iconColor: 'var(--color-primary)' },
    orange: { bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.12)', iconColor: '#f97316' },
    cyan: { bg: 'rgba(6,182,212,0.05)', border: 'rgba(6,182,212,0.12)', iconColor: '#06b6d4' },
    red: { bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.12)', iconColor: '#ef4444' },
  };
  const s = styles[color];
  return (
    <div className="rounded-2xl p-5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
        <span style={{ color: s.iconColor }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-fg)' }}>{value}</p>
    </div>
  );
}

function TypeCard({ icon, label, count, color, bg, border }: { icon: React.ReactNode; label: string; count: number; color: string; bg: string; border: string }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-card)', border: `1px solid ${border}` }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>{count}</p>
      </div>
    </div>
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
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onViewDetails: (app: Application) => void;
}

function MyApplicationsSection({ apps, loading, deletingId, onDelete, onRefresh, onOpenCreate, onViewDetails }: MyApplicationsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Minhas Aplicações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Suas instâncias pessoais.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={onOpenCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
            <Package className="w-4 h-4" />
            Criar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Server className="w-6 h-6" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--color-fg)' }}>Nenhuma aplicação</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-fg-muted)' }}>Crie sua primeira instância.</p>
          <button onClick={onOpenCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
            <Package className="w-4 h-4" />
            Criar aplicação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onDelete={onDelete}
              deleting={deletingId === app.id}
              onViewDetails={onViewDetails}
            />
          ))}
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
}

function UsersTab({ users, loading, onRefresh, onUserUpdated, onUserDeleted }: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <button onClick={onRefresh} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }} title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
              Usuários ({filtered.length})
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuário..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-48"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
            />
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
            <span className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
              {user.full_name || <span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>Sem nome</span>}
            </span>
            {user.role === "admin" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }}>
                ADM
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{user.email}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-border2)' }}>
            {user.applications.length} {user.applications.length === 1 ? "aplicação" : "aplicações"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onEditStart} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--color-fg-muted)' }} title="Editar usuário">
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
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
          )}
        </div>
      </div>

      {editing && <EditUserPanel user={user} onClose={onEditEnd} onUpdated={onUserUpdated} />}
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
}

function ApplicationsTab({ apps, loading, onRefresh, onAppUpdated, onAppDeleted }: ApplicationsTabProps) {
  const [userFilter, setUserFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = apps.filter((a) => {
    const matchUser = a.userEmail.toLowerCase().includes(userFilter.toLowerCase());
    const matchApp = a.name.toLowerCase().includes(appFilter.toLowerCase());
    const matchType = typeFilter ? a.type === typeFilter : true;
    return matchUser && matchApp && matchType;
  });

  const uniqueUsers = Array.from(new Set(apps.map((a) => a.userEmail))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Aplicações Globais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Todas as instâncias da plataforma.</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }} title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="px-6 py-4 space-y-3" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Aplicações ({filtered.length})</h2>
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
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}>
              <option value="">Todos os tipos</option>
              <option value="rabbitmq">RabbitMQ</option>
              <option value="lavinmq">LavinMQ</option>
              <option value="mongodb">MongoDB</option>
            </select>
            {(userFilter || appFilter || typeFilter) && (
              <button onClick={() => { setUserFilter(""); setAppFilter(""); setTypeFilter(""); }} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}>Limpar</button>
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
                <AdminAppRow app={app} onUpdated={(updates) => onAppUpdated(app.id, updates)} onDeleted={() => onAppDeleted(app.id)} />
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

function ResourcesTab({ apps, loading, onRefresh }: ResourcesTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminGetStats().then(({ stats: s }) => { if (s) setStats(s); });
  }, []);

  const mongoApps = apps.filter((a) => a.type === "mongodb");
  const rabbitApps = apps.filter((a) => a.type === "rabbitmq");
  const lavinApps = apps.filter((a) => a.type === "lavinmq");

  const capacity = stats?.capacity_by_type ?? { rabbitmq: 0, lavinmq: 0, mongodb: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Recursos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Visão dos recursos de infraestrutura alocados.</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }} title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ResourceCard
          title="MongoDB Atlas"
          icon={<img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />}
          color="#22c55e"
          border="rgba(34,197,94,0.2)"
          bg="rgba(34,197,94,0.05)"
          used={mongoApps.length}
          capacity={capacity.mongodb}
          stats={[
            { label: "Databases criadas", value: mongoApps.length },
            { label: "Usuários criados", value: mongoApps.length },
          ]}
          items={mongoApps.map((a) => ({ name: a.name, sub: a.userEmail, detail: a.mongo_db || "—" }))}
          loading={loading}
          emptyText="Nenhuma instância MongoDB criada."
        />

        <ResourceCard
          title="CloudAMQP — RabbitMQ"
          icon={<img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />}
          color="#f97316"
          border="rgba(249,115,22,0.2)"
          bg="rgba(249,115,22,0.05)"
          used={rabbitApps.length}
          capacity={capacity.rabbitmq}
          stats={[
            { label: "Instâncias criadas", value: rabbitApps.length },
          ]}
          items={rabbitApps.map((a) => ({ name: a.name, sub: a.userEmail, detail: a.mqtt_hostname || "—" }))}
          loading={loading}
          emptyText="Nenhuma instância RabbitMQ criada."
        />
      </div>

      <ResourceCard
        title="CloudAMQP — LavinMQ"
        icon={<img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />}
        color="#06b6d4"
        border="rgba(6,182,212,0.2)"
        bg="rgba(6,182,212,0.05)"
        used={lavinApps.length}
        capacity={capacity.lavinmq}
        stats={[
          { label: "Instâncias criadas", value: lavinApps.length },
        ]}
        items={lavinApps.map((a) => ({ name: a.name, sub: a.userEmail, detail: a.mqtt_hostname || "—" }))}
        loading={loading}
        emptyText="Nenhuma instância LavinMQ criada."
      />
    </div>
  );
}

function ResourceCard({ title, icon, color, border, bg, used, capacity, stats, items, loading, emptyText }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  used: number;
  capacity: number;
  stats: Array<{ label: string; value: number }>;
  items: Array<{ name: string; sub: string; detail: string }>;
  loading: boolean;
  emptyText: string;
}) {
  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : color;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-card)', border: `1px solid ${border}` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>{title}</p>
          <div className="flex items-center gap-4 mt-0.5">
            {stats.map((s) => (
              <p key={s.label} className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                <span style={{ color, fontWeight: 600 }}>{s.value}</span> {s.label}
              </p>
            ))}
          </div>
        </div>
        {capacity > 0 && (
          <div className="flex-shrink-0 text-right" style={{ minWidth: 56 }}>
            <p className="text-xs font-semibold tabular-nums" style={{ color: barColor }}>{used}<span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>/{capacity}</span></p>
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{pct}% usado</p>
          </div>
        )}
      </div>
      {capacity > 0 && (
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Uso de capacidade</span>
            <span className="text-xs font-medium tabular-nums" style={{ color: barColor }}>{used} de {capacity} slots</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>
      )}
      <div className="divide-y mt-2" style={{ borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>{emptyText}</p>
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-fg)' }}>{item.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{item.sub}</p>
              </div>
              <p className="text-xs font-mono flex-shrink-0 max-w-[140px] truncate" style={{ color: 'var(--color-border2)' }}>{item.detail}</p>
            </div>
          ))
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

function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");

  const fetchLogs = useCallback(async (eventType?: string) => {
    setLoading(true);
    setError(null);
    const { logs: l, error: e } = await adminGetLogs({ limit: 150, event_type: eventType || undefined });
    if (e) setError(e);
    else setLogs(l ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
        <button onClick={() => fetchLogs(typeFilter || undefined)} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }} title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 flex-1">
            <ScrollText className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>Eventos ({logs.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
            >
              <option value="">Todos os eventos</option>
              <option value="create">Criação</option>
              <option value="delete">Exclusão</option>
              <option value="update">Atualização</option>
              <option value="rotate_password">Rotação de senha</option>
              <option value="error">Erros</option>
            </select>
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
}

function AdminAppRow({ app, onUpdated, onDeleted }: AdminAppRowProps) {
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
              <span className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>{app.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ color: typeColor.color, background: typeColor.bg, border: `1px solid ${typeColor.border}` }}>
                {app.type === "lavinmq" ? "LavinMQ" : app.type === "mongodb" ? "MongoDB" : "RabbitMQ"}
              </span>
            </div>
          )}
          {renameError && <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{renameError}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{new Date(app.created_at).toLocaleDateString("pt-BR")}</p>
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
                <CredRow label="Connection String" value={app.connection_url || ""} secret />
                <CredRow label="Database" value={app.mongo_db || ""} />
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
