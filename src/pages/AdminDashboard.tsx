import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Server,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Trash2,
  KeyRound,
  Pencil,
  ShieldCheck,
  ExternalLink,
  Package,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateApplication,
  adminDeleteApplication,
} from "../lib/api";
import type { AdminUser, Application } from "../types/database";

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("admin-users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { users } = await adminListUsers();
    setUsers(users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-60";

  const totalApps = users.reduce((acc, u) => acc + u.applications.length, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        isAdmin
      />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <main className={`${sidebarWidth} pt-14 transition-all duration-300 min-h-screen`}>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          <AdminBanner />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<Users className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />} label="Usuários ativos" value={users.length} />
            <StatCard icon={<Package className="w-5 h-5 text-orange-400" />} label="Aplicações totais" value={totalApps} />
            <StatCard
              icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
              label="Admins"
              value={users.filter((u) => u.role === "admin").length}
            />
          </div>

          <UsersTable
            users={users}
            loading={loading}
            onRefresh={fetchUsers}
            onUsersChange={setUsers}
          />
        </div>
      </main>
    </div>
  );
}

function AdminBanner() {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{
        background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
      }}
    >
      <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          Modo Administrador ativo
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
          Você tem acesso total a todos os usuários e aplicações da plataforma.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-fg)' }}>{value}</p>
    </div>
  );
}

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
  onUsersChange: (users: AdminUser[]) => void;
}

