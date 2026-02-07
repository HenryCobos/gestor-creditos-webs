-- =====================================================
-- PROBAR FUNCIONES RLS ANTES DE APLICARLAS
-- =====================================================
-- Este script prueba las funciones helper sin afectar
-- las políticas RLS actuales
-- =====================================================

-- Crear funciones temporalmente para probar
CREATE OR REPLACE FUNCTION public.es_admin_de_org_test(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = org_id
      AND p.role = 'admin'
      AND p.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_organization_test(user_id_param UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = user_id_param;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- PRUEBA 1: Verificar que las funciones funcionan
-- =====================================================
SELECT '============ PRUEBA 1: Funciones Helper ============' as test;

SELECT 
  auth.uid() as "mi_user_id",
  get_user_organization_test(auth.uid()) as "mi_org_id",
  es_admin_de_org_test(get_user_organization_test(auth.uid())) as "soy_admin_de_mi_org";

-- =====================================================
-- PRUEBA 2: Test con tus clientes
-- =====================================================
SELECT '============ PRUEBA 2: Test con tus clientes ============' as test;

SELECT 
  c.id,
  c.nombre,
  c.user_id,
  -- Condición simple: propietario
  (auth.uid() = c.user_id) as "condicion_propietario",
  -- Condición con función: admin de org
  es_admin_de_org_test(get_user_organization_test(c.user_id)) as "condicion_admin_org_con_funcion",
  -- Resultado final
  (
    auth.uid() = c.user_id
    OR
    es_admin_de_org_test(get_user_organization_test(c.user_id))
  ) as "acceso_final"
FROM clientes c
WHERE c.user_id = auth.uid()
LIMIT 5;

-- =====================================================
-- PRUEBA 3: Verificar performance
-- =====================================================
SELECT '============ PRUEBA 3: Performance ============' as test;

EXPLAIN ANALYZE
SELECT COUNT(*)
FROM clientes c
WHERE (
  auth.uid() = c.user_id
  OR
  es_admin_de_org_test(get_user_organization_test(c.user_id))
);

-- =====================================================
-- RESULTADO
-- =====================================================
SELECT '============ RESULTADO ============' as test;

SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE acceso = true) > 0 
    THEN '✅ LAS FUNCIONES FUNCIONAN - PUEDES APLICAR EL SCRIPT DEFINITIVO'
    ELSE '❌ HAY UN PROBLEMA - NO APLICAR AÚN'
  END as resultado
FROM (
  SELECT 
    (
      auth.uid() = c.user_id
      OR
      es_admin_de_org_test(get_user_organization_test(c.user_id))
    ) as acceso
  FROM clientes c
  WHERE c.user_id = auth.uid()
  LIMIT 1
) sub;

-- Limpiar funciones de prueba
DROP FUNCTION IF EXISTS public.es_admin_de_org_test(UUID);
DROP FUNCTION IF EXISTS public.get_user_organization_test(UUID);
