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
  const typeColor = app.type === "lavinmq"
    ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    : "text-orange-400 bg-orange-500/10 border-orange-500/20";

  const createdDate = new Date(app.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
            {app.type === "lavinmq" ? (
              <Zap className="w-4.5 h-4.5 text-cyan-400" />
            ) : (
              <Server className="w-4.5 h-4.5 text-orange-400" />
            )}
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-sm leading-tight">{app.name}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{createdDate}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${typeColor}`}>
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
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-slate-500 text-xs w-16 flex-shrink-0">Senha</span>
          <span className="text-slate-300 text-xs font-mono flex-1 truncate">
            {showPassword ? app.password : "•".repeat(Math.min(app.password.length, 20))}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => copyToClipboard(app.password, "password")}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              title="Copiar senha"
            >
              {copiedField === "password" ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
        {app.panel_url && (
          <a
            href={app.panel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir painel
          </a>
        )}
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Confirmar?</span>
            <button
              onClick={() => onDelete(app.id)}
              disabled={deleting}
              className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
            >
              {deleting ? "..." : "Sim"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-medium text-slate-400 hover:text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg transition-all"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-2.5 py-1.5 rounded-lg transition-all"
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
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 flex items-center gap-2">
      <span className="text-slate-500 text-xs w-16 flex-shrink-0">{label}</span>
      <span className="text-slate-300 text-xs font-mono flex-1 truncate">{value}</span>
      <button
        onClick={() => onCopy(value, field)}
        className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        title={`Copiar ${label}`}
      >
        {copiedField === field ? (
          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
