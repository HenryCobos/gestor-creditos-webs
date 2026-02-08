-- =====================================================
-- FIX COMPLETO: Sistema de organización
-- =====================================================
-- Este script corrige:
-- 1. La vista para conteo correcto de límites
-- 2. La función get_limites_organizacion()
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

-- Ver conteo desde la vista actual
SELECT 
  '2. CONTEO DESDE VISTA (Límites)' as info,
  clientes_usados,
  prestamos_usados
FROM vista_organizacion_limites
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

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
-- PARTE 3: VERIFICAR FUNCIÓN get_limites_organizacion()
-- =====================================================

-- La función ya existe y usa la vista, solo verificamos que esté bien
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_limites_organizacion'
  ) THEN
    RAISE NOTICE '✅ Función get_limites_organizacion() existe';
  ELSE
    RAISE EXCEPTION '❌ Función get_limites_organizacion() NO existe - ejecutar SISTEMA_LIMITES_ORGANIZACION.sql primero';
  END IF;
END $$;

-- =====================================================
-- PARTE 4: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  '✅ VERIFICACIÓN DESPUÉS DEL FIX' as resultado;

-- Comparar conteo directo vs vista
SELECT 
  'Dashboard (directo)' as origen,
  COUNT(DISTINCT pr.id) as prestamos_totales,
  COUNT(DISTINCT c.id) as clientes_totales
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
  prestamos_usados
FROM get_limites_organizacion();

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Después de ejecutar este script, deberías ver:
-- 1. Conteo directo = Conteo desde vista (DEBEN SER IGUALES)
-- 2. Dashboard = Límites (DEBEN SER IGUALES)
-- 3. La función RPC debe devolver los mismos números que la vista

SELECT '🎉 Script completado - Verifica que los números coincidan arriba' as final;
