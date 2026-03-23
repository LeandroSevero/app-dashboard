import { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  Users,
  MessageSquare,
  Activity,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  CheckCheck,
  BarChart3,
  AlertCircle,
  Wifi,
  Timer,
  AlertTriangle,
  Database,
  Table,
  BookOpen,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileText,
  Hash,
  Layers,
} from "lucide-react";
import type { Application } from "../types/database";
import { invokeWithAuth } from "../lib/supabase";

interface AppStats {
  connections: number;
  consumers: number;
  queue_count: number;
  total_messages: number;
  max_queue_length: number;
  queues: Array<{ name: string; messages: number; consumers: number; state: string }>;
}

interface ApplicationDetailModalProps {
  app: Application;
  onClose: () => void;
}

const RABBITMQ_LIMITS = {
  connections: { max: 20, label: "Open Connections" },
  queues: { max: 150, label: "Queues" },
  messages: { max: 1_000_000, label: "Messages" },
  queue_length: { max: 10_000, label: "Queue Length" },
  idle_days: { max: 28, label: "Max Idle Queue Time", unit: "days" },
  max_queue_size: { label: "Max queue size", value: "1 GB" },
};

const LAVINMQ_LIMITS = {
  connections: { max: 40, label: "Open Connections" },
  queues: { max: 300, label: "Queues" },
  messages: { max: 2_000_000, label: "Messages" },
  queue_length: { max: 20_000, label: "Queue Length" },
  max_queue_size: { label: "Max queue size", value: "1 GB" },
};

const MONGODB_LIMITS = {
  storage: { max: 512, label: "Armazenamento", unit: "MB" },
  collections: { max: 100, label: "Collections" },
  connections: { max: 500, label: "Conexões simultâneas" },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("pt-BR");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0.00 B";
  if (bytes < 1024) return `${bytes.toFixed(2)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function LimitBar({ value, max, label, unit, displayValue, displayMax }: {
  value: number; max: number; label: string; unit?: string; displayValue?: string; displayMax?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const danger = pct >= 90;
  const warn = pct >= 70;
  const barColor = danger ? "#ef4444" : warn ? "#f59e0b" : "var(--color-primary)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
        <span className="text-xs font-mono font-semibold" style={{ color: "var(--color-fg)" }}>
          {displayValue ?? formatNumber(value)} / {displayMax ?? (unit ? `${max} ${unit}` : formatNumber(max))} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
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

function StaticLimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: "var(--color-fg)" }}>{value}</span>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
          <button onClick={copy} className="p-1 rounded" style={{ color: "var(--color-fg-muted)" }}>
            {copied ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <pre className="p-3 text-xs font-mono overflow-x-auto" style={{ background: "rgba(0,0,0,0.25)", color: "var(--color-fg)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: "var(--color-bg-secondary)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-fg)" }}>{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--color-fg-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--color-fg-muted)" }} />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function MongoGuide({ app }: { app: Application }) {
  const connStr = app.connection_url || `mongodb+srv://${app.mongo_user}:<senha>@cluster/${app.mongo_db}`;
  const collection = app.mongo_collection || app.mongo_db || "minha_collection";

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
          Use a Connection String abaixo para conectar sua aplicação ao MongoDB Atlas. A collection padrão criada é <span className="font-mono font-semibold" style={{ color: "var(--color-fg)" }}>{collection}</span>.
        </p>
      </div>

      <GuideSection title="Acesso via MongoDB Atlas">
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
          O explorador visual de dados está disponível no painel do MongoDB Atlas. Use as credenciais abaixo para acessar o Data Explorer e navegar pelas suas collections.
        </p>
        <div className="space-y-1.5 mt-1">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-fg-muted)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>1</span>
            Acesse <span className="font-mono font-medium" style={{ color: "var(--color-fg)" }}>cloud.mongodb.com</span> e faça login
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-fg-muted)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>2</span>
            Navegue até <span className="font-semibold" style={{ color: "var(--color-fg)" }}>Collections</span> no cluster
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-fg-muted)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>3</span>
            Selecione o database <span className="font-mono font-medium" style={{ color: "var(--color-fg)" }}>{app.mongo_db}</span>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Node.js / TypeScript">
        <CodeBlock label="Instalação" code="npm install mongodb" />
        <CodeBlock label="Conexão" code={`import { MongoClient } from 'mongodb';

const client = new MongoClient('${connStr}');
await client.connect();

const db = client.db('${app.mongo_db || "seu_db"}');
const collection = db.collection('${collection}');

const doc = await collection.findOne({});
console.log(doc);`} />
      </GuideSection>

      <GuideSection title="Python">
        <CodeBlock label="Instalação" code="pip install pymongo" />
        <CodeBlock label="Conexão" code={`from pymongo import MongoClient

client = MongoClient('${connStr}')
db = client['${app.mongo_db || "seu_db"}']
collection = db['${collection}']

doc = collection.find_one({})
print(doc)`} />
      </GuideSection>

      <GuideSection title="Variáveis de Ambiente">
        <CodeBlock label=".env" code={`MONGODB_URI=${connStr}
MONGODB_DB=${app.mongo_db || "seu_db"}
MONGODB_COLLECTION=${collection}`} />
      </GuideSection>
    </div>
  );
}

