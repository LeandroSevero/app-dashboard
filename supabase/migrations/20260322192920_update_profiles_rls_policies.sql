/*
  # Atualizar políticas RLS da tabela profiles

  ## O que faz
  - Remove as políticas SELECT antigas de profiles
  - Recria com lógica correta:
    - Usuários comuns: visualizam apenas o próprio perfil via auth.uid()
    - Admins: visualizam todos os perfis via JWT role claim
*/

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
