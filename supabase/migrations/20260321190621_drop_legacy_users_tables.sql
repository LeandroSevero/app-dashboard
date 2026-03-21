/*
  # Remover tabelas legadas

  ## Descrição
  Remove as tabelas `user_limits` e `users` do schema público que foram criadas
  por uma migração anterior baseada em autenticação manual com JWT/bcrypt.
  Essas tabelas conflitam com o sistema de autenticação nativo do Supabase Auth
  e não são utilizadas pelo frontend atual.

  ## Tabelas removidas
  - `user_limits` - dependência de `public.users`, removida primeiro
  - `users` - tabela customizada com password_hash, conflita com auth.users

  ## Observações
  - A autenticação agora é feita exclusivamente via Supabase Auth (`auth.users`)
  - A tabela `applications` já referencia `auth.users` corretamente
*/

DROP TABLE IF EXISTS user_limits CASCADE;
DROP TABLE IF EXISTS users CASCADE;
