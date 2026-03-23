# Dashboard Leandro Severo - DevOps Panel

Painel SaaS autenticado para gerenciamento de infraestrutura e serviços DevOps.

## Visão Geral

Aplicação React + TypeScript com backend Supabase (Edge Functions + PostgreSQL), voltada para `app.leandrosevero.com.br`. Painel logado separado do site estático principal, com suporte a dark/light mode, sidebar modular, painel de administração completo e integrações com CloudAMQP e MongoDB Atlas.

## Funcionalidades

### Autenticação
- Login com e-mail e senha via Supabase Auth
- Proteção de rota (auth guard): apenas usuários autenticados acessam o dashboard
- Gerenciamento de sessão com refresh automático de token
- Logout com botão no header

### Dashboard (Usuário)
- Visão geral com contagem de aplicações por tipo (RabbitMQ / LavinMQ / MongoDB)
- Listagem de aplicações com credenciais (AMQP URL, username, password, connection string)
- Criação de instâncias via modal com seleção de tipo
- Rate limit: cooldown configurável por tipo de aplicação
- Deleção de aplicações com confirmação dupla
- Modal de detalhe com todas as credenciais e estatísticas da aplicação

### Painel Admin
- **Dashboard**: estatísticas globais (usuários, aplicações, erros), gráficos de 7 dias (inclui registros excluídos nos totais e no gráfico de criações)
- **Usuários**: listagem completa com e-mail, nome, perfil, aplicações e ações (editar, deletar, resetar senha)
- **Aplicações Globais**: todas as instâncias da plataforma com filtro por tipo, filtro de status (ativas / ativas+excluídas / somente excluídas), coluna de data de criação e data de exclusão com badge visual "Excluída"
- **Recursos**: visão consolidada dos recursos de infraestrutura (MongoDB Atlas, RabbitMQ, LavinMQ)
- **Logs**: eventos recentes da plataforma com filtro por tipo

### Perfil
- Edição de nome, telefone, bio e foto de perfil
- Troca de e-mail e senha
- Upload de avatar com preview

## Tecnologias

- **React 18** + **TypeScript** - Frontend
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Supabase** - Auth, banco de dados PostgreSQL e Edge Functions (Deno)
- **Lucide React** - Ícones
- **CloudAMQP API** - Instâncias de mensageria (RabbitMQ e LavinMQ)
- **MongoDB Atlas API** - Instâncias de banco de dados

## Arquitetura

### Frontend (React)
```
src/
├── App.tsx                          # Raiz com AuthProvider, ThemeProvider e roteamento
├── index.css                        # Estilos globais + variáveis CSS de tema
├── main.tsx                         # Entry point
├── context/
│   ├── AuthContext.tsx              # Contexto de autenticação via Supabase Auth
│   └── ThemeContext.tsx             # Contexto de dark/light mode
├── lib/
│   ├── api.ts                       # Funções de acesso à API (orquestra os services)
│   └── supabase.ts                  # Cliente Supabase + getValidToken + invokeWithAuth
├── services/
│   ├── adminService.ts              # Chamadas às edge functions de admin
│   ├── applicationService.ts        # CRUD de aplicações
│   ├── logService.ts                # Registro de eventos
│   └── profileService.ts            # Leitura e atualização de perfil
├── types/
│   ├── api.ts                       # Tipos de resposta da API
│   └── database.ts                  # Tipos do banco de dados
├── pages/
│   ├── Login.tsx                    # Tela de login
│   ├── Dashboard.tsx                # Painel do usuário
│   └── AdminDashboard.tsx           # Painel administrativo
└── components/
    ├── Sidebar.tsx                  # Navegação lateral colapsável
    ├── Header.tsx                   # Cabeçalho com usuário, tema e logout
    ├── ApplicationCard.tsx          # Card de aplicação com credenciais
    ├── ApplicationDetailModal.tsx   # Modal de detalhe de aplicação
    ├── CreateApplicationModal.tsx   # Modal de criação de aplicação
    ├── ProfileIncompletePopup.tsx   # Aviso de perfil incompleto
    └── UserProfile.tsx              # Tela de edição de perfil
```

