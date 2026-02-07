-- =====================================================
-- VERIFICACIÓN COMPLETA DE MIGRACIÓN
-- =====================================================

-- 1. ESTADÍSTICAS GENERALES
SELECT '============ ESTADÍSTICAS GENERALES ============' as seccion;

SELECT 
  COUNT(*) as total_usuarios_activos,
  COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL) as usuarios_con_organization,
  COUNT(*) FILTER (WHERE p.role = 'admin') as usuarios_con_role_admin,
  COUNT(*) FILTER (WHERE p.organization_id IS NULL) as usuarios_SIN_organization,
  ROUND((COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL)::numeric / COUNT(*)::numeric * 100), 2) as porcentaje_migrado
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL;

-- 2. VERIFICAR TU CUENTA ESPECÍFICA
SELECT '============ TU CUENTA (hcobos99@gmail.com) ============' as seccion;

SELECT 
  u.email,
  u.id,
  p.organization_id IS NOT NULL as tiene_organization,
  p.role,
  o.nombre_negocio,
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id) as tiene_user_role,
  p.activo,
  (SELECT COUNT(*) FROM clientes c WHERE c.user_id = u.id) as num_clientes,
  (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = u.id) as num_prestamos
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE u.email = 'hcobos99@gmail.com';

-- 3. VERIFICAR ORGANIZATIONS CREADAS
SELECT '============ ORGANIZATIONS ============' as seccion;

SELECT 
  COUNT(*) as total_organizations,
  COUNT(DISTINCT owner_id) as owners_unicos
FROM organizations;

-- 4. VERIFICAR USER_ROLES
SELECT '============ USER_ROLES ============' as seccion;

SELECT 
  COUNT(*) as total_user_roles,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'cobrador') as cobradores
FROM user_roles;

-- 5. VERIFICAR SI HAY USUARIOS PROBLEMÁTICOS
SELECT '============ USUARIOS SIN MIGRAR (si hay) ============' as seccion;

SELECT 
  u.email,
  u.id,
  p.organization_id,
  p.role,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL
  AND (p.organization_id IS NULL OR p.role IS NULL)
LIMIT 10;

-- 6. VERIFICAR INTEGRIDAD DE DATOS
SELECT '============ INTEGRIDAD DE DATOS ============' as seccion;

SELECT 
  'Profiles sin auth.user' as problema,
  COUNT(*) as cantidad
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
UNION ALL
SELECT 
  'Organizations sin owner en profiles' as problema,
  COUNT(*) as cantidad
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.owner_id)
UNION ALL
SELECT 
  'User_roles sin usuario' as problema,
  COUNT(*) as cantidad
FROM user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);

-- 7. SAMPLE DE USUARIOS MIGRADOS
SELECT '============ SAMPLE: 10 USUARIOS MIGRADOS ============' as seccion;

SELECT 
  u.email,
  p.role,
  o.nombre_negocio,
  p.activo,
  p.updated_at as fecha_migracion
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN organizations o ON o.id = p.organization_id
WHERE p.organization_id IS NOT NULL
ORDER BY p.updated_at DESC
LIMIT 10;

-- 8. RESULTADO FINAL
SELECT '============ RESULTADO FINAL ============' as seccion;

SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE p.organization_id IS NULL) = 0 
    THEN '✅ MIGRACIÓN COMPLETA - TODOS LOS USUARIOS MIGRADOS'
    ELSE '⚠️ AÚN HAY ' || COUNT(*) FILTER (WHERE p.organization_id IS NULL) || ' USUARIOS SIN MIGRAR'
  END as estado_migracion
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL;
