-- ============================================
-- MIGRACIÓN MASIVA: Convertir todos los usuarios en administradores
-- ============================================
-- Este script procesa TODOS los usuarios existentes de una sola vez

-- PASO 1: Ver cuántos usuarios necesitan migración
SELECT 
  COUNT(*) as total_usuarios_sin_migrar,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as sin_role,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as sin_organizacion
FROM profiles;

-- PASO 2: Crear organizaciones para TODOS los usuarios que no tienen
INSERT INTO organizations (id, owner_id, nombre_negocio, descripcion)
SELECT 
  gen_random_uuid(),
  p.id,
  COALESCE(p.full_name, p.nombre_completo, p.email, 'Usuario') || ' - Organización',
  'Organización creada automáticamente en migración'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_id = p.id
)
AND p.id IS NOT NULL;

-- PASO 3: Actualizar TODOS los perfiles a admin con su organization_id
UPDATE profiles p
SET 
  role = COALESCE(p.role, 'admin'),  -- Si ya tiene role, lo mantiene; si no, admin
  organization_id = o.id,
  activo = COALESCE(p.activo, true),
  updated_at = NOW()
FROM organizations o
WHERE o.owner_id = p.id
  AND (p.role IS NULL OR p.organization_id IS NULL);

-- PASO 4: Crear registros en user_roles para todos
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  p.id,
  p.organization_id,
  COALESCE(p.role, 'admin')
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET role = EXCLUDED.role;

-- PASO 5: VERIFICACIÓN - Ver cuántos usuarios se migraron
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'cobrador' THEN 1 END) as cobradores,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as con_organizacion,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as sin_role,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as sin_organizacion
FROM profiles;

-- PASO 6: Ver algunos usuarios migrados (primeros 10)
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  o.nombre_negocio as organizacion,
  ur.role as role_en_user_roles
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- PASO 7: Verificar que NO quedaron usuarios sin migrar
SELECT 
  id,
  email,
  role,
  organization_id
FROM profiles
WHERE role IS NULL OR organization_id IS NULL;
-- ⚠️ Esta query debe devolver 0 filas

-- ✅ RESULTADO ESPERADO:
-- - Todos los usuarios deben tener role = 'admin'
-- - Todos los usuarios deben tener organization_id
-- - Se crearon organizaciones para todos
-- - Se crearon registros en user_roles para todos