function RabbitMQGuide({ app }: { app: Application }) {
  const host = app.mqtt_hostname || "";
  const user = app.mqtt_username || app.username;
  const pass = app.mqtt_password || app.password;
  const amqpUrl = app.amqp_url || `amqps://${user}:<senha>@${host}/${user}`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}>
        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#f97316" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
          Use a URL AMQP para conectar via biblioteca de mensageria. Acesse o painel web para gerenciar filas, exchanges e permissões.
        </p>
      </div>

      <GuideSection title="Node.js — amqplib">
        <CodeBlock label="Instalação" code="npm install amqplib" />
        <CodeBlock label="Publicar mensagem" code={`import amqp from 'amqplib';

const conn = await amqp.connect('${amqpUrl}');
const ch = await conn.createChannel();

await ch.assertQueue('minha-fila');
ch.sendToQueue('minha-fila', Buffer.from('Olá mundo'));

await ch.close();
await conn.close();`} />
      </GuideSection>

      <GuideSection title="Python — pika">
        <CodeBlock label="Instalação" code="pip install pika" />
        <CodeBlock label="Publicar mensagem" code={`import pika

params = pika.URLParameters('${amqpUrl}')
connection = pika.BlockingConnection(params)
channel = connection.channel()

channel.queue_declare(queue='minha-fila')
channel.basic_publish(exchange='', routing_key='minha-fila', body='Olá mundo')
connection.close()`} />
      </GuideSection>

      <GuideSection title="Variáveis de Ambiente">
        <CodeBlock label=".env" code={`RABBITMQ_URL=${amqpUrl}
RABBITMQ_HOST=${host}
RABBITMQ_USER=${user}`} />
      </GuideSection>
    </div>
  );
}

