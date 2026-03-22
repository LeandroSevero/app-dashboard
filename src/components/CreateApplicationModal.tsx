import { useState } from "react";
import { X, Server, Zap, Loader2, Plus, Clock } from "lucide-react";

interface CreateApplicationModalProps {
  onClose: () => void;
  onCreate: (name: string, type: string) => Promise<{ error?: string; next_allowed_at?: string }>;
}

type AppType = "rabbitmq" | "lavinmq";

interface TypeLimit {
  blocked: boolean;
  next_allowed_at: string | null;
}

export default function CreateApplicationModal({ onClose, onCreate }: CreateApplicationModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AppType>("rabbitmq");
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState<Record<AppType, TypeLimit>>({
    rabbitmq: { blocked: false, next_allowed_at: null },
    lavinmq: { blocked: false, next_allowed_at: null },
  });

  const currentLimit = limits[type];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || currentLimit.blocked) return;
    setLoading(true);

    const result = await onCreate(name.trim(), type);

    if (result.error) {
      setLimits((prev) => ({
        ...prev,
        [type]: {
          blocked: !!result.next_allowed_at,
          next_allowed_at: result.next_allowed_at ?? null,
        },
      }));
    }

    setLoading(false);
  }

  function formatNextAllowed(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl animate-in"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--color-fg)' }}>Nova Aplicação</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>Crie uma nova instância de mensageria</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-fg)' }}>
              Nome da aplicação
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: minha-api-producao"
              required
              maxLength={50}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-fg)' }}>
              Tipo de instância
            </label>
            <div className="grid grid-cols-2 gap-3">
              <TypeOption
                value="rabbitmq"
                selected={type === "rabbitmq"}
                onSelect={() => setType("rabbitmq")}
                icon={<Server className="w-5 h-5 text-orange-400" />}
                label="RabbitMQ"
                description="Mensageria clássica"
                color="orange"
                blocked={limits.rabbitmq.blocked}
              />
              <TypeOption
                value="lavinmq"
                selected={type === "lavinmq"}
                onSelect={() => setType("lavinmq")}
                icon={<Zap className="w-5 h-5 text-cyan-400" />}
                label="LavinMQ"
                description="Alta performance"
                color="cyan"
                blocked={limits.lavinmq.blocked}
              />
            </div>
          </div>

          {currentLimit.blocked && currentLimit.next_allowed_at && (
            <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                Limite de criação atingido para {type === "rabbitmq" ? "RabbitMQ" : "LavinMQ"}
              </p>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
                <Clock className="w-3 h-3" />
                <span>Disponível em: {formatNextAllowed(currentLimit.next_allowed_at)}</span>
              </div>
            </div>
          )}

          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
              Limite: <span style={{ color: 'var(--color-fg)' }}>1 criação de cada tipo a cada 24 horas</span> por conta.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)', background: 'transparent' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || currentLimit.blocked}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TypeOptionProps {
  value: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: "orange" | "cyan";
  blocked: boolean;
}

function TypeOption({ selected, onSelect, icon, label, description, color, blocked }: TypeOptionProps) {
  const selectedStyle = selected
    ? color === "orange"
      ? { border: '1px solid rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.05)' }
      : { border: '1px solid rgba(6,182,212,0.35)', background: 'rgba(6,182,212,0.05)' }
    : { border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="p-3.5 rounded-xl text-left transition-all duration-150 relative"
      style={selectedStyle}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{description}</p>
      {blocked && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Clock className="w-2.5 h-2.5" />
          Limite
        </div>
      )}
    </button>
  );
}
