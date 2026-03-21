/*
  # Criar tabela de aplicações

  ## Descrição
  Cria a tabela principal para gerenciar instâncias CloudAMQP dos usuários no painel dashboard.

  ## Novas Tabelas

  ### applications
  - `id` (uuid, PK) - Identificador único da aplicação
  - `user_id` (uuid, FK) - Referência ao usuário dono da aplicação
  - `name` (text) - Nome da aplicação
  - `type` (text) - Tipo da instância: 'rabbitmq' ou 'lavinmq'
  - `amqp_url` (text) - URL de conexão AMQP completa
  - `username` (text) - Usuário de acesso à instância
  - `password` (text) - Senha de acesso à instância
  - `cloudamqp_id` (text) - ID externo na plataforma CloudAMQP
  - `panel_url` (text) - URL do painel de gerenciamento CloudAMQP
  - `created_at` (timestamptz) - Data de criação

  ## Segurança

  - RLS habilitado: cada usuário acessa apenas suas próprias aplicações
  - Políticas separadas para SELECT, INSERT, UPDATE e DELETE
  - Todas as operações exigem autenticação via `auth.uid()`

  ## Observações

  - A regra de limite de 1 criação a cada 24h é verificada via Edge Function
  - A senha é armazenada como texto; considerar criptografia em versão futura
*/

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'rabbitmq',
  amqp_url text DEFAULT '',
  username text DEFAULT '',
  password text DEFAULT '',
  cloudamqp_id text DEFAULT '',
  panel_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário visualiza apenas suas próprias aplicações"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário cria apenas suas próprias aplicações"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza apenas suas próprias aplicações"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta apenas suas próprias aplicações"
  ON applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS applications_user_id_idx ON applications(user_id);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications(created_at DESC);