function LavinMQGuide({ app }: { app: Application }) {
  const host = app.mqtt_hostname || "";
  const user = app.mqtt_username || app.username;
  const amqpUrl = app.amqp_url || `amqps://${user}:<senha>@${host}/${user}`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}>
        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#06b6d4" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
          LavinMQ é compatível com o protocolo AMQP 0-9-1. Use as mesmas bibliotecas de RabbitMQ — a URL de conexão já está configurada.
        </p>
      </div>

      <GuideSection title="Node.js — amqplib">
        <CodeBlock label="Instalação" code="npm install amqplib" />
        <CodeBlock label="Conexão" code={`import amqp from 'amqplib';

const conn = await amqp.connect('${amqpUrl}');
const ch = await conn.createChannel();

await ch.assertQueue('minha-fila', { durable: true });
ch.sendToQueue('minha-fila', Buffer.from('Mensagem'));

await ch.close();
await conn.close();`} />
      </GuideSection>

      <GuideSection title="Python — pika">
        <CodeBlock label="Instalação" code="pip install pika" />
        <CodeBlock label="Conexão" code={`import pika

params = pika.URLParameters('${amqpUrl}')
connection = pika.BlockingConnection(params)
channel = connection.channel()
channel.queue_declare(queue='minha-fila', durable=True)
channel.basic_publish(exchange='', routing_key='minha-fila', body='Mensagem')
connection.close()`} />
      </GuideSection>

      <GuideSection title="Variáveis de Ambiente">
        <CodeBlock label=".env" code={`LAVINMQ_URL=${amqpUrl}
LAVINMQ_HOST=${host}
LAVINMQ_USER=${user}`} />
      </GuideSection>
    </div>
  );
}

interface MongoCollection {
  name: string;
  count: number;
  fields: string[];
}

interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

interface CollectionDetail {
  collection: string;
  count: number;
  indexes: Array<{ name: string; key: Record<string, unknown> }>;
  documents: MongoDocument[];
}

