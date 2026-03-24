import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Server,
  LayoutDashboard,
  RefreshCw,
  Package,
  Activity,
  User,
  AlertCircle,
  Search,
  History,
  Trash2,
  Clock,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ApplicationCard from "../components/ApplicationCard";
import CreateApplicationModal from "../components/CreateApplicationModal";
import ApplicationDetailModal from "../components/ApplicationDetailModal";
import UserProfile, { calcCompletion } from "../components/UserProfile";
import ProfileIncompletePopup from "../components/ProfileIncompletePopup";
import { listApplications, listInactiveApplications, createApplication, deleteApplication } from "../lib/api";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  triggerExpireApplications,
} from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import type { Application, UserProfile as UserProfileType, Notification } from "../types/database";

export default function Dashboard() {
  const { session } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appsInitialFilter, setAppsInitialFilter] = useState("");
  const [appsFilterVersion, setAppsFilterVersion] = useState(0);

  const [inactiveApplications, setInactiveApplications] = useState<Application[]>([]);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [profileCompletion, setProfileCompletion] = useState(100);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  const loadNotifications = useCallback(async () => {
    const result = await fetchNotifications();
    if (result.success && result.data) {
      setNotifications(result.data);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    const { applications, error } = await listApplications();
    setApplications(applications);
    if (error) setAppsError(error);
    setLoadingApps(false);
  }, []);

  const fetchInactiveApplications = useCallback(async () => {
    setLoadingInactive(true);
    const { applications } = await listInactiveApplications();
    setInactiveApplications(applications);
    setLoadingInactive(false);
  }, []);

  async function handleToggleInactive(show: boolean) {
    setShowInactive(show);
    if (show) {
      await fetchInactiveApplications();
    }
  }

  useEffect(() => {
    if (!session) return;
    fetchApplications();
    loadNotifications();
  }, [session, fetchApplications, loadNotifications]);

  useEffect(() => {
    if (!session) return;

    const runExpiration = async () => {
      await triggerExpireApplications();
      await fetchApplications();
      await loadNotifications();
    };

    runExpiration();

    const interval = setInterval(runExpiration, 60000);
    return () => clearInterval(interval);
  }, [session, fetchApplications, loadNotifications]);

  function handleProfileLoaded(profile: UserProfileType) {
    const pct = calcCompletion(profile);
    setProfileCompletion(pct);
    if (pct < 100 && !popupDismissed) {
      setShowProfilePopup(true);
    }
  }

  function handleDismissPopup() {
    setShowProfilePopup(false);
    setPopupDismissed(true);
  }

  function handleGoToProfile() {
    setShowProfilePopup(false);
    setPopupDismissed(true);
    setActiveSection("profile");
  }

  async function handleCreate(name: string, type: string, ttlHours: number | null): Promise<{ error?: string; next_allowed_at?: string }> {
    const result = await createApplication(name, type, ttlHours);
    if (result.error) {
      return { error: result.error, next_allowed_at: result.next_allowed_at };
    }
    setShowCreateModal(false);
    await fetchApplications();
    return {};
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteApplication(id);
    if (!result.error) {
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
    await fetchApplications();
    await loadNotifications();
    setDeletingId(null);
  }

  async function handleMarkNotificationRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function handleMarkAllNotificationsRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-fg)" }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        profileCompletion={profileCompletion}
      />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onNotificationClick={async (notif) => {
          const appName = (notif.meta?.app_name as string) ?? "";
          setAppsInitialFilter(appName);
          setAppsFilterVersion((v) => v + 1);
          if (notif.type === "app_expired") {
            setShowInactive(true);
            await fetchInactiveApplications();
          }
          setActiveSection("applications");
        }}
      />

      <main className={`${sidebarWidth} pt-14 transition-all duration-300 min-h-screen`}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {activeSection === "dashboard" && <DashboardHome apps={applications} />}
          {activeSection === "applications" && (
            <ApplicationsSection
              applications={applications}
              loading={loadingApps}
              error={appsError}
              deletingId={deletingId}
              onDelete={handleDelete}
              onRefresh={fetchApplications}
              onOpenCreate={() => setShowCreateModal(true)}
              onViewDetails={setDetailApp}
              initialAppFilter={appsInitialFilter}
              filterVersion={appsFilterVersion}
              inactiveApplications={inactiveApplications}
              loadingInactive={loadingInactive}
              showInactive={showInactive}
              onToggleInactive={handleToggleInactive}
            />
          )}
          {activeSection === "profile" && (
            <UserProfile onProfileLoaded={handleProfileLoaded} />
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {detailApp && (
        <ApplicationDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
        />
      )}

      {showProfilePopup && profileCompletion < 100 && (
        <ProfileIncompletePopup
          completion={profileCompletion}
          onClose={handleDismissPopup}
          onGoToProfile={handleGoToProfile}
        />
      )}
    </div>
  );
}

function DashboardHome({ apps }: { apps: Application[] }) {
  const total = apps.length;
  const rabbitmq = apps.filter((a) => a.type === "rabbitmq").length;
  const lavinmq = apps.filter((a) => a.type === "lavinmq").length;
  const mongodb = apps.filter((a) => a.type === "mongodb").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-fg)" }}>Visão Geral</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-fg-muted)" }}>Bem-vindo ao seu painel DevOps.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Package className="w-5 h-5" style={{ color: "var(--color-primary)" }} />} label="Total de aplicações" value={total} color="primary" />
        <StatCard icon={<img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />} label="RabbitMQ" value={rabbitmq} color="orange" />
        <StatCard icon={<img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />} label="LavinMQ" value={lavinmq} color="cyan" />
        <StatCard icon={<img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />} label="MongoDB" value={mongodb} color="green" />
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "var(--color-fg)" }}>
          <LayoutDashboard className="w-4 h-4" style={{ color: "var(--color-fg-muted)" }} />
          Módulos disponíveis em breve
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Cursos", "Monitor SSL", "Vulnerabilidades", "Blacklist IP", "Observabilidade"].map((mod) => (
            <div
              key={mod}
              className="rounded-xl px-3 py-3 text-center"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{mod}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-border2)" }}>Em breve</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "orange" | "cyan" | "green";
}) {
  const borderStyle = color === "primary"
    ? { background: "color-mix(in srgb, var(--color-primary) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)" }
    : color === "orange"
    ? { background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)" }
    : color === "green"
    ? { background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }
    : { background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.1)" };

  return (
    <div className="rounded-2xl p-5" style={borderStyle}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold" style={{ color: "var(--color-fg)" }}>{value}</p>
    </div>
  );
}

