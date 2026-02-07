-- =====================================================
-- DIAGNÓSTICO: ¿Por qué fallan las políticas RLS?
-- =====================================================

-- 1. Verificar tu perfil
SELECT '============ TU PERFIL ============' as seccion;

SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.organization_id,
  p.role,
  p.activo,
  o.id as org_id,
  o.nombre_negocio
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE u.email = 'hcobos99@gmail.com';

-- 2. Verificar tus clientes
SELECT '============ TUS CLIENTES ============' as seccion;

SELECT 
  c.id,
  c.user_id,
  c.nombre,
  c.user_id = auth.uid() as "user_id_match",
  auth.uid() as "auth_uid_actual"
FROM clientes c
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')
LIMIT 5;

-- 3. Verificar organization_id en perfiles relacionados
SELECT '============ COMPARACIÓN USER_ID vs ORGANIZATION ============' as seccion;

SELECT 
  c.id as cliente_id,
  c.user_id as cliente_user_id,
  p_cliente.organization_id as cliente_org_id,
  p_yo.id as mi_user_id,
  p_yo.organization_id as mi_org_id,
  p_cliente.organization_id = p_yo.organization_id as "orgs_match"
FROM clientes c
JOIN profiles p_cliente ON p_cliente.id = c.user_id
CROSS JOIN profiles p_yo
WHERE p_yo.id = (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')
  AND c.user_id = p_yo.id
LIMIT 5;

-- 4. Test de subconsulta problemática
SELECT '============ TEST SUBCONSULTA ============' as seccion;

SELECT 
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id 
        FROM profiles 
        WHERE id = (SELECT user_id FROM clientes LIMIT 1)
      )
  ) as "subconsulta_funciona";

-- 5. Verificar si profiles tiene filas duplicadas
SELECT '============ PROFILES DUPLICADOS ============' as seccion;

SELECT 
  id,
  COUNT(*) as cantidad
FROM profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- 6. Verificar NULL en organization_id
SELECT '============ ORGANIZATION_ID NULL ============' as seccion;

SELECT 
  COUNT(*) as usuarios_sin_org
FROM profiles
WHERE organization_id IS NULL;

-- 7. Test directo de política
SELECT '============ TEST POLÍTICA DIRECTA ============' as seccion;

WITH mi_user AS (
  SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com'
)
SELECT 
  c.id,
  c.nombre,
  -- Condición 1: Propietario directo
  (c.user_id = (SELECT id FROM mi_user)) as "condicion_propietario",
  -- Condición 2: Admin de org
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = (SELECT id FROM mi_user)
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = c.user_id
      )
  ) as "condicion_admin_org",
  -- Condición 3: Cobrador de ruta
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN rutas r ON r.cobrador_id = p.id
    JOIN ruta_clientes rc ON rc.ruta_id = r.id
    WHERE p.id = (SELECT id FROM mi_user)
      AND p.role = 'cobrador'
      AND rc.cliente_id = c.id
  ) as "condicion_cobrador_ruta"
FROM clientes c
WHERE c.user_id = (SELECT id FROM mi_user)
LIMIT 5;
