-- =====================================================
-- PROBAR SOLUCIÓN ALTERNATIVA ANTES DE APLICAR
-- =====================================================

-- Test 1: Verificar que la lógica de JOIN funciona
SELECT '============ TEST 1: Lógica de JOIN ============' as test;

SELECT 
  c.id,
  c.nombre,
  c.user_id,
  -- Propietario directo
  (auth.uid() = c.user_id) as "propietario",
  -- Admin de org (lógica con JOIN)
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = c.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  ) as "admin_org",
  -- Resultado final
  (
    auth.uid() = c.user_id
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p_user, profiles p_auth
      WHERE p_user.id = c.user_id
        AND p_auth.id = auth.uid()
        AND p_auth.role = 'admin'
        AND p_auth.activo = true
        AND p_user.organization_id = p_auth.organization_id
        AND p_user.organization_id IS NOT NULL
    )
  ) as "acceso_final"
FROM clientes c
WHERE c.user_id = auth.uid()
LIMIT 5;

-- Test 2: Contar cuántos clientes tendría acceso
SELECT '============ TEST 2: Conteo de acceso ============' as test;

SELECT 
  COUNT(*) as total_clientes_con_acceso
FROM clientes c
WHERE (
  auth.uid() = c.user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = c.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- Test 3: Verificar profiles JOIN
SELECT '============ TEST 3: Test de JOIN profiles ============' as test;

SELECT 
  p_user.id as user_id,
  p_user.organization_id as user_org,
  p_auth.id as auth_id,
  p_auth.organization_id as auth_org,
  p_auth.role as auth_role,
  p_user.organization_id = p_auth.organization_id as "orgs_match"
FROM profiles p_user, profiles p_auth
WHERE p_user.id = auth.uid()
  AND p_auth.id = auth.uid()
LIMIT 1;

-- Test 4: Verificar préstamos
SELECT '============ TEST 4: Acceso a préstamos ============' as test;

SELECT 
  COUNT(*) as total_prestamos_con_acceso
FROM prestamos p
WHERE (
  auth.uid() = p.user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = p.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- Test 5: RESULTADO FINAL
SELECT '============ RESULTADO FINAL ============' as test;

WITH test_clientes AS (
  SELECT COUNT(*) as cant
  FROM clientes c
  WHERE c.user_id = auth.uid()
    AND (
      auth.uid() = c.user_id
      OR
      EXISTS (
        SELECT 1 
        FROM profiles p_user, profiles p_auth
        WHERE p_user.id = c.user_id
          AND p_auth.id = auth.uid()
          AND p_auth.role = 'admin'
          AND p_auth.activo = true
          AND p_user.organization_id = p_auth.organization_id
          AND p_user.organization_id IS NOT NULL
      )
    )
),
test_prestamos AS (
  SELECT COUNT(*) as cant
  FROM prestamos p
  WHERE p.user_id = auth.uid()
    AND (
      auth.uid() = p.user_id
      OR
      EXISTS (
        SELECT 1 
        FROM profiles p_user, profiles p_auth
        WHERE p_user.id = p.user_id
          AND p_auth.id = auth.uid()
          AND p_auth.role = 'admin'
          AND p_auth.activo = true
          AND p_user.organization_id = p_auth.organization_id
          AND p_user.organization_id IS NOT NULL
      )
    )
)
SELECT 
  tc.cant as clientes_con_acceso,
  tp.cant as prestamos_con_acceso,
  CASE 
    WHEN tc.cant > 0 AND tp.cant > 0 
    THEN '✅ LA SOLUCIÓN ALTERNATIVA FUNCIONA - PUEDES APLICARLA'
    ELSE '❌ HAY UN PROBLEMA - NO APLICAR AÚN'
  END as resultado
FROM test_clientes tc, test_prestamos tp;
