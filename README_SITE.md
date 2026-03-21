# Dashboard Leandro Severo - DevOps Panel

Painel SaaS autenticado para gerenciamento de infraestrutura e serviços DevOps.

## Visão Geral

Aplicação React + TypeScript com backend Vercel Functions e MongoDB, voltada para `app.leandrosevero.com.br`. Painel logado (dashboard) separado do site estático principal, com dark mode, sidebar modular e estrutura preparada para crescimento.

## Funcionalidades

### Autenticação
- Login com e-mail e senha via JWT (armazenado em localStorage)
- Registro automático de conta no primeiro acesso
- Proteção de rota (auth guard): apenas usuários autenticados acessam o dashboard
- Logout com botão no header

### Dashboard
- Visão geral com contagem de aplicações por tipo (RabbitMQ / LavinMQ)
- Módulos futuros exibidos com status "Em breve"

### Aplicações (CloudAMQP)
- Criação de instâncias RabbitMQ e LavinMQ via API backend
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
- **Vercel Functions** - Backend serverless (Node.js)
- **MongoDB** - Banco de dados
- **jsonwebtoken** - Autenticação JWT
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
│   └── AuthContext.tsx            # Contexto JWT (useAuth) via localStorage
├── lib/
│   ├── api.ts                     # Cliente HTTP com Authorization header
│   └── supabase.ts                # Arquivo vazio (removido Supabase)
├── types/
│   └── database.ts                # Tipos TypeScript (Application)
├── pages/
│   ├── Login.tsx                  # Tela de login / cadastro
│   └── Dashboard.tsx              # Painel principal autenticado
└── components/
    ├── Sidebar.tsx                # Navegação lateral colapsável
    ├── Header.tsx                 # Cabeçalho com usuário e logout
    ├── ApplicationCard.tsx        # Card de aplicação com credenciais
    └── CreateApplicationModal.tsx # Modal de criação de aplicação
```

### Backend (Vercel Functions)
```
api/
├── _lib/
│   ├── db.js          # Conexão MongoDB (singleton por ambiente)
│   ├── auth.js        # JWT sign/verify + CORS helpers
│   └── cloudamqp.js   # Wrapper da API CloudAMQP
├── auth/
│   └── login.js       # POST /api/auth/login
└── applications/
    ├── create.js      # POST /api/applications/create
    ├── list.js        # GET /api/applications/list
    └── [id].js        # DELETE /api/applications/:id
```

### Banco de Dados (MongoDB)
| Collection | Descrição |
|---|---|
| `users` | Usuários cadastrados |
| `applications` | Instâncias CloudAMQP |
| `user_limits` | Controle de rate limit por usuário |

#### Collection `applications`
| Campo | Tipo | Descrição |
|---|---|---|
| userId | string | ID do usuário dono |
| name | string | Nome da aplicação |
| type | string | `rabbitmq` ou `lavinmq` |
| cloudamqpId | string | ID externo no CloudAMQP |
| connection.url | string | AMQP URL de conexão |
| connection.username | string | Usuário de acesso |
| connection.password | string | Senha de acesso |
| connection.managementUrl | string | URL do painel CloudAMQP |
| createdAt | Date | Data de criação |
| deletedAt | Date\|null | Data de deleção (soft delete) |

#### Collection `user_limits`
| Campo | Tipo | Descrição |
|---|---|---|
| userId | string | ID do usuário |
| lastCreatedAt | Date | Última criação (para rate limit 24h) |

## Segurança

- Autenticação via JWT (assinado com `JWT_SECRET`)
- API keys do CloudAMQP nunca expostas no frontend
- Todas as operações de criação/deleção passam pelo backend
- Soft delete de aplicações (campo `deletedAt`)

## Regras de Negócio

- **Rate limit**: usuário pode criar no máximo 1 aplicação a cada 24 horas
- A restrição de 24h persiste mesmo após deletar a aplicação (`user_limits` não é apagado)

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

## Variáveis de Ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `app_MONGODB_URI` | Vercel (backend) | String de conexão MongoDB |
| `CLOUDAMQP_API_KEY` | Vercel (backend) | Chave da API CloudAMQP |
| `JWT_SECRET` | Vercel (backend) | Segredo para assinar tokens JWT |

> Nenhuma variável de ambiente é exposta no frontend.

## Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- MongoDB (local ou Atlas)
- Vercel CLI (`npm i -g vercel`)

### Comandos
```bash
npm install

vercel dev
```

> O `vercel dev` executa tanto o frontend (Vite) quanto as Functions localmente.

### Build de Produção
```bash
npm run build
```

## Integração CloudAMQP

Sem `CLOUDAMQP_API_KEY` configurada, o sistema retorna instâncias mock para desenvolvimento (credenciais fictícias). Com a chave configurada na Vercel, as instâncias são criadas na plataforma CloudAMQP real.

## Roadmap (Módulos Futuros)

- [ ] **Cursos** - Catálogo de cursos DevOps
- [ ] **Monitor SSL** - Monitoramento de certificados SSL
- [ ] **Vulnerabilidades** - Scan de vulnerabilidades de sites
- [ ] **Blacklist IP** - Verificação de IPs em listas negras
- [ ] **Observabilidade** - Métricas e dashboards
