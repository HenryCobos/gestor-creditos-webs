-- ============================================
-- DIAGNÓSTICO COMPLETO: Creación de usuarios
-- ============================================

-- 1. Ver TU usuario actual
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE id = auth.uid();

-- 2. Ver TODOS los usuarios de tu organización (lo que debería ver el admin)
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
ORDER BY created_at DESC;

-- 3. Ver usuarios en auth.users (para verificar si se crearon)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver políticas RLS activas en profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. Verificar si hay usuarios sin organization_id
SELECT 
  id,
  email,
  organization_id,
  role
FROM profiles
WHERE organization_id IS NULL;

-- 6. Probar la query exacta que usa loadUsuarios()
SELECT *
FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
ORDER BY created_at DESC;

-- 7. Ver si hay registros en user_roles
SELECT 
  user_id,
  organization_id,
  role,
  created_at
FROM user_roles
ORDER BY created_at DESC
LIMIT 10;
