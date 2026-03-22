/*
  # Tabela de logs de eventos (app_events)

  ## O que faz
  - Cria a tabela `app_events` para registrar eventos importantes do sistema
  - Registra criação, exclusão, atualização, rotação de senha e erros de aplicações
  - Cada evento pertence a um usuário e opcionalmente a uma aplicação

  ## Nova tabela
  - `app_events`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK auth.users) - usuário que gerou o evento
    - `application_id` (uuid, nullable) - aplicação relacionada (pode ser null para erros gerais)
    - `event_type` (text) - tipo do evento: create | delete | update | rotate_password | error
    - `meta` (jsonb, nullable) - dados extras do evento (nome, tipo, etc)
    - `created_at` (timestamptz)

  ## Segurança
  - RLS habilitado
  - Usuários só podem ler seus próprios logs
  - Apenas o sistema (service_role) pode inserir via edge functions
*/

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('create', 'delete', 'update', 'rotate_password', 'error')),
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_events_user_id_idx ON public.app_events (user_id);
CREATE INDEX IF NOT EXISTS app_events_application_id_idx ON public.app_events (application_id);
CREATE INDEX IF NOT EXISTS app_events_created_at_idx ON public.app_events (created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON public.app_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.app_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert events"
  ON public.app_events FOR INSERT
  TO service_role
  WITH CHECK (true);
