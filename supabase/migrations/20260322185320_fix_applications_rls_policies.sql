/*
  # Corrigir políticas RLS da tabela applications

  ## Problema identificado
  - Existe uma policy "No direct client access to applications" com USING (false)
    que bloqueia TODOS os SELECTs, incluindo admins e usuários normais.
  - Existem policies duplicadas legadas com nomes em português que conflitam.

  ## Alterações
  1. Remove a policy bloqueante "No direct client access to applications"
  2. Remove policies duplicadas legadas (em português)
  3. Garante que as policies corretas existam para SELECT, INSERT, UPDATE, DELETE
     tanto para usuários normais (próprio registro) quanto para admins (todos)
*/

-- Remove a policy que bloqueia tudo com USING (false)
DROP POLICY IF EXISTS "No direct client access to applications" ON applications;

-- Remove policies duplicadas legadas em português
DROP POLICY IF EXISTS "Usuário visualiza apenas suas próprias aplicações" ON applications;
DROP POLICY IF EXISTS "Usuário cria apenas suas próprias aplicações" ON applications;
DROP POLICY IF EXISTS "Usuário atualiza apenas suas próprias aplicações" ON applications;
DROP POLICY IF EXISTS "Usuário deleta apenas suas próprias aplicações" ON applications;

-- Recria policies corretas garantindo idempotência

-- SELECT: usuário vê as próprias
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: admin vê todas
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
CREATE POLICY "Admins can view all applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- INSERT: usuário insere apenas as próprias
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: usuário atualiza apenas as próprias
DROP POLICY IF EXISTS "Users can update own applications" ON applications;
CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: admin atualiza qualquer uma
DROP POLICY IF EXISTS "Admins can update any application" ON applications;
CREATE POLICY "Admins can update any application"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- DELETE: usuário deleta apenas as próprias
DROP POLICY IF EXISTS "Users can delete own applications" ON applications;
CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: admin deleta qualquer uma
DROP POLICY IF EXISTS "Admins can delete any application" ON applications;
CREATE POLICY "Admins can delete any application"
  ON applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