function MongoExplorer({ app }: { app: Application }) {
  const [collections, setCollections] = useState<MongoCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [colDetail, setColDetail] = useState<CollectionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await invokeWithAuth("mongo-explorer", { appId: app.id });
    if (err || (data as Record<string, unknown>)?.error) {
      setError((data as Record<string, unknown>)?.error as string || "Erro ao carregar collections");
    } else {
      setCollections(((data as Record<string, unknown>)?.collections as MongoCollection[]) || []);
    }
    setLoading(false);
  }, [app.id]);

  const loadCollection = useCallback(async (name: string) => {
    setSelectedCol(name);
    setLoadingDetail(true);
    setColDetail(null);
    setExpandedDoc(null);
    const { data, error: err } = await invokeWithAuth("mongo-explorer", { appId: app.id, collection: name });
    if (err || (data as Record<string, unknown>)?.error) {
      setColDetail(null);
    } else {
      setColDetail(data as CollectionDetail);
    }
    setLoadingDetail(false);
  }, [app.id]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  return (
    <div className="flex h-full" style={{ minHeight: "360px" }}>
      {/* Sidebar — collection list */}
      <div className="w-52 flex-shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
            <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: "var(--color-fg)" }}>{app.mongo_db}</span>
          </div>
          <button
            onClick={loadCollections}
            disabled={loading}
            className="p-1 rounded"
            style={{ color: "var(--color-fg-muted)", outline: "none" }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--color-fg-muted)" }} />
            </div>
          ) : error ? (
            <div className="px-3 py-3">
              <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <Layers className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--color-fg-muted)" }} />
              <p className="text-xs" style={{ color: "var(--color-fg-muted)" }}>Nenhuma collection</p>
            </div>
          ) : (
            collections.map((col) => (
              <button
                key={col.name}
                onClick={() => loadCollection(col.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{
                  background: selectedCol === col.name ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
                  outline: "none",
                  borderLeft: selectedCol === col.name ? "2px solid var(--color-primary)" : "2px solid transparent",
                }}
              >
                <Table className="w-3 h-3 flex-shrink-0" style={{ color: selectedCol === col.name ? "var(--color-primary)" : "var(--color-fg-muted)" }} />
                <span className="text-xs truncate flex-1" style={{ color: selectedCol === col.name ? "var(--color-primary)" : "var(--color-fg)" }}>{col.name}</span>
                <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--color-fg-muted)" }}>{col.count}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — documents */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedCol ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
            <Terminal className="w-8 h-8 mb-3" style={{ color: "var(--color-fg-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Selecione uma collection</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-fg-muted)" }}>Clique em uma collection para explorar os documentos.</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full py-12">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--color-fg-muted)" }} />
          </div>
        ) : colDetail ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Collection header */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
              <Table className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-semibold font-mono" style={{ color: "var(--color-fg)" }}>{colDetail.collection}</span>
              <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--color-fg-muted)" }}>
                <Hash className="w-3 h-3" />
                {colDetail.count} docs
              </span>
            </div>

            {/* Indexes row */}
            {colDetail.indexes.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--color-fg-muted)" }}>Índices:</span>
                {colDetail.indexes.map((idx) => (
                  <span key={idx.name} className="text-xs font-mono px-2 py-0.5 rounded flex-shrink-0" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-fg-muted)" }}>
                    {idx.name}
                  </span>
                ))}
              </div>
            )}

            {/* Documents */}
            <div className="flex-1 overflow-y-auto">
              {colDetail.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-6 h-6 mb-2" style={{ color: "var(--color-fg-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--color-fg-muted)" }}>Nenhum documento encontrado</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {colDetail.documents.map((doc) => {
                    const isExpanded = expandedDoc === doc._id;
                    const preview = Object.entries(doc)
                      .filter(([k]) => k !== "_id")
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? "{…}" : String(v).slice(0, 24)}`)
                      .join("  ·  ");
                    return (
                      <div key={doc._id}>
                        <button
                          onClick={() => setExpandedDoc(isExpanded ? null : doc._id)}
                          className="w-full flex items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          style={{ outline: "none" }}
                        >
                          <span className="flex-shrink-0 mt-0.5">
                            {isExpanded
                              ? <ChevronUp className="w-3 h-3" style={{ color: "var(--color-fg-muted)" }} />
                              : <ChevronDown className="w-3 h-3" style={{ color: "var(--color-fg-muted)" }} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono" style={{ color: "var(--color-primary)" }}>{doc._id}</span>
                            {!isExpanded && preview && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-fg-muted)" }}>{preview}</p>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3">
                            <pre
                              className="text-xs font-mono p-3 rounded-xl overflow-x-auto leading-relaxed"
                              style={{ background: "rgba(0,0,0,0.2)", color: "var(--color-fg)", border: "1px solid var(--color-border)" }}
                            >
                              {JSON.stringify(doc, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ApplicationDetailModal({ app, onClose }: ApplicationDetailModalProps) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMqttPassword, setShowMqttPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const isMongoDB = app.type === "mongodb";
  const isLavinMQ = app.type === "lavinmq";
  const limits = isLavinMQ ? LAVINMQ_LIMITS : RABBITMQ_LIMITS;
  const typeLabel = isMongoDB ? "MongoDB" : isLavinMQ ? "LavinMQ" : "RabbitMQ";
  const typeColor = isMongoDB ? "#22c55e" : isLavinMQ ? "#06b6d4" : "#f97316";

  type Tab = "limits" | "queues" | "credentials" | "explorer" | "guide";
  const mongoTabs: Tab[] = ["limits", "explorer", "credentials", "guide"];
  const amqpTabs: Tab[] = ["limits", "queues", "credentials", "guide"];
  const tabs: Tab[] = isMongoDB ? mongoTabs : amqpTabs;
  const [activeTab, setActiveTab] = useState<Tab>(isMongoDB ? "limits" : "limits");

  const mqttHostname = app.mqtt_hostname || "";
  const mqttUsername = app.mqtt_username || app.username;
  const mqttPassword = app.mqtt_password || app.password;
  const panelUrl = mqttHostname ? `https://${mqttHostname}/#/` : app.panel_url;

  const createdDate = new Date(app.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const remaining = useCountdown(app.expires_at);
  const isExpiringSoon = remaining !== null && remaining < 30 * 60 * 1000;

  const fetchStats = useCallback(async () => {
    if (isMongoDB) return;
    setLoadingStats(true);
    setStatsError(null);
    const { data, error } = await invokeWithAuth("app-stats", { appId: app.id });
    if (error) {
      setStatsError("Erro ao buscar estatísticas");
    } else {
      const d = data as Record<string, unknown>;
      if (d?.error) setStatsError(d.error as string);
      else setStats(d?.stats as AppStats ?? null);
    }
    setLoadingStats(false);
  }, [app.id, isMongoDB]);

  useEffect(() => {
    fetchStats();
    if (!isMongoDB) {
      const interval = setInterval(fetchStats, 30_000);
      return () => clearInterval(interval);
    }
  }, [fetchStats, isMongoDB]);

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* ignore */ }
  }

  const connections = stats?.connections ?? 0;
  const queueCount = stats?.queue_count ?? 0;
  const totalMessages = stats?.total_messages ?? 0;
  const maxQueueLen = stats?.max_queue_length ?? 0;
  const consumers = stats?.consumers ?? 0;

  const tabLabels: Record<Tab, string> = {
    limits: "Limites",
    queues: "Filas",
    credentials: "Credenciais",
    explorer: "Explorador",
    guide: "Guia",
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
              {isMongoDB
                ? <img src="/mongodb.svg" alt="MongoDB" className="w-5 h-5" />
                : isLavinMQ
                ? <img src="/LavinMQ.svg" alt="LavinMQ" className="w-5 h-5" />
                : <img src="/RabbitMQ.svg" alt="RabbitMQ" className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "var(--color-fg)" }}>{app.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-fg-muted)" }}>
                <span style={{ color: typeColor }}>{typeLabel}</span> · Criado em {createdDate}
              </p>
              {remaining !== null && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-lg mt-1.5"
                  style={
                    remaining === 0
                      ? { color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }
                      : isExpiringSoon
                      ? { color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }
                      : { color: "var(--color-fg-muted)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }
                  }
                >
                  {remaining === 0 ? <AlertTriangle className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                  {remaining === 0 ? "Expirado" : `Expira em ${formatCountdown(remaining)}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {panelUrl && (
              <a
                href={panelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  color: "var(--color-primary)",
                  background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                }}
              >
                <ExternalLink className="w-3 h-3" />
                Painel
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: "var(--color-fg-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Stats Bar — hidden for MongoDB */}
        {!isMongoDB && (
          <div className="grid grid-cols-3 gap-0 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <StatPill icon={<Wifi className="w-3.5 h-3.5" />} label="Conexões" value={loadingStats && !stats ? "—" : String(connections)} color="#06b6d4" />
            <StatPill icon={<Users className="w-3.5 h-3.5" />} label="Consumidores" value={loadingStats && !stats ? "—" : String(consumers)} color="#10b981" bordered />
            <StatPill icon={<MessageSquare className="w-3.5 h-3.5" />} label="Mensagens" value={loadingStats && !stats ? "—" : formatNumber(totalMessages)} color="#f59e0b" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all relative whitespace-nowrap px-3"
              style={{
                color: activeTab === tab ? "var(--color-primary)" : "var(--color-fg-muted)",
                background: "transparent",
                minWidth: 0,
                outline: "none",
              }}
            >
              {tabLabels[tab]}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--color-primary)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 ${activeTab === "explorer" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>

          {/* ── LIMITS ── */}
          {activeTab === "limits" && !isMongoDB && (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: typeColor }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-fg)" }}>Limits — {typeLabel}</span>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ color: "var(--color-fg-muted)", border: "1px solid var(--color-border)", outline: "none" }}
                >
                  <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>

              {statsError && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                  <p className="text-xs" style={{ color: "#ef4444" }}>{statsError}</p>
                </div>
              )}

              <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                <LimitBar value={connections} max={limits.connections.max} label={limits.connections.label} />
                <LimitBar value={queueCount} max={limits.queues.max} label={limits.queues.label} />
                <LimitBar value={totalMessages} max={limits.messages.max} label={limits.messages.label} />
                <LimitBar value={maxQueueLen} max={limits.queue_length.max} label={limits.queue_length.label} />
                {"idle_days" in limits && (
                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                    <StaticLimitRow label={(limits as typeof RABBITMQ_LIMITS).idle_days.label} value={`${(limits as typeof RABBITMQ_LIMITS).idle_days.max} ${(limits as typeof RABBITMQ_LIMITS).idle_days.unit}`} />
                  </div>
                )}
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                  <StaticLimitRow label={limits.max_queue_size.label} value={limits.max_queue_size.value} />
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: "#10b981" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Consumidores ativos</span>
                </div>
                <span className="text-lg font-bold font-mono" style={{ color: "#10b981" }}>{loadingStats && !stats ? "—" : consumers}</span>
              </div>

              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Queued messages</span>
                </div>
                <span className="text-lg font-bold font-mono" style={{ color: "#f59e0b" }}>{loadingStats && !stats ? "—" : formatNumber(totalMessages)}</span>
              </div>
            </div>
          )}

          {activeTab === "limits" && isMongoDB && (
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: typeColor }} />
                <span className="text-sm font-semibold" style={{ color: "var(--color-fg)" }}>Limites — MongoDB</span>
              </div>

              <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                <LimitBar
                  value={0}
                  max={MONGODB_LIMITS.storage.max}
                  label={MONGODB_LIMITS.storage.label}
                  displayValue={formatBytes(0)}
                  displayMax="512.00 MB"
                />
                <LimitBar value={1} max={MONGODB_LIMITS.collections.max} label={MONGODB_LIMITS.collections.label} />
                <LimitBar value={0} max={MONGODB_LIMITS.connections.max} label={MONGODB_LIMITS.connections.label} />
              </div>

              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: "#22c55e" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Database</span>
                </div>
                <span className="text-sm font-mono font-semibold" style={{ color: "#22c55e" }}>{app.mongo_db || "—"}</span>
              </div>

              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4" style={{ color: "#22c55e" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Collection padrão</span>
                </div>
                <span className="text-sm font-mono font-semibold" style={{ color: "#22c55e" }}>{app.mongo_collection || app.mongo_db || "—"}</span>
              </div>
            </div>
          )}

          {/* ── EXPLORER (MongoDB only) ── */}
          {activeTab === "explorer" && isMongoDB && (
            <MongoExplorer app={app} />
          )}

          {/* ── QUEUES (AMQP only) ── */}
          {activeTab === "queues" && !isMongoDB && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "var(--color-fg)" }}>Filas ({stats?.queues?.length ?? 0})</span>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ color: "var(--color-fg-muted)", border: "1px solid var(--color-border)", outline: "none" }}
                >
                  <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>

              {statsError && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                  <p className="text-xs" style={{ color: "#ef4444" }}>{statsError}</p>
                </div>
              )}

              {loadingStats && !stats ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--color-fg-muted)" }} />
                </div>
              ) : !stats?.queues?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-8 h-8 mb-3" style={{ color: "var(--color-fg-muted)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--color-fg)" }}>Nenhuma fila encontrada</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-fg-muted)" }}>As filas aparecem quando a aplicação está em uso.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.queues.map((q) => (
                    <div key={q.name} className="rounded-xl px-4 py-3" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono font-medium truncate mr-2" style={{ color: "var(--color-fg)" }}>{q.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: q.state === "running" ? "#10b981" : "#f59e0b",
                            background: q.state === "running" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          }}
                        >{q.state}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-fg-muted)" }}>Mensagens</p>
                          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-fg)" }}>{formatNumber(q.messages)}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-fg-muted)" }}>Consumidores</p>
                          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-fg)" }}>{q.consumers}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CREDENTIALS ── */}
          {activeTab === "credentials" && isMongoDB && (
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-fg-muted)" }}>Conexão</p>
              <div className="space-y-2">
                <PassRow label="Connection String" value={app.connection_url || ""} field="connurl" show={showPassword} onToggle={() => setShowPassword(!showPassword)} copiedField={copiedField} onCopy={copyToClipboard} />
                <CredRow label="Database" value={app.mongo_db || ""} field="mongodb" copiedField={copiedField} onCopy={copyToClipboard} />
                {app.mongo_collection && (
                  <CredRow label="Collection" value={app.mongo_collection} field="mongocoll" copiedField={copiedField} onCopy={copyToClipboard} />
                )}
                <CredRow label="Usuário" value={app.mongo_user || ""} field="mongouser" copiedField={copiedField} onCopy={copyToClipboard} />
                <PassRow label="Senha" value={app.mongo_password || ""} field="mongopass" show={showMqttPassword} onToggle={() => setShowMqttPassword(!showMqttPassword)} copiedField={copiedField} onCopy={copyToClipboard} />
              </div>
            </div>
          )}

          {activeTab === "credentials" && !isMongoDB && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-fg-muted)" }}>Painel Web</p>
                <div className="space-y-2">
                  <CredRow label="Hostname" value={mqttHostname} field="host" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CredRow label="Portas" value={`${app.mqtt_port ?? 1883} (${app.mqtt_port_tls ?? 8883} TLS)`} field="ports" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CredRow label="Usuário" value={mqttUsername} field="mqttuser" copiedField={copiedField} onCopy={copyToClipboard} />
                  <PassRow label="Senha" value={mqttPassword} field="mqttpass" show={showMqttPassword} onToggle={() => setShowMqttPassword(!showMqttPassword)} copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-fg-muted)" }}>Aplicação (AMQP)</p>
                <div className="space-y-2">
                  <CredRow label="URL" value={app.amqp_url} field="url" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CredRow label="Usuário" value={app.username} field="user" copiedField={copiedField} onCopy={copyToClipboard} />
                  <PassRow label="Senha" value={app.password} field="pass" show={showPassword} onToggle={() => setShowPassword(!showPassword)} copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
              </div>
            </div>
          )}

          {/* ── GUIDE ── */}
          {activeTab === "guide" && (
            <div className="p-5">
              {isMongoDB && <MongoGuide app={app} />}
              {isLavinMQ && <LavinMQGuide app={app} />}
              {!isMongoDB && !isLavinMQ && <RabbitMQGuide app={app} />}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color, bordered }: { icon: React.ReactNode; label: string; value: string; color: string; bordered?: boolean }) {
  return (
    <div className="flex flex-col items-center py-3 gap-1" style={bordered ? { borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" } : {}}>
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
      </div>
      <span className="text-xl font-bold font-mono" style={{ color: "var(--color-fg)" }}>{value}</span>
    </div>
  );
}

function CredRow({ label, value, field, copiedField, onCopy }: { label: string; value: string; field: string; copiedField: string | null; onCopy: (v: string, f: string) => void }) {
  return (
    <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
      <span className="text-xs w-20 flex-shrink-0 font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
      <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--color-fg)" }}>{value}</span>
      <button onClick={() => onCopy(value, field)} className="p-1 rounded-lg" style={{ color: "var(--color-fg-muted)", outline: "none" }}>
        {copiedField === field ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function PassRow({ label, value, field, show, onToggle, copiedField, onCopy }: { label: string; value: string; field: string; show: boolean; onToggle: () => void; copiedField: string | null; onCopy: (v: string, f: string) => void }) {
  return (
    <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
      <span className="text-xs w-20 flex-shrink-0 font-medium" style={{ color: "var(--color-fg-muted)" }}>{label}</span>
      <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--color-fg)" }}>
        {show ? value : "•".repeat(Math.min(value?.length ?? 0, 24))}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={onToggle} className="p-1 rounded-lg" style={{ color: "var(--color-fg-muted)", outline: "none" }}>
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onCopy(value, field)} className="p-1 rounded-lg" style={{ color: "var(--color-fg-muted)", outline: "none" }}>
          {copiedField === field ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
