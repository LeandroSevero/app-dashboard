import { useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  CheckCheck,
  Server,
  Zap,
} from "lucide-react";
import type { Application } from "../types/database";

interface ApplicationCardProps {
  app: Application;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export default function ApplicationCard({ app, onDelete, deleting }: ApplicationCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const typeLabel = app.type === "lavinmq" ? "LavinMQ" : "RabbitMQ";
  const typeBadgeStyle = app.type === "lavinmq"
    ? { color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }
    : { color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' };

  const createdDate = new Date(app.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 group"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            {app.type === "lavinmq" ? (
              <Zap className="w-4.5 h-4.5 text-cyan-400" />
            ) : (
              <Server className="w-4.5 h-4.5 text-orange-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-fg)' }}>{app.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{createdDate}</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={typeBadgeStyle}>
          {typeLabel}
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        <CredentialRow
          label="AMQP URL"
          value={app.amqp_url}
          masked={false}
          field="url"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
        <CredentialRow
          label="Usuário"
          value={app.username}
          masked={false}
          field="username"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--color-fg-muted)' }}>Senha</span>
          <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--color-fg)' }}>
            {showPassword ? app.password : "•".repeat(Math.min(app.password.length, 20))}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-fg-muted)' }}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => copyToClipboard(app.password, "password")}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-fg-muted)' }}
              title="Copiar senha"
            >
              {copiedField === "password" ? (
                <CheckCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2 pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {app.panel_url && (
          <a
            href={app.panel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: 'var(--color-primary)',
              background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
            }}
          >
            <ExternalLink className="w-3 h-3" />
            Abrir painel
          </a>
        )}
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>Confirmar?</span>
            <button
              onClick={() => onDelete(app.id)}
              disabled={deleting}
              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {deleting ? "..." : "Sim"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-all"
              style={{ color: 'var(--color-fg-muted)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)', border: '1px solid transparent' }}
          >
            <Trash2 className="w-3 h-3" />
            Deletar
          </button>
        )}
      </div>
    </div>
  );
}

interface CredentialRowProps {
  label: string;
  value: string;
  masked: boolean;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function CredentialRow({ label, value, field, copiedField, onCopy }: CredentialRowProps) {
  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
      <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--color-fg)' }}>{value}</span>
      <button
        onClick={() => onCopy(value, field)}
        className="p-1 rounded-lg transition-colors flex-shrink-0"
        style={{ color: 'var(--color-fg-muted)' }}
        title={`Copiar ${label}`}
      >
        {copiedField === field ? (
          <CheckCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
