-- ============================================
-- DIAGNÓSTICO: ¿Qué ve mi usuario cuando consulta su perfil?
-- ============================================

-- PASO 1: Ver tu perfil completo desde la BD directamente
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,  -- ⭐ Este debe ser 'admin'
  organization_id,  -- ⭐ Este debe tener UUID
  activo,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid();

-- PASO 2: Simular la query que hace el frontend (desde layout.tsx)
SELECT 
  p.*,
  p.organization_id,
  p.role
FROM profiles p
WHERE p.id = auth.uid();

-- PASO 3: Ver si hay restricciones RLS bloqueando el campo role
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- PASO 4: Probar la query exacta de checkPermissions (desde rutas/page.tsx)
SELECT role, organization_id
FROM profiles
WHERE id = auth.uid();

-- PASO 5: Ver tu organización
SELECT 
  o.id,
  o.owner_id,
  o.nombre_negocio,
  o.descripcion
FROM organizations o
WHERE o.owner_id = auth.uid();

-- PASO 6: Ver tu user_role
SELECT 
  user_id,
  organization_id,
  role
FROM user_roles
WHERE user_id = auth.uid();

-- ✅ RESULTADO ESPERADO:
-- PASO 1 y 2: Deben mostrar role='admin' y organization_id con UUID
-- PASO 4: Debe devolver role='admin' y organization_id
-- PASO 5: Debe mostrar tu organización
-- PASO 6: Debe mostrar role='admin'