function UsersTable({ users, loading, onRefresh, onUsersChange }: UsersTableProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedUser((prev) => (prev === id ? null : id));
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId);
    const result = await adminDeleteUser(userId);
    if (!result.error) {
      onUsersChange(users.filter((u) => u.id !== userId));
    }
    setDeletingUserId(null);
  }

  function handleUserUpdated(userId: string, updates: Partial<AdminUser>) {
    onUsersChange(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  }

  function handleAppUpdated(userId: string, appId: string, updates: Partial<Application>) {
    onUsersChange(
      users.map((u) =>
        u.id === userId
          ? { ...u, applications: u.applications.map((a) => (a.id === appId ? { ...a, ...updates } : a)) }
          : u
      )
    );
  }

  function handleAppDeleted(userId: string, appId: string) {
    onUsersChange(
      users.map((u) =>
        u.id === userId ? { ...u, applications: u.applications.filter((a) => a.id !== appId) } : u
      )
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
            Usuários ({users.length})
          </h2>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-fg-muted)' }}
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center py-16"
          style={{ background: 'var(--color-card)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Carregando usuários...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center py-16" style={{ background: 'var(--color-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)' }}>
          {users.map((user, idx) => (
            <div key={user.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
              <UserRow
                user={user}
                expanded={expandedUser === user.id}
                onToggle={() => toggleExpand(user.id)}
                editing={editingUser === user.id}
                onEditStart={() => setEditingUser(user.id)}
                onEditEnd={() => setEditingUser(null)}
                deleting={deletingUserId === user.id}
                onDelete={() => handleDeleteUser(user.id)}
                onUserUpdated={(updates) => handleUserUpdated(user.id, updates)}
                onAppUpdated={(appId, updates) => handleAppUpdated(user.id, appId, updates)}
                onAppDeleted={(appId) => handleAppDeleted(user.id, appId)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UserRowProps {
  user: AdminUser;
  expanded: boolean;
  onToggle: () => void;
  editing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  deleting: boolean;
  onDelete: () => void;
  onUserUpdated: (updates: Partial<AdminUser>) => void;
  onAppUpdated: (appId: string, updates: Partial<Application>) => void;
  onAppDeleted: (appId: string) => void;
}

function UserRow({
  user,
  expanded,
  onToggle,
  editing,
  onEditStart,
  onEditEnd,
  deleting,
  onDelete,
  onUserUpdated,
  onAppUpdated,
  onAppDeleted,
}: UserRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const joinDate = new Date(user.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <div
        className="flex items-center gap-3 px-6 py-4 transition-colors"
        style={{ background: 'transparent' }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              background: user.role === "admin"
                ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                : 'var(--color-bg-secondary)',
              color: user.role === "admin" ? 'var(--color-primary)' : 'var(--color-fg-muted)',
              border: `1px solid ${user.role === "admin" ? 'color-mix(in srgb, var(--color-primary) 25%, transparent)' : 'var(--color-border)'}`,
            }}
          >
            {user.email.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-fg)' }}>
                {user.email}
              </span>
              {user.role === "admin" && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                    color: 'var(--color-primary)',
                    border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                  }}
                >
                  ADM
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
              {user.applications.length} aplicação(ões) · desde {joinDate}
            </p>
          </div>
          <div className="flex-shrink-0 ml-2" style={{ color: 'var(--color-fg-muted)' }}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onEditStart}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Editar usuário"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Confirmar?</span>
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                disabled={deleting}
                className="p-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{ color: '#ef4444' }}
                title="Confirmar exclusão"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--color-fg-muted)' }}
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={user.role === "admin"}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--color-fg-muted)' }}
              title={user.role === "admin" ? "Não é possível excluir admins" : "Excluir usuário"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <EditUserPanel
          user={user}
          onClose={onEditEnd}
          onUpdated={onUserUpdated}
        />
      )}

      {expanded && user.applications.length > 0 && (
        <div
          className="px-6 pb-4 space-y-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-medium pt-3 pb-1" style={{ color: 'var(--color-fg-muted)' }}>
            Aplicações
          </p>
          {user.applications.map((app) => (
            <AdminAppRow
              key={app.id}
              app={app}
              onUpdated={(updates) => onAppUpdated(app.id, updates)}
              onDeleted={() => onAppDeleted(app.id)}
            />
          ))}
        </div>
      )}

      {expanded && user.applications.length === 0 && (
        <div
          className="px-6 pb-4 pt-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Nenhuma aplicação criada.</p>
        </div>
      )}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    const updates: { newPassword?: string; newEmail?: string } = {};
    if (newPassword) updates.newPassword = newPassword;
    if (newEmail !== user.email) updates.newEmail = newEmail;

    if (!updates.newPassword && !updates.newEmail) {
      onClose();
      return;
    }

    setLoading(true);
    const result = await adminUpdateUser(user.id, updates);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Usuário atualizado com sucesso.");
      if (updates.newEmail) onUpdated({ email: updates.newEmail });
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div
      className="mx-6 mb-4 rounded-xl p-4 space-y-3"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>Editar usuário</p>
        <button onClick={onClose} style={{ color: 'var(--color-fg-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>E-mail</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-fg)',
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>Nova senha (deixe vazio para manter)</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="w-full rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-fg)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      {success && <p className="text-xs" style={{ color: 'var(--color-success)' }}>{success}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'transparent' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  );
}

interface AdminAppRowProps {
  app: Application;
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

  const typeColor = app.type === "lavinmq"
    ? { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' }
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

  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-bg-secondary)' }}
      >
        <Server className="w-3.5 h-3.5 text-orange-400" />
      </div>

      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
              className="flex-1 rounded-lg px-2 py-1 text-sm focus:outline-none"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-primary)',
                color: 'var(--color-fg)',
              }}
              autoFocus
            />
            <button onClick={handleRename} disabled={savingRename} style={{ color: 'var(--color-success)' }}>
              {savingRename ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setRenaming(false); setNewName(app.name); }} style={{ color: 'var(--color-fg-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-fg)' }}>{app.name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ color: typeColor.color, background: typeColor.bg, border: `1px solid ${typeColor.border}` }}
            >
              {app.type === "lavinmq" ? "LavinMQ" : "RabbitMQ"}
            </span>
          </div>
        )}
        {renameError && <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{renameError}</p>}
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
          {new Date(app.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {app.panel_url && (
          <a
            href={app.panel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Abrir painel"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => setRenaming(true)}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-fg-muted)' }}
          title="Renomear"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { handleDelete(); setConfirmDelete(false); }}
              disabled={deleting}
              className="p-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{ color: '#ef4444' }}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ color: 'var(--color-fg-muted)' }} className="p-1.5 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Deletar aplicação"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