interface ApplicationsSectionProps {
  applications: Application[];
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onViewDetails: (app: Application) => void;
  initialAppFilter?: string;
  filterVersion?: number;
  inactiveApplications: Application[];
  loadingInactive: boolean;
  showInactive: boolean;
  onToggleInactive: (show: boolean) => void;
}

function ApplicationsSection({
  applications,
  loading,
  error,
  deletingId,
  onDelete,
  onRefresh,
  onOpenCreate,
  onViewDetails,
  initialAppFilter,
  filterVersion,
  inactiveApplications,
  loadingInactive,
  showInactive,
  onToggleInactive,
}: ApplicationsSectionProps) {
  const [appFilter, setAppFilter] = useState(initialAppFilter ?? "");

  useEffect(() => {
    if (initialAppFilter !== undefined) {
      setAppFilter(initialAppFilter);
    }
  }, [initialAppFilter, filterVersion]);

  const filtered = appFilter
    ? applications.filter((a) => a.name.toLowerCase().includes(appFilter.toLowerCase()))
    : applications;

  const filteredInactive = appFilter
    ? inactiveApplications.filter((a) => a.name.toLowerCase().includes(appFilter.toLowerCase()))
    : inactiveApplications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-fg)" }}>Aplicações</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-fg-muted)" }}>Gerencie suas instâncias de mensageria.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-fg-muted)" }} />
            <input
              type="text"
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              placeholder="Buscar aplicação..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-44"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-fg)" }}
            />
          </div>
          <button
            onClick={onRefresh}
            className="btn-glass p-2 rounded-xl"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onOpenCreate}
            className="btn-glass-primary flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Criar aplicação
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
          <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
          <button
            onClick={onRefresh}
            className="ml-auto text-xs font-medium underline underline-offset-2"
            style={{ color: "#ef4444" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--color-fg-muted)" }} />
            <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>Carregando aplicações...</p>
          </div>
        </div>
      ) : applications.length === 0 && !error ? (
        <EmptyState onOpenCreate={onOpenCreate} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 mb-3" style={{ color: "var(--color-fg-muted)" }} />
          <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>Nenhuma aplicação encontrada para "{appFilter}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((app) => (
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

      <div>
        <button
          onClick={() => onToggleInactive(!showInactive)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all"
          style={{
            background: showInactive ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "var(--color-bg-secondary)",
            border: `1px solid ${showInactive ? "color-mix(in srgb, var(--color-primary) 30%, transparent)" : "var(--color-border)"}`,
            color: showInactive ? "var(--color-primary)" : "var(--color-fg-muted)",
          }}
        >
          <History className="w-4 h-4" />
          {showInactive ? "Ocultar histórico" : "Ver deletadas e expiradas"}
          {loadingInactive && <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1" />}
        </button>

        {showInactive && !loadingInactive && (
          <div className="mt-4">
            {filteredInactive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="w-7 h-7 mb-3" style={{ color: "var(--color-fg-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
                  {appFilter
                    ? `Nenhuma aplicação deletada ou expirada encontrada para "${appFilter}".`
                    : "Nenhuma aplicação deletada ou expirada."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredInactive.map((app) => (
                  <InactiveApplicationCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InactiveApplicationCard({ app }: { app: Application }) {
  const typeLabel = app.type === "lavinmq" ? "LavinMQ" : app.type === "mongodb" ? "MongoDB" : "RabbitMQ";
  const typeBadgeStyle = app.type === "lavinmq"
    ? { color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }
    : app.type === "mongodb"
    ? { color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
    : { color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' };

  const isDeleted = !!app.deleted_at;
  const statusDate = isDeleted ? app.deleted_at! : app.expires_at!;
  const statusLabel = isDeleted ? "Deletada em" : "Expirou em";

  const formattedDate = new Date(statusDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="rounded-2xl flex items-center gap-4 px-5 py-4 opacity-60"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
      >
        {app.type === "lavinmq" ? (
          <img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5 grayscale" />
        ) : app.type === "mongodb" ? (
          <img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5 grayscale" />
        ) : (
          <img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5 grayscale" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-fg)" }}>{app.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isDeleted ? (
            <Trash2 className="w-3 h-3 flex-shrink-0" style={{ color: "#ef4444" }} />
          ) : (
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "#f59e0b" }} />
          )}
          <p className="text-xs truncate" style={{ color: "var(--color-fg-muted)" }}>
            {statusLabel} {formattedDate}
          </p>
        </div>
      </div>
      <span className="text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0" style={typeBadgeStyle}>
        {typeLabel}
      </span>
    </div>
  );
}

function EmptyState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <Server className="w-7 h-7" style={{ color: "var(--color-fg-muted)" }} />
      </div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--color-fg)" }}>Nenhuma aplicação ainda</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: "var(--color-fg-muted)" }}>
        Crie sua primeira instância de mensageria RabbitMQ, LavinMQ ou MongoDB.
      </p>
      <button
        onClick={onOpenCreate}
        className="btn-glass-primary flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl"
      >
        <Plus className="w-4 h-4" />
        Criar primeira aplicação
      </button>
    </div>
  );
}

export { User, Activity };
