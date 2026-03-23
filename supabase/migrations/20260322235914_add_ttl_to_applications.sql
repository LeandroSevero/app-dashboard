/*
  # Adicionar TTL (Time to Live) às aplicações

  ## Descrição
  Adiciona suporte a expiração automática de aplicações com base em um tempo de vida (TTL)
  configurado no momento da criação.

  ## Alterações

  ### Tabela: applications
  - Nova coluna `expires_at` (timestamptz, nullable): data/hora em que a aplicação será
    automaticamente excluída. NULL significa que a aplicação não expira.

  ## Notas
  - Aplicações existentes ficam com expires_at = NULL (sem expiração)
  - A exclusão automática será controlada pela lógica da aplicação
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE applications ADD COLUMN expires_at timestamptz DEFAULT NULL;
  END IF;
END $$;
