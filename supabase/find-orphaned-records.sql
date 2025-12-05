-- Script para encontrar registros huérfanos y discrepancias entre tablas

-- 1. Usuarios en auth.users que NO tienen profile en public.profiles
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as registered_at,
  'Missing profile' as issue
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. Registros en email_campaigns que NO tienen profile
SELECT 
  e.user_id,
  e.email,
  e.created_at,
  'Email campaign without profile' as issue
FROM public.email_campaigns e
LEFT JOIN public.profiles p ON e.user_id = p.id
WHERE p.id IS NULL;

-- 3. Buscar el email específico de la compra reciente
-- (reemplaza 'cobosx4@gmail.com' con el email correcto)
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'cobosx4@gmail.com'

UNION ALL

SELECT 
  'profiles' as table_name,
  id,
  email,
  created_at
FROM public.profiles
WHERE email = 'cobosx4@gmail.com'

UNION ALL

SELECT 
  'email_campaigns' as table_name,
  user_id as id,
  email,
  created_at
FROM public.email_campaigns
WHERE email = 'cobosx4@gmail.com';

