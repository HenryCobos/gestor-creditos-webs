-- =====================================================
-- DIAGNÓSTICO: ¿Por qué las funciones RPC no funcionan?
-- =====================================================

-- 1. Verificar si las funciones existen
SELECT '============ 1. FUNCIONES EXISTENTES ============' as seccion;

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE 'get_%_segun_rol'
    OR routine_name LIKE 'puede_acceder_%'
  )
ORDER BY routine_name;

-- 2. Probar get_clientes_segun_rol()
SELECT '============ 2. TEST: get_clientes_segun_rol() ============' as seccion;

SELECT * FROM get_clientes_segun_rol() LIMIT 3;

-- 3. Probar get_prestamos_segun_rol()
SELECT '============ 3. TEST: get_prestamos_segun_rol() ============' as seccion;

SELECT * FROM get_prestamos_segun_rol() LIMIT 3;

-- 4. Verificar tu perfil
SELECT '============ 4. TU PERFIL ============' as seccion;

SELECT 
  u.email,
  p.id,
  p.organization_id,
  p.role,
  p.activo
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'hcobos99@gmail.com';

-- 5. Contar tus datos reales
SELECT '============ 5. CONTEO DATOS REALES ============' as seccion;

SELECT 
  (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as mis_clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = auth.uid()) as mis_prestamos,
  auth.uid() as mi_user_id;

-- 6. Test manual de la lógica de la función
SELECT '============ 6. TEST LÓGICA MANUAL ============' as seccion;

-- Simular lo que hace get_prestamos_segun_rol()
WITH mi_perfil AS (
  SELECT role, organization_id
  FROM profiles
  WHERE id = auth.uid()
)
SELECT 
  'Por role directo:' as metodo,
  COUNT(*) as cantidad
FROM prestamos pr
WHERE pr.user_id = auth.uid()
UNION ALL
SELECT 
  'Por organization (admin):' as metodo,
  COUNT(*) as cantidad
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
JOIN mi_perfil mp ON mp.organization_id = p.organization_id
WHERE mp.role = 'admin';
