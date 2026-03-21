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
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateApplication,
  adminDeleteApplication,
  adminRotatePassword,
} from "../lib/api";
import type { AdminUser, Application } from "../types/database";

type AdminTab = "admin-users" | "admin-apps";

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminTab>("admin-users");
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
  const allApps: (Application & { userEmail: string; userId: string })[] = users.flatMap((u) =>
    u.applications.map((a) => ({ ...a, userEmail: u.email, userId: u.id }))
  );

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

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(s) => setActiveSection(s as AdminTab)}
        collapsed={sidebarCollapsed}
        isAdmin
      />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <main className={`${sidebarWidth} pt-14 transition-all duration-300 min-h-screen`}>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <AdminBanner />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
              label="Usuários ativos"
              value={users.length}
            />
            <StatCard
              icon={<Package className="w-5 h-5 text-orange-400" />}
              label="Aplicações totais"
              value={totalApps}
            />
            <StatCard
              icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
              label="Admins"
              value={users.filter((u) => u.role === "admin").length}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Carregando dados...</p>
              </div>
            </div>
          ) : (
            <>
              {activeSection === "admin-users" && (
                <UsersTab
                  users={users}
                  onRefresh={fetchUsers}
                  onUserUpdated={handleUserUpdated}
                  onUserDeleted={handleUserDeleted}
                />
              )}
              {activeSection === "admin-apps" && (
                <ApplicationsTab
                  apps={allApps}
                  onRefresh={fetchUsers}
                  onAppUpdated={handleAppUpdated}
                  onAppDeleted={handleAppDeleted}
                />
              )}
            </>
          )}
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

interface UsersTabProps {
  users: AdminUser[];
  onRefresh: () => void;
  onUserUpdated: (userId: string, updates: Partial<AdminUser>) => void;
  onUserDeleted: (userId: string) => void;
}

