/*
  # Backfill profiles para usuários sem profile

  ## O que faz
  - Insere um profile padrão (role = 'user') para todos os usuários em auth.users
    que ainda não têm um registro na tabela profiles.
  - Necessário para usuários criados antes do trigger on_auth_user_created ser instalado.
  - Usa ON CONFLICT DO NOTHING para ser seguro se executado mais de uma vez.
*/

INSERT INTO public.profiles (id, name, role, created_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
