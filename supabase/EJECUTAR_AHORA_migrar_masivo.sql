-- =====================================================
-- MIGRACIÓN MASIVA - SIN LOOPS (MÁS RÁPIDO)
-- Migra TODOS los +200 usuarios en segundos
-- =====================================================

-- PASO 1: Crear organizaciones para TODOS los usuarios (INSERT MASIVO)
INSERT INTO organizations (owner_id, nombre_negocio, descripcion, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(p.full_name, u.email, 'Mi Negocio') AS nombre_negocio,
  'Organización creada automáticamente durante migración' AS descripcion,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.owner_id = u.id)
ON CONFLICT (owner_id) DO NOTHING;

-- PASO 2: Actualizar TODOS los profiles con organization_id y role (UPDATE MASIVO)
UPDATE profiles p
SET 
  organization_id = o.id,
  role = 'admin',
  activo = COALESCE(p.activo, true),
  updated_at = NOW()
FROM organizations o
WHERE o.owner_id = p.id
  AND p.organization_id IS NULL;

-- PASO 3: Crear user_roles para TODOS (INSERT MASIVO)
INSERT INTO user_roles (user_id, organization_id, role, created_at, updated_at)
SELECT 
  p.id,
  p.organization_id,
  'admin',
  NOW(),
  NOW()
FROM profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.organization_id = p.organization_id
  )
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'admin', updated_at = NOW();

-- =====================================================
-- VERIFICACIÓN COMPLETA
-- =====================================================

-- Ver estadísticas finales
SELECT 
  'TOTAL USUARIOS' as metrica,
  COUNT(*) as cantidad
FROM auth.users 
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'USUARIOS CON ORGANIZACIÓN' as metrica,
  COUNT(*) as cantidad
FROM profiles 
WHERE organization_id IS NOT NULL

UNION ALL

SELECT 
  'USUARIOS CON ROL ADMIN' as metrica,
  COUNT(*) as cantidad
FROM profiles 
WHERE role = 'admin'

UNION ALL

SELECT 
  'ORGANIZACIONES CREADAS' as metrica,
  COUNT(*) as cantidad
FROM organizations

UNION ALL

SELECT 
  'USER_ROLES CREADOS' as metrica,
  COUNT(*) as cantidad
FROM user_roles

UNION ALL

SELECT 
  'USUARIOS SIN MIGRAR' as metrica,
  COUNT(*) as cantidad
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL AND p.organization_id IS NULL;

-- =====================================================
-- VERIFICAR TU USUARIO ESPECÍFICO
-- =====================================================

SELECT 
  '========================================' as separador,
  'VERIFICACIÓN DE TU USUARIO' as titulo;

SELECT 
  u.email,
  p.organization_id IS NOT NULL as tiene_organizacion,
  p.role as rol,
  o.nombre_negocio,
  ur.role as rol_en_user_roles,
  CASE 
    WHEN p.organization_id IS NOT NULL AND p.role = 'admin' AND ur.role = 'admin' 
    THEN '✅ LISTO PARA USAR'
    ELSE '❌ NECESITA MIGRACIÓN'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hcobos99@gmail.com';

-- =====================================================
-- VER ÚLTIMOS 20 USUARIOS MIGRADOS
-- =====================================================

SELECT 
  '========================================' as separador,
  'ÚLTIMOS 20 USUARIOS MIGRADOS' as titulo;

SELECT 
  u.email,
  p.role,
  o.nombre_negocio,
  p.created_at
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN organizations o ON o.id = p.organization_id
WHERE u.deleted_at IS NULL
  AND p.organization_id IS NOT NULL
ORDER BY p.updated_at DESC
LIMIT 20;