function UsersTab({ users, onRefresh, onUserUpdated, onUserDeleted }: UsersTabProps) {
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuário..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-48"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg)',
              }}
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)' }}>
          {filtered.map((user, idx) => (
            <div
              key={user.id}
              style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}
            >
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

function UserProfileRow({
  user,
  editing,
  onEditStart,
  onEditEnd,
  deleting,
  onDelete,
  onUserUpdated,
}: UserProfileRowProps) {
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
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
              {user.full_name || <span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>Sem nome</span>}
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
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{user.email}</p>
          {user.phone && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{user.phone}</p>
          )}
        </div>

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
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--color-fg-muted)' }}
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
    <div
      className="mx-6 mb-4 rounded-xl p-4 space-y-3"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>Editar usuário</p>
        </div>
        <button onClick={onClose} style={{ color: 'var(--color-fg-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
            <Mail className="w-3 h-3" /> E-mail
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
            <User className="w-3 h-3" /> Nome completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
            <Phone className="w-3 h-3" /> Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
            <Camera className="w-3 h-3" /> URL da foto
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
          <FileText className="w-3 h-3" /> Sobre
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
          <KeyRound className="w-3 h-3" /> Nova senha (deixe vazio para manter)
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="w-full rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
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

interface AppWithOwner extends Application {
  userEmail: string;
  userId: string;
}

interface ApplicationsTabProps {
  apps: AppWithOwner[];
  onRefresh: () => void;
  onAppUpdated: (appId: string, updates: Partial<Application>) => void;
  onAppDeleted: (appId: string) => void;
}

function ApplicationsTab({ apps, onRefresh, onAppUpdated, onAppDeleted }: ApplicationsTabProps) {
  const [userFilter, setUserFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");

  const filtered = apps.filter((a) => {
    const matchUser = a.userEmail.toLowerCase().includes(userFilter.toLowerCase());
    const matchApp = a.name.toLowerCase().includes(appFilter.toLowerCase());
    return matchUser && matchApp;
  });

  const uniqueUsers = Array.from(new Set(apps.map((a) => a.userEmail))).sort();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div
        className="px-6 py-4 space-y-3"
        style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
              Aplicações ({filtered.length})
            </h2>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-36">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
            <input
              type="text"
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              placeholder="Buscar por app..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
            />
          </div>
          <div className="relative flex-1 min-w-36">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-fg-muted)' }} />
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filtrar por usuário..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
            />
          </div>
          {(userFilter || appFilter) && (
            <button
              onClick={() => { setUserFilter(""); setAppFilter(""); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}
            >
              Limpar
            </button>
          )}
        </div>

        {uniqueUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uniqueUsers.map((email) => (
              <button
                key={email}
                onClick={() => setUserFilter(userFilter === email ? "" : email)}
                className="text-xs px-2 py-1 rounded-lg transition-all"
                style={
                  userFilter === email
                    ? {
                        background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                        color: 'var(--color-primary)',
                        border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                      }
                    : {
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-fg-muted)',
                        border: '1px solid var(--color-border)',
                      }
                }
              >
                {email}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12" style={{ background: 'var(--color-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Nenhuma aplicação encontrada.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)' }}>
          {filtered.map((app, idx) => (
            <div
              key={app.id}
              style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}
            >
              <AdminAppRow
                app={app}
                onUpdated={(updates) => onAppUpdated(app.id, updates)}
                onDeleted={() => onAppDeleted(app.id)}
              />
            </div>
          ))}
        </div>
      )}
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
        onUpdated({
          password: result.new_password,
          amqp_url: result.new_url || app.amqp_url,
          mqtt_password: result.new_password,
        });
      }
      setTimeout(() => setRotateResult(null), 6000);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <Server className="w-4 h-4 text-orange-400" />
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
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-primary)', color: 'var(--color-fg)' }}
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>{app.name}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ color: typeColor.color, background: typeColor.bg, border: `1px solid ${typeColor.border}` }}
              >
                {app.type === "lavinmq" ? "LavinMQ" : "RabbitMQ"}
              </span>
            </div>
          )}
          {renameError && <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{renameError}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
              {new Date(app.created_at).toLocaleDateString("pt-BR")}
            </p>
            <span className="text-xs" style={{ color: 'var(--color-border)' }}>·</span>
            <p className="text-xs truncate" style={{ color: 'var(--color-fg-muted)' }}>{app.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 rounded-lg transition-all text-xs font-medium"
            style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}
            title="Ver credenciais"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

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

          <button
            onClick={handleRotatePassword}
            disabled={rotating}
            className="p-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{ color: 'var(--color-fg-muted)' }}
            title="Rotacionar senha"
          >
            {rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
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
        <div
          className="mx-6 mb-4 rounded-xl p-4 space-y-3"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-fg-muted)' }}>Credenciais</p>
          <CredRow label="Usuário" value={app.username} />
          <CredRow label="Senha" value={app.password} secret />
          <CredRow label="AMQP URL" value={app.amqp_url} secret />
          {app.mqtt_hostname && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--color-fg-muted)' }}>MQTT</p>
              <CredRow label="Hostname" value={app.mqtt_hostname} />
              <CredRow label="Porta" value={`${app.mqtt_port || 1883} / ${app.mqtt_port_tls || 8883} (TLS)`} />
              <CredRow label="Usuário MQTT" value={app.mqtt_username || ""} />
              <CredRow label="Senha MQTT" value={app.mqtt_password || app.password} secret />
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
      <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
      <span
        className="flex-1 text-xs font-mono truncate"
        style={{ color: 'var(--color-fg)' }}
      >
        {secret && !show ? "••••••••••" : value || "—"}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {secret && (
          <button
            onClick={() => setShow(!show)}
            className="p-1 rounded"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1 rounded"
          style={{ color: copied ? 'var(--color-success)' : 'var(--color-fg-muted)' }}
        >
          <Check className={`w-3 h-3 ${copied ? '' : 'opacity-0'}`} />
          {!copied && <Package className="w-3 h-3" style={{ display: copied ? 'none' : 'block' }} />}
        </button>
      </div>
    </div>
  );
}
