-- =====================================================
-- FORZAR MIGRACIÓN COMPLETA - TODOS LOS USUARIOS
-- Este script NO tiene condiciones restrictivas
-- Migra absolutamente TODOS los usuarios sin excepción
-- =====================================================

-- =====================================================
-- IMPORTANTE: Ejecutar línea por línea para ver progreso
-- =====================================================

-- PASO 1: Ver cuántos usuarios hay en total
SELECT 
  COUNT(*) as total_usuarios_auth,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as usuarios_activos
FROM auth.users;

-- PASO 2: Ver cuántos ya tienen organización
SELECT 
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as con_organizacion,
  COUNT(*) FILTER (WHERE organization_id IS NULL) as sin_organizacion,
  COUNT(*) as total_profiles
FROM profiles;

-- =====================================================
-- MIGRACIÓN FORZADA - PASO POR PASO
-- =====================================================

-- PASO 3: Crear organizations para TODOS los usuarios (sin filtros restrictivos)
INSERT INTO organizations (owner_id, nombre_negocio, descripcion, created_at, updated_at)
SELECT DISTINCT
  u.id,
  COALESCE(p.full_name, p.email, u.email, 'Mi Negocio') AS nombre_negocio,
  'Migración automática - Batch completo' AS descripcion,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.owner_id = u.id)
ON CONFLICT (owner_id) DO NOTHING;

-- Verificar cuántas organizaciones se crearon
SELECT COUNT(*) as organizaciones_totales FROM organizations;

-- PASO 4: Actualizar TODOS los profiles que no tienen organization_id
UPDATE profiles p
SET 
  organization_id = o.id,
  role = 'admin',
  activo = COALESCE(p.activo, true),
  updated_at = NOW()
FROM organizations o
WHERE o.owner_id = p.id
  AND (p.organization_id IS NULL OR p.role IS NULL);

-- Verificar cuántos profiles actualizados
SELECT COUNT(*) as profiles_con_organizacion FROM profiles WHERE organization_id IS NOT NULL;

-- PASO 5: Insertar en user_roles para TODOS (sin restricciones)
INSERT INTO user_roles (user_id, organization_id, role, created_at, updated_at)
SELECT DISTINCT
  p.id,
  p.organization_id,
  'admin',
  NOW(),
  NOW()
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();

-- Verificar user_roles creados
SELECT COUNT(*) as user_roles_totales FROM user_roles;

-- =====================================================
-- VERIFICACIÓN DETALLADA
-- =====================================================

-- Ver estado general
SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as total_usuarios_auth,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM profiles WHERE organization_id IS NOT NULL) as profiles_migrados,
  (SELECT COUNT(*) FROM profiles WHERE organization_id IS NULL) as profiles_sin_migrar,
  (SELECT COUNT(*) FROM user_roles) as total_user_roles;

-- Ver usuarios SIN migrar (si hay alguno)
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.organization_id,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO TIENE PROFILE'
    WHEN p.organization_id IS NULL THEN '❌ SIN ORGANIZATION'
    WHEN p.role IS NULL THEN '❌ SIN ROL'
    ELSE '✅ OK'
  END as problema
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL
  AND (p.organization_id IS NULL OR p.role IS NULL OR p.id IS NULL)
ORDER BY u.created_at DESC
LIMIT 50;

-- Verificar TU usuario específicamente
SELECT 
  u.email,
  u.id as user_id,
  p.organization_id,
  p.role as role_profile,
  ur.role as role_user_roles,
  o.nombre_negocio,
  CASE 
    WHEN p.organization_id IS NOT NULL AND p.role = 'admin' AND ur.role = 'admin' 
    THEN '✅✅✅ PERFECTO - PUEDES ACCEDER'
    WHEN p.organization_id IS NOT NULL AND p.role = 'admin' 
    THEN '⚠️ Falta user_roles'
    WHEN p.organization_id IS NOT NULL 
    THEN '⚠️ Falta role'
    ELSE '❌ SIN ORGANIZACIÓN'
  END as estado_completo
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = p.organization_id
WHERE u.email = 'hcobos99@gmail.com';

-- Ver primeros 30 usuarios migrados (para confirmar)
SELECT 
  u.email,
  p.role,
  p.organization_id IS NOT NULL as ok
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL
  AND p.organization_id IS NOT NULL
ORDER BY p.updated_at DESC
LIMIT 30;
