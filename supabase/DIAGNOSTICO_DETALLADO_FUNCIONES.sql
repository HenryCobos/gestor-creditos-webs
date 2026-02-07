-- =====================================================
-- DIAGNÓSTICO DETALLADO: ¿Por qué fallan las funciones?
-- =====================================================

-- Test 1: Verificar auth.uid()
SELECT '============ TEST 1: auth.uid() ============' as test;

SELECT 
  auth.uid() as "auth_uid",
  auth.uid() IS NOT NULL as "auth_uid_existe";

-- Test 2: Verificar tu perfil
SELECT '============ TEST 2: Tu perfil ============' as test;

SELECT 
  id,
  email,
  (SELECT organization_id FROM profiles WHERE id = auth.uid()) as "organization_id",
  (SELECT role FROM profiles WHERE id = auth.uid()) as "role",
  (SELECT activo FROM profiles WHERE id = auth.uid()) as "activo"
FROM auth.users
WHERE id = auth.uid();

-- Test 3: Test de función simple sin SECURITY DEFINER
SELECT '============ TEST 3: Función sin SECURITY DEFINER ============' as test;

CREATE OR REPLACE FUNCTION public.test_get_my_org()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

SELECT test_get_my_org() as "mi_org_desde_funcion";

-- Test 4: Test de función con SECURITY DEFINER
SELECT '============ TEST 4: Función con SECURITY DEFINER ============' as test;

CREATE OR REPLACE FUNCTION public.test_get_my_org_secure()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

SELECT test_get_my_org_secure() as "mi_org_desde_funcion_secure";

-- Test 5: Comparación directa
SELECT '============ TEST 5: Comparación directa ============' as test;

SELECT 
  (SELECT organization_id FROM profiles WHERE id = auth.uid()) as "consulta_directa",
  test_get_my_org() as "funcion_normal",
  test_get_my_org_secure() as "funcion_secure";

-- Test 6: Función booleana simple
SELECT '============ TEST 6: Función booleana ============' as test;

CREATE OR REPLACE FUNCTION public.test_soy_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE;

SELECT test_soy_admin() as "soy_admin";

-- Test 7: Función booleana con parámetro
SELECT '============ TEST 7: Función con parámetro ============' as test;

CREATE OR REPLACE FUNCTION public.test_es_mi_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND organization_id = org_id
  );
$$ LANGUAGE sql STABLE;

SELECT 
  test_es_mi_org(
    (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ) as "es_mi_org";

-- Test 8: Verificar que los datos están OK
SELECT '============ TEST 8: Datos en profiles ============' as test;

SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as con_org,
  COUNT(*) FILTER (WHERE role IS NOT NULL) as con_role,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL AND role = 'admin') as admins
FROM profiles;

-- Test 9: Tu perfil específico
SELECT '============ TEST 9: Tu perfil completo ============' as test;

SELECT 
  p.*
FROM profiles p
WHERE p.id = auth.uid();

-- Limpiar funciones de prueba
DROP FUNCTION IF EXISTS public.test_get_my_org();
DROP FUNCTION IF EXISTS public.test_get_my_org_secure();
DROP FUNCTION IF EXISTS public.test_soy_admin();
DROP FUNCTION IF EXISTS public.test_es_mi_org(UUID);

SELECT '✅ Diagnóstico completado' as resultado;
