import { useState, useEffect } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Timer,
  AlertTriangle,
} from "lucide-react";
import type { Application } from "../types/database";

interface ApplicationCardProps {
  app: Application;
  onDelete: (id: string) => void;
  deleting: boolean;
  onViewDetails: (app: Application) => void;
}

function useCountdown(expiresAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function ApplicationCard({ app, onDelete, deleting, onViewDetails }: ApplicationCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showMqttPassword, setShowMqttPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMqtt, setShowMqtt] = useState(false);
  const remaining = useCountdown(app.expires_at);
  const isExpiringSoon = remaining !== null && remaining < 30 * 60 * 1000;

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const typeLabel = app.type === "lavinmq" ? "LavinMQ" : app.type === "mongodb" ? "MongoDB" : "RabbitMQ";
  const typeBadgeStyle = app.type === "lavinmq"
    ? { color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }
    : app.type === "mongodb"
    ? { color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
    : { color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' };

  const createdDate = new Date(app.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const mqttUsername = app.mqtt_username || `${app.username}:${app.username}`;
  const mqttPassword = app.mqtt_password || app.password;
  const mqttHostname = app.mqtt_hostname || "";
  const panelUrl = mqttHostname ? `https://${mqttHostname}/#/` : app.panel_url;

  return (
    <div
      className="rounded-2xl transition-all duration-200"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              {app.type === "lavinmq" ? (
                <img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />
              ) : app.type === "mongodb" ? (
                <img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />
              ) : (
                <img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-fg)' }}>{app.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{createdDate}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={typeBadgeStyle}>
              {typeLabel}
            </span>
            {remaining !== null && (
              <span
                className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-lg"
                style={
                  remaining === 0
                    ? { color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }
                    : isExpiringSoon
                    ? { color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }
                    : { color: "var(--color-fg-muted)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {remaining === 0 ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Timer className="w-3 h-3" />
                )}
                {remaining === 0 ? "Expirado" : formatCountdown(remaining)}
              </span>
            )}
          </div>
        </div>

        {app.type === "mongodb" ? (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-fg-muted)' }}>Conexão</p>
            <div className="space-y-2">
              <PasswordRow
                label="Connection"
                value={app.connection_url || ""}
                field="connection_url"
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <CredentialRow label="Database" value={app.mongo_db || ""} field="mongo_db" copiedField={copiedField} onCopy={copyToClipboard} />
              <CredentialRow label="Usuário" value={app.mongo_user || ""} field="mongo_user" copiedField={copiedField} onCopy={copyToClipboard} />
              <PasswordRow
                label="Senha"
                value={app.mongo_password || ""}
                field="mongo_password"
                show={showMqttPassword}
                onToggleShow={() => setShowMqttPassword(!showMqttPassword)}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-fg-muted)' }}>Conexão do Painel Web</p>
              <div className="space-y-2">
                <CredentialRow label="Hostname" value={mqttHostname} field="mqtt_host" copiedField={copiedField} onCopy={copyToClipboard} />
                <CredentialRow
                  label="Portas"
                  value={`${app.mqtt_port ?? 1883} (${app.mqtt_port_tls ?? 8883} TLS)`}
                  field="mqtt_ports"
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
                <CredentialRow label="Usuário" value={mqttUsername} field="mqtt_user" copiedField={copiedField} onCopy={copyToClipboard} />
                <PasswordRow
                  label="Senha"
                  value={mqttPassword}
                  field="mqtt_pass"
                  show={showMqttPassword}
                  onToggleShow={() => setShowMqttPassword(!showMqttPassword)}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              </div>
            </div>

            <button
              onClick={() => setShowMqtt(!showMqtt)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
              style={{
                background: showMqtt ? 'var(--color-bg-secondary)' : 'transparent',
                color: 'var(--color-fg-muted)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span>Conexão da Aplicação</span>
              {showMqtt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMqtt && (
              <div className="mt-2 space-y-2">
                <CredentialRow label="URL" value={app.amqp_url} field="url" copiedField={copiedField} onCopy={copyToClipboard} />
                <CredentialRow label="Usuário" value={app.username} field="username" copiedField={copiedField} onCopy={copyToClipboard} />
                <PasswordRow
                  label="Senha"
                  value={app.password}
                  field="password"
                  show={showPassword}
                  onToggleShow={() => setShowPassword(!showPassword)}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => onViewDetails(app)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
          style={{
            color: 'var(--color-fg-muted)',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <BarChart3 className="w-3 h-3" />
          Ver detalhes
        </button>
        {panelUrl && (
          <a
            href={panelUrl}
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
      <span className="text-xs w-20 flex-shrink-0 font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
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

interface PasswordRowProps {
  label: string;
  value: string;
  field: string;
  show: boolean;
  onToggleShow: () => void;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function PasswordRow({ label, value, field, show, onToggleShow, copiedField, onCopy }: PasswordRowProps) {
  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs w-20 flex-shrink-0 font-medium" style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
      <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--color-fg)' }}>
        {show ? value : "•".repeat(Math.min(value.length, 24))}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onToggleShow} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--color-fg-muted)' }}>
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onCopy(value, field)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--color-fg-muted)' }}>
          {copiedField === field ? (
            <CheckCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
