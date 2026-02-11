-- =========================================================
-- FIX: Corregir función get_limites_organizacion()
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- Problema: Ambigüedad en nombres de variables/columnas
-- Solución: Usar alias de tabla claros y prefijos "v_" en variables
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 CORRIGIENDO FUNCIÓN get_limites_organizacion()' as " ";
SELECT '========================================' as " ";

-- Eliminar función existente
DROP FUNCTION IF EXISTS public.get_limites_organizacion() CASCADE;

-- Recrear función corregida
CREATE FUNCTION public.get_limites_organizacion()
RETURNS TABLE (
  organization_id UUID,
  plan_nombre TEXT,
  plan_slug TEXT,
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  clientes_usados BIGINT,
  prestamos_usados BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  porcentaje_clientes NUMERIC,
  porcentaje_prestamos NUMERIC,
  puede_crear_cliente BOOLEAN,
  puede_crear_prestamo BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
  v_clientes_count BIGINT;
  v_prestamos_count BIGINT;
BEGIN
  -- Obtener organización del usuario actual (usando alias "prof" para evitar ambigüedad)
  SELECT prof.organization_id INTO v_org_id
  FROM profiles prof
  WHERE prof.id = auth.uid();
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin organización';
  END IF;
  
  -- Contar clientes de toda la organización
  SELECT COUNT(*) INTO v_clientes_count
  FROM clientes c
  JOIN profiles p ON p.id = c.user_id
  WHERE p.organization_id = v_org_id;
  
  -- Contar préstamos de toda la organización
  SELECT COUNT(*) INTO v_prestamos_count
  FROM prestamos pr
  JOIN profiles p ON p.id = pr.user_id
  WHERE p.organization_id = v_org_id;
  
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    pl.nombre as plan_nombre,
    pl.slug as plan_slug,
    pl.limite_clientes,
    pl.limite_prestamos,
    
    v_clientes_count as clientes_usados,
    v_prestamos_count as prestamos_usados,
    
    -- Calcular disponibles
    (pl.limite_clientes - v_clientes_count) as clientes_disponibles,
    (pl.limite_prestamos - v_prestamos_count) as prestamos_disponibles,
    
    -- Porcentajes
    CASE 
      WHEN pl.limite_clientes > 0 THEN
        ROUND((v_clientes_count::NUMERIC / pl.limite_clientes) * 100, 2)
      ELSE 0
    END as porcentaje_clientes,
    
    CASE 
      WHEN pl.limite_prestamos > 0 THEN
        ROUND((v_prestamos_count::NUMERIC / pl.limite_prestamos) * 100, 2)
      ELSE 0
    END as porcentaje_prestamos,
    
    -- Permisos de creación
    (v_clientes_count < pl.limite_clientes) as puede_crear_cliente,
    (v_prestamos_count < pl.limite_prestamos) as puede_crear_prestamo
    
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  WHERE o.id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

SELECT '✓ Función get_limites_organizacion() corregida' as " ";

-- =========================================================
-- VERIFICACIÓN
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 PROBANDO FUNCIÓN' as " ";
SELECT '========================================' as " ";

-- Probar función (debería funcionar ahora)
SELECT 
  organization_id,
  plan_nombre,
  plan_slug,
  limite_clientes,
  limite_prestamos,
  clientes_usados,
  prestamos_usados,
  clientes_disponibles,
  prestamos_disponibles,
  porcentaje_clientes,
  porcentaje_prestamos,
  puede_crear_cliente,
  puede_crear_prestamo
FROM get_limites_organizacion();

SELECT '========================================' as " ";
SELECT '✅ FUNCIÓN CORREGIDA Y FUNCIONANDO' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 RESULTADO ESPERADO:' as " ";
SELECT 'Debes ver tu plan (Plan Profesional) con límites 50/50' as " ";
SELECT 'y el conteo real de tus clientes y préstamos' as " ";
SELECT '========================================' as " ";
