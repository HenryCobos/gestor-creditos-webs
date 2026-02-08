-- =====================================================
-- FIX COMPLETO: Sistema de organización (V2 - Corregido)
-- =====================================================
-- Este script corrige:
-- 1. La vista para conteo correcto de límites
-- 2. La función get_limites_organizacion() con tipos correctos
-- 3. Verifica que todo esté sincronizado

-- =====================================================
-- PARTE 1: DIAGNÓSTICO
-- =====================================================

-- Ver conteos actuales
SELECT 
  '1. CONTEO ACTUAL (Dashboard)' as info,
  COUNT(DISTINCT pr.id) as total_prestamos,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.estado = 'activo') as prestamos_activos
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Ver conteo de clientes
SELECT 
  '1b. CONTEO CLIENTES (Dashboard)' as info,
  COUNT(DISTINCT c.id) as total_clientes
FROM clientes c
JOIN profiles p ON p.id = c.user_id
WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- =====================================================
-- PARTE 2: CORRECCIÓN DE LA VISTA
-- =====================================================

DROP VIEW IF EXISTS vista_organizacion_limites CASCADE;

CREATE OR REPLACE VIEW vista_organizacion_limites AS
SELECT 
  o.id as organization_id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes as limite_clientes,
  pl.limite_prestamos as limite_prestamos,
  
  -- ⭐ Contar clientes usando subquery (preciso)
  COALESCE((
    SELECT COUNT(DISTINCT c.id)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  ), 0) as clientes_usados,
  
  -- ⭐ Contar préstamos usando subquery (preciso)
  COALESCE((
    SELECT COUNT(DISTINCT pr.id)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  ), 0) as prestamos_usados,
  
  -- Cálculo de disponibles
  (pl.limite_clientes - COALESCE((
    SELECT COUNT(DISTINCT c.id)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  ), 0)) as clientes_disponibles,
  
  (pl.limite_prestamos - COALESCE((
    SELECT COUNT(DISTINCT pr.id)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  ), 0)) as prestamos_disponibles,
  
  -- Porcentajes
  ROUND(
    (COALESCE((
      SELECT COUNT(DISTINCT c.id)
      FROM clientes c
      JOIN profiles p ON p.id = c.user_id
      WHERE p.organization_id = o.id
    ), 0)::NUMERIC / NULLIF(pl.limite_clientes, 0)) * 100, 
    2
  ) as porcentaje_clientes,
  
  ROUND(
    (COALESCE((
      SELECT COUNT(DISTINCT pr.id)
      FROM prestamos pr
      JOIN profiles p ON p.id = pr.user_id
      WHERE p.organization_id = o.id
    ), 0)::NUMERIC / NULLIF(pl.limite_prestamos, 0)) * 100, 
    2
  ) as porcentaje_prestamos
  
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id;

COMMENT ON VIEW vista_organizacion_limites IS 'Vista corregida - Usa subqueries para conteo preciso sin GROUP BY';

-- =====================================================
-- PARTE 3: RECREAR FUNCIÓN get_limites_organizacion()
-- =====================================================

-- Eliminar función existente
DROP FUNCTION IF EXISTS get_limites_organizacion() CASCADE;

-- Recrear con tipos de datos correctos
CREATE OR REPLACE FUNCTION get_limites_organizacion()
RETURNS TABLE (
  organization_id UUID,
  plan_nombre VARCHAR,  -- ⚠️ Cambiado de TEXT a VARCHAR
  plan_slug VARCHAR,    -- ⚠️ Cambiado de TEXT a VARCHAR
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
BEGIN
  RETURN QUERY
  SELECT 
    v.organization_id,
    v.plan_nombre::VARCHAR,  -- ⚠️ Cast explícito
    v.plan_slug::VARCHAR,    -- ⚠️ Cast explícito
    v.limite_clientes,
    v.limite_prestamos,
    v.clientes_usados,
    v.prestamos_usados,
    v.clientes_disponibles,
    v.prestamos_disponibles,
    v.porcentaje_clientes,
    v.porcentaje_prestamos,
    (v.clientes_usados < v.limite_clientes) as puede_crear_cliente,
    (v.prestamos_usados < v.limite_prestamos) as puede_crear_prestamo
  FROM vista_organizacion_limites v
  JOIN profiles p ON p.organization_id = v.organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_limites_organizacion() IS 'Obtiene los límites de la organización del usuario actual';

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_limites_organizacion() TO authenticated;

-- =====================================================
-- PARTE 4: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  '✅ VERIFICACIÓN DESPUÉS DEL FIX' as resultado;

-- Comparar conteo directo vs vista
SELECT 
  'Dashboard (directo)' as origen,
  COUNT(DISTINCT pr.id)::INTEGER as prestamos_totales,
  COUNT(DISTINCT c.id)::INTEGER as clientes_totales
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
LEFT JOIN clientes c ON c.user_id = p.id
WHERE o.id = (SELECT organization_id FROM profiles WHERE id = auth.uid())

UNION ALL

SELECT 
  'Límites (vista)' as origen,
  prestamos_usados::INTEGER as prestamos_totales,
  clientes_usados::INTEGER as clientes_totales
FROM vista_organizacion_limites
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Ver detalle por estado
SELECT 
  '✅ DETALLE POR ESTADO' as info,
  COALESCE(pr.estado, 'SIN PRÉSTAMOS') as estado,
  COUNT(*) as cantidad
FROM profiles p
LEFT JOIN prestamos pr ON pr.user_id = p.id
WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
GROUP BY pr.estado
ORDER BY COUNT(*) DESC;

-- Ver función RPC directamente
SELECT 
  '✅ FUNCIÓN RPC get_limites_organizacion()' as info,
  plan_nombre,
  limite_clientes,
  clientes_usados,
  limite_prestamos,
  prestamos_usados,
  puede_crear_cliente,
  puede_crear_prestamo
FROM get_limites_organizacion();

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
SELECT '🎉 Script completado exitosamente' as final;
SELECT 'Verifica que los números de Dashboard = Límites (deben ser iguales)' as instruccion;
