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
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ApplicationCard from "../components/ApplicationCard";
import CreateApplicationModal from "../components/CreateApplicationModal";
import ApplicationDetailModal from "../components/ApplicationDetailModal";
import UserProfile, { calcCompletion } from "../components/UserProfile";
import ProfileIncompletePopup from "../components/ProfileIncompletePopup";
import { listApplications, createApplication, deleteApplication } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Application, UserProfile as UserProfileType } from "../types/database";

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

  const [profileCompletion, setProfileCompletion] = useState(100);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    const { applications, error } = await listApplications();
    setApplications(applications);
    if (error) setAppsError(error);
    setLoadingApps(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchApplications();
    }
  }, [session, fetchApplications]);

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
    setDeletingId(null);
  }

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        profileCompletion={profileCompletion}
      />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
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
            />
          )}
          {activeSection === "profile" && (
            <UserProfile
              onProfileLoaded={handleProfileLoaded}
            />
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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Visão Geral</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Bem-vindo ao seu painel DevOps.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Package className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />} label="Total de aplicações" value={total} color="primary" />
        <StatCard icon={<img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />} label="RabbitMQ" value={rabbitmq} color="orange" />
        <StatCard icon={<img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />} label="LavinMQ" value={lavinmq} color="cyan" />
        <StatCard icon={<img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />} label="MongoDB" value={mongodb} color="green" />
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--color-fg)' }}>
          <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
          Módulos disponíveis em breve
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Cursos", "Monitor SSL", "Vulnerabilidades", "Blacklist IP", "Observabilidade"].map((mod) => (
            <div
              key={mod}
              className="rounded-xl px-3 py-3 text-center"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{mod}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-border2)' }}>Em breve</p>
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
    ? { background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)' }
    : color === "orange"
    ? { background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)' }
    : color === "green"
    ? { background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }
    : { background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' };

  return (
    <div className="rounded-2xl p-5" style={borderStyle}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-fg)' }}>{value}</p>
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
}: ApplicationsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Aplicações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Gerencie suas instâncias de mensageria.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl transition-all"
            style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'transparent' }}
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
          >
            <Plus className="w-4 h-4" />
            Criar aplicação
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          <button
            onClick={onRefresh}
            className="ml-auto text-xs font-medium underline underline-offset-2"
            style={{ color: '#ef4444' }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Carregando aplicações...</p>
          </div>
        </div>
      ) : applications.length === 0 && !error ? (
        <EmptyState onOpenCreate={onOpenCreate} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {applications.map((app) => (
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

function EmptyState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <Server className="w-7 h-7" style={{ color: 'var(--color-fg-muted)' }} />
      </div>
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--color-fg)' }}>Nenhuma aplicação ainda</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--color-fg-muted)' }}>
        Crie sua primeira instância de mensageria RabbitMQ, LavinMQ ou MongoDB.
      </p>
      <button
        onClick={onOpenCreate}
        className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
      >
        <Plus className="w-4 h-4" />
        Criar primeira aplicação
      </button>
    </div>
  );
}

export { User };
