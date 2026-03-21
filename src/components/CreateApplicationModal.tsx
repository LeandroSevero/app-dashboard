import { useState } from "react";
import { X, Server, Zap, Loader2, Plus, Clock } from "lucide-react";

interface CreateApplicationModalProps {
  onClose: () => void;
  onCreate: (name: string, type: string) => Promise<{ error?: string; next_allowed_at?: string }>;
}

export default function CreateApplicationModal({ onClose, onCreate }: CreateApplicationModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"rabbitmq" | "lavinmq">("rabbitmq");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAllowed, setNextAllowed] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setNextAllowed(null);
    setLoading(true);

    const result = await onCreate(name.trim(), type);

    if (result.error) {
      setError(result.error);
      if (result.next_allowed_at) {
        setNextAllowed(result.next_allowed_at);
      }
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
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-semibold text-base">Nova Aplicação</h2>
            <p className="text-slate-500 text-xs mt-0.5">Crie uma nova instância de mensageria</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome da aplicação
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: minha-api-producao"
              required
              maxLength={50}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
              />
              <TypeOption
                value="lavinmq"
                selected={type === "lavinmq"}
                onSelect={() => setType("lavinmq")}
                icon={<Zap className="w-5 h-5 text-cyan-400" />}
                label="LavinMQ"
                description="Alta performance"
                color="cyan"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 space-y-1">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              {nextAllowed && (
                <div className="flex items-center gap-1.5 text-xs text-red-400/70">
                  <Clock className="w-3 h-3" />
                  <span>Disponível em: {formatNextAllowed(nextAllowed)}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-slate-500 text-xs">
              Limite: <span className="text-slate-400">1 criação a cada 24 horas</span> por conta.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
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
}

function TypeOption({ selected, onSelect, icon, label, description, color }: TypeOptionProps) {
  const borderColor = selected
    ? color === "orange"
      ? "border-orange-500/40 bg-orange-500/5"
      : "border-cyan-500/40 bg-cyan-500/5"
    : "border-slate-700 bg-slate-800/50 hover:border-slate-600";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-3.5 rounded-xl border text-left transition-all duration-150 ${borderColor}`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-slate-200 text-sm font-medium">{label}</p>
      <p className="text-slate-500 text-xs mt-0.5">{description}</p>
    </button>
  );
}
