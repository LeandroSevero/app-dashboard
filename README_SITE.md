# Dashboard Leandro Severo - DevOps Panel

Painel SaaS autenticado para gerenciamento de infraestrutura e serviços DevOps.

## Visão Geral

Aplicação React + TypeScript com Supabase, voltada para `app.leandrosevero.com.br`. Painel logado (dashboard) separado do site estático principal, com dark mode, sidebar modular e estrutura preparada para crescimento.

## Funcionalidades

### Autenticação
- Login com e-mail e senha via Supabase Auth
- Registro de conta com validação
- Proteção de rota (auth guard): apenas usuários autenticados acessam o dashboard
- Logout com botão no header

### Dashboard
- Visão geral com contagem de aplicações por tipo (RabbitMQ / LavinMQ)
- Módulos futuros exibidos com status "Em breve"

### Aplicações (CloudAMQP)
- Criação de instâncias RabbitMQ e LavinMQ via Edge Function
- Limite de 1 criação a cada 24 horas por usuário (mesmo após deletar)
- Listagem com credenciais (AMQP URL, username, password)
- Senha oculta por padrão com toggle de visibilidade
- Botão copiar para cada credencial
- Link externo para o painel CloudAMQP
- Deleção com confirmação dupla
- Estados: loading, empty state, erro de limite, sucesso

## Tecnologias

- **React 18** + **TypeScript** - Frontend
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Supabase** - Autenticação e banco de dados (PostgreSQL)
- **Supabase Edge Functions** - Backend serverless (Deno)
- **Lucide React** - Ícones
- **CloudAMQP API** - Instâncias de mensageria

## Arquitetura

### Frontend (React)
```
src/
├── App.tsx                        # Raiz com AuthProvider e roteamento
├── index.css                      # Estilos globais + scrollbar personalizada
├── main.tsx                       # Entry point
├── context/
│   └── AuthContext.tsx            # Contexto de autenticação (useAuth)
├── lib/
│   └── supabase.ts                # Client Supabase singleton
├── types/
│   └── database.ts                # Tipos TypeScript do banco de dados
├── pages/
│   ├── Login.tsx                  # Tela de login / cadastro
│   └── Dashboard.tsx              # Painel principal autenticado
└── components/
    ├── Sidebar.tsx                # Navegação lateral colapsável
    ├── Header.tsx                 # Cabeçalho com usuário e logout
    ├── ApplicationCard.tsx        # Card de aplicação com credenciais
    └── CreateApplicationModal.tsx # Modal de criação de aplicação
```

### Backend (Supabase)
- **Edge Function** `cloudamqp`: processa criação e deleção de instâncias
  - `POST /cloudamqp/create` - cria instância com rate limit de 24h
  - `DELETE /cloudamqp/delete/:id` - deleta instância

### Banco de Dados (PostgreSQL via Supabase)
| Tabela | Descrição |
|---|---|
| `applications` | Instâncias CloudAMQP dos usuários |

#### Tabela `applications`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | PK gerado automaticamente |
| user_id | uuid | FK para auth.users |
| name | text | Nome da aplicação |
| type | text | `rabbitmq` ou `lavinmq` |
| amqp_url | text | URL de conexão AMQP |
| username | text | Usuário de acesso |
| password | text | Senha de acesso |
| cloudamqp_id | text | ID externo no CloudAMQP |
| panel_url | text | URL do painel CloudAMQP |
| created_at | timestamptz | Data de criação |

## Segurança

- RLS (Row Level Security) habilitado em todas as tabelas
- Cada usuário acessa apenas seus próprios dados
- Chamadas à API CloudAMQP feitas exclusivamente via Edge Function (API key não exposta no frontend)
- Tokens JWT validados na Edge Function antes de qualquer operação

## Design

### Paleta de Cores (Dark Mode)
- Background principal: `#020617` (slate-950)
- Background secundário: `#0f172a` (slate-900)
- Cards/inputs: `#1e293b` (slate-800)
- Bordas: `#334155` (slate-700)
- Texto principal: `#f1f5f9` (slate-100)
- Texto secundário: `#94a3b8` (slate-400)
- Primária: `#3b82f6` (blue-500)
- RabbitMQ: `#f97316` (orange-500)
- LavinMQ: `#06b6d4` (cyan-500)

### Componentes Visuais
- Sidebar colapsável com indicadores de seções futuras
- Header fixo com backdrop blur
- Cards com gradientes sutis e hover states
- Modal com overlay e animação de entrada
- Spinner de carregamento consistente
- Scrollbar personalizada

## Performance

- Bundle otimizado via Vite
- Sem dependências de frameworks CSS externos
- Lazy loading implícito por componente

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `CLOUDAMQP_API_KEY` | Chave da API CloudAMQP (configurada nos secrets da Edge Function) |

## Roadmap (Módulos Futuros)

- [ ] **Cursos** - Catálogo de cursos DevOps
- [ ] **Monitor SSL** - Monitoramento de certificados SSL
- [ ] **Vulnerabilidades** - Scan de vulnerabilidades de sites
- [ ] **Blacklist IP** - Verificação de IPs em listas negras
- [ ] **Observabilidade** - Métricas e dashboards

## Como Desenvolver

### Pré-requisitos
- Node.js 18+
- Conta Supabase configurada

### Desenvolvimento
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Typecheck
```bash
npm run typecheck
```

## Integração CloudAMQP

Para ativar a integração real com o CloudAMQP, configure o secret `CLOUDAMQP_API_KEY` na Edge Function via painel do Supabase. Sem a chave, o sistema opera em modo mock (retorna credenciais fictícias para desenvolvimento).
