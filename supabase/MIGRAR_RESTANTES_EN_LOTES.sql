-- =====================================================
-- MIGRACIÓN EN LOTES - TODOS LOS USUARIOS RESTANTES
-- Ejecutar MÚLTIPLES VECES hasta que usuarios_sin_migrar = 0
-- =====================================================

-- Ver estado ANTES de migrar
SELECT 
  COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL) as ya_migrados,
  COUNT(*) FILTER (WHERE p.organization_id IS NULL) as pendientes_migrar,
  COUNT(*) as total_usuarios
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL;

-- =====================================================
-- MIGRACIÓN EN BATCH DE 50 USUARIOS
-- =====================================================

-- PASO 1: Crear organizations para siguiente lote (50 usuarios)
WITH usuarios_sin_org AS (
  SELECT u.id, u.email, p.full_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL
    AND (p.organization_id IS NULL OR p.id IS NULL)
  LIMIT 50
)
INSERT INTO organizations (owner_id, nombre_negocio, descripcion)
SELECT 
  id,
  COALESCE(full_name, email, 'Mi Negocio'),
  'Migración batch automática'
FROM usuarios_sin_org
ON CONFLICT (owner_id) DO NOTHING;

-- PASO 2: Actualizar profiles del lote
WITH usuarios_migrar AS (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL
    AND p.organization_id IS NULL
  LIMIT 50
)
UPDATE profiles p
SET 
  organization_id = o.id,
  role = 'admin',
  activo = COALESCE(p.activo, true),
  updated_at = NOW()
FROM organizations o, usuarios_migrar um
WHERE o.owner_id = p.id
  AND p.id = um.id;

-- PASO 3: Crear user_roles del lote
WITH usuarios_migrar AS (
  SELECT p.id, p.organization_id
  FROM profiles p
  WHERE p.organization_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id
    )
  LIMIT 50
)
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  id,
  organization_id,
  'admin'
FROM usuarios_migrar
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'admin';

-- =====================================================
-- VER PROGRESO DESPUÉS DE ESTE BATCH
-- =====================================================

SELECT 
  COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL AND p.role = 'admin') as migrados_ok,
  COUNT(*) FILTER (WHERE p.organization_id IS NULL OR p.role IS NULL) as aun_pendientes,
  COUNT(*) as total_usuarios,
  ROUND(
    (COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL)::numeric / COUNT(*)::numeric * 100), 
    2
  ) as porcentaje_completado
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL;

-- =====================================================
-- INSTRUCCIONES
-- =====================================================

SELECT 
  '========================================' as info,
  'SI "aun_pendientes" > 0, ejecuta este script DE NUEVO' as instruccion,
  'Repite hasta que "aun_pendientes" = 0' as nota,
  '========================================' as fin;

-- Ver algunos usuarios del lote recién migrado
SELECT 
  u.email,
  p.role,
  p.organization_id IS NOT NULL as migrado,
  p.updated_at
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.organization_id IS NOT NULL
ORDER BY p.updated_at DESC
LIMIT 10;
