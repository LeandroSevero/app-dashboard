import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Server,
  LayoutDashboard,
  RefreshCw,
  Package,
  Activity,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ApplicationCard from "../components/ApplicationCard";
import CreateApplicationModal from "../components/CreateApplicationModal";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Application } from "../types/database";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Dashboard() {
  const { session } = useAuth();
  const [activeSection, setActiveSection] = useState("applications");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setApplications(data as Application[]);
    setLoadingApps(false);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleCreate(name: string, type: string): Promise<{ error?: string; next_allowed_at?: string }> {
    try {
      const token = session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cloudamqp/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ name, type }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || data.error || "Erro ao criar aplicação.", next_allowed_at: data.next_allowed_at };
      }

      setShowCreateModal(false);
      await fetchApplications();
      return {};
    } catch {
      return { error: "Erro de conexão. Tente novamente." };
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const token = session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cloudamqp/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Apikey: SUPABASE_ANON_KEY,
        },
      });

      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      /* ignore */
    }
    setDeletingId(null);
  }

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
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
              deletingId={deletingId}
              onDelete={handleDelete}
              onRefresh={fetchApplications}
              onOpenCreate={() => setShowCreateModal(true)}
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
    </div>
  );
}

function DashboardHome({ apps }: { apps: Application[] }) {
  const total = apps.length;
  const rabbitmq = apps.filter((a) => a.type === "rabbitmq").length;
  const lavinmq = apps.filter((a) => a.type === "lavinmq").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Visão Geral</h1>
        <p className="text-slate-400 text-sm mt-1">Bem-vindo ao seu painel DevOps.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Package className="w-5 h-5 text-blue-400" />} label="Total de aplicações" value={total} color="blue" />
        <StatCard icon={<Server className="w-5 h-5 text-orange-400" />} label="RabbitMQ" value={rabbitmq} color="orange" />
        <StatCard icon={<Activity className="w-5 h-5 text-cyan-400" />} label="LavinMQ" value={lavinmq} color="cyan" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-slate-300 font-semibold text-sm mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          Módulos disponíveis em breve
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Cursos", "Monitor SSL", "Vulnerabilidades", "Blacklist IP", "Observabilidade"].map((mod) => (
            <div key={mod} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 text-center">
              <p className="text-slate-500 text-xs font-medium">{mod}</p>
              <p className="text-xs text-slate-600 mt-0.5">Em breve</p>
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
  color: "blue" | "orange" | "cyan";
}) {
  const bg = {
    blue: "bg-blue-500/5 border-blue-500/10",
    orange: "bg-orange-500/5 border-orange-500/10",
    cyan: "bg-cyan-500/5 border-cyan-500/10",
  }[color];

  return (
    <div className={`${bg} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

interface ApplicationsSectionProps {
  applications: Application[];
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

function ApplicationsSection({
  applications,
  loading,
  deletingId,
  onDelete,
  onRefresh,
  onOpenCreate,
}: ApplicationsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Aplicações</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie suas instâncias de mensageria.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-slate-800 transition-all"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Criar aplicação
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
            <p className="text-slate-500 text-sm">Carregando aplicações...</p>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <EmptyState onOpenCreate={onOpenCreate} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onDelete={onDelete}
              deleting={deletingId === app.id}
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
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-5">
        <Server className="w-7 h-7 text-slate-600" />
      </div>
      <h3 className="text-slate-300 font-semibold text-base mb-1">Nenhuma aplicação ainda</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6">
        Crie sua primeira instância de mensageria RabbitMQ ou LavinMQ.
      </p>
      <button
        onClick={onOpenCreate}
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
      >
        <Plus className="w-4 h-4" />
        Criar primeira aplicação
      </button>
    </div>
  );
}
