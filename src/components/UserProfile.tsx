import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  FileText,
  Camera,
  Loader2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react";
import { getProfile, updateProfile } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { UserProfile as UserProfileType } from "../types/database";

interface UserProfileProps {
  onProfileLoaded?: (profile: UserProfileType) => void;
}

function calcCompletion(profile: UserProfileType): number {
  const fields = [profile.email, profile.full_name, profile.phone, profile.bio];
  const filled = fields.filter((f) => f && f.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export default function UserProfile({ onProfileLoaded }: UserProfileProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    async function load() {
      const { profile } = await getProfile();
      if (profile) {
        setProfile(profile);
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setNewEmail(profile.email);
        onProfileLoaded?.(profile);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const updates: Parameters<typeof updateProfile>[0] = {
      full_name: fullName,
      phone,
      bio,
      avatar_url: avatarUrl,
    };

    if (newEmail !== profile?.email) updates.newEmail = newEmail;
    if (newPassword) updates.newPassword = newPassword;

    const result = await updateProfile(updates);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      const updated: UserProfileType = {
        id: profile!.id,
        email: result.profile?.email || newEmail,
        full_name: result.profile?.full_name || fullName,
        phone: result.profile?.phone || phone,
        bio: result.profile?.bio || bio,
        avatar_url: result.profile?.avatar_url || avatarUrl,
      };
      setProfile(updated);
      setNewPassword("");
      setShowPasswordSection(false);
      setSuccess("Perfil atualizado com sucesso!");
      onProfileLoaded?.(updated);
      setTimeout(() => setSuccess(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-fg-muted)' }} />
      </div>
    );
  }

  const completion = profile ? calcCompletion({ ...profile, full_name: fullName, phone, bio, avatar_url: avatarUrl, email: newEmail }) : 0;

  const initials = (fullName || user?.email || "?").substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-fg)' }}>Meu Perfil</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Gerencie suas informações pessoais.</p>
      </div>

      <ProfileCompletionBar completion={completion} />

      <form onSubmit={handleSave} className="space-y-5">
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 relative overflow-hidden"
              style={{
                background: avatarUrl
                  ? 'transparent'
                  : 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                border: '2px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                {fullName || user?.email}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{newEmail}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              icon={<User className="w-4 h-4" />}
              label="Nome completo"
              value={fullName}
              onChange={setFullName}
              placeholder="Seu nome completo"
              type="text"
            />
            <FormField
              icon={<Mail className="w-4 h-4" />}
              label="E-mail"
              value={newEmail}
              onChange={setNewEmail}
              placeholder="seu@email.com"
              type="email"
            />
            <FormField
              icon={<Phone className="w-4 h-4" />}
              label="Telefone"
              value={phone}
              onChange={setPhone}
              placeholder="+55 (11) 99999-9999"
              type="tel"
            />
            <FormField
              icon={<Camera className="w-4 h-4" />}
              label="URL da foto de perfil"
              value={avatarUrl}
              onChange={setAvatarUrl}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg)' }}>
              <FileText className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
              Sobre mim
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você..."
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg)',
              }}
            />
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>Alterar senha</span>
            </div>
            {showPasswordSection
              ? <X className="w-4 h-4" style={{ color: 'var(--color-fg-muted)' }} />
              : <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Clique para alterar</span>
            }
          </button>

          {showPasswordSection && (
            <div className="px-6 pb-5 pt-4" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)' }}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg)' }}>Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-fg)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-60"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}

function ProfileCompletionBar({ completion }: { completion: number }) {
  const color = completion === 100 ? '#22c55e' : completion >= 50 ? 'var(--color-primary)' : '#f97316';

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>Completude do perfil</p>
        <span className="text-sm font-bold" style={{ color }}>{completion}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${completion}%`, background: color }}
        />
      </div>
      {completion < 100 && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-fg-muted)' }}>
          {completion < 25 && "Preencha nome, telefone e descrição para completar seu perfil."}
          {completion >= 25 && completion < 75 && "Quase lá! Adicione as informações restantes."}
          {completion >= 75 && "Só falta mais um detalhe para completar seu perfil!"}
        </p>
      )}
      {completion === 100 && (
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#22c55e' }}>
          <Check className="w-3 h-3" /> Perfil completo!
        </p>
      )}
    </div>
  );
}

interface FormFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
}

function FormField({ icon, label, value, onChange, placeholder, type }: FormFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg)' }}>
        <span style={{ color: 'var(--color-fg-muted)' }}>{icon}</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-fg)',
        }}
      />
    </div>
  );
}

export { calcCompletion };