### Backend (Supabase Edge Functions)
```
supabase/functions/
├── admin-stats/           # Estatísticas globais para o painel admin
├── admin-users/           # Listagem de todos os usuários (inclui aplicações excluídas via soft delete)
├── admin-update-user/     # Atualização de dados de usuário (admin)
├── admin-update-application/  # Renomear aplicação (admin)
├── admin-logs/            # Logs de eventos da plataforma
├── app-stats/             # Estatísticas de uma aplicação específica
├── cloudamqp/             # Integração com CloudAMQP (criar/deletar instâncias)
├── create-application/    # Criação de aplicação (RabbitMQ, LavinMQ, MongoDB)
├── delete-application/    # Deleção de aplicação
└── rotate-password/       # Rotação de senha de aplicação
```

### Banco de Dados (Supabase PostgreSQL)
| Tabela | Descrição |
|---|---|
| `profiles` | Perfis dos usuários (nome, telefone, bio, avatar, role) |
| `applications` | Instâncias criadas (RabbitMQ, LavinMQ, MongoDB) |
| `user_limits` | Controle de cooldown por tipo de aplicação por usuário |
| `app_events` | Log de eventos das aplicações |

#### Tabela `applications`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador único |
| user_id | uuid | Referência ao usuário dono |
| name | string | Nome da aplicação |
| type | string | `rabbitmq`, `lavinmq` ou `mongodb` |
| amqp_url | string | URL de conexão AMQP |
| amqp_user | string | Usuário AMQP |
| amqp_password | string | Senha AMQP |
| cloudamqp_id | string | ID externo no CloudAMQP |
| panel_url | string | URL do painel CloudAMQP |
| mongo_db | string | Nome do banco MongoDB |
| mongo_user | string | Usuário MongoDB |
| mongo_password | string | Senha MongoDB |
| connection_url | string | Connection string MongoDB |
| deleted_at | timestamp | Soft delete |

## Segurança

- Autenticação via Supabase Auth (JWT gerenciado pelo Supabase)
- Row Level Security (RLS) habilitado em todas as tabelas
- Edge Functions com verificação manual de JWT e role de admin (`verifyJWT: false` nas funções admin para evitar conflito de verificação dupla)
- API keys de CloudAMQP e MongoDB Atlas nunca expostas no frontend
- Todas as operações sensíveis passam pelas Edge Functions com `SUPABASE_SERVICE_ROLE_KEY`

## Regras de Negócio

- **Rate limit**: cooldown configurável por tipo de aplicação na tabela `user_limits`
- A restrição de cooldown persiste mesmo após deletar a aplicação
- Usuários com role `admin` têm acesso ao painel administrativo completo
- Soft delete de aplicações (campo `deleted_at`)

## Ícones de Serviços

- RabbitMQ: `/public/RabbitMQ.svg`
- LavinMQ: `/public/LavinMQ.svg`
- MongoDB: `/public/mongodb.svg`

## Design

### Paleta de Cores
- Suporte completo a dark mode e light mode via variáveis CSS
- Cores de destaque por tipo: RabbitMQ (`#f97316`), LavinMQ (`#06b6d4`), MongoDB (`#22c55e`)
- Cor primária: `#3b82f6` (blue-500)

## Variáveis de Ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Chave anon pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (auto) | Chave de serviço do Supabase |
| `CLOUDAMQP_API_KEY` | Edge Functions | Chave da API CloudAMQP |
| `MONGODB_*` | Edge Functions | Credenciais da API MongoDB Atlas |

## Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- Projeto Supabase configurado

### Comandos
```bash
npm install
npm run dev
```

### Build de Produção
```bash
npm run build
```
