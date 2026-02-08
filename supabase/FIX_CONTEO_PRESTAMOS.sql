-- =====================================================
-- FIX: Corregir inconsistencia en conteo de préstamos
-- =====================================================
-- Problema: Dashboard muestra 28, límites muestran 26
-- Causa: La vista hace LEFT JOIN que puede perder datos

-- PASO 1: DIAGNÓSTICO
-- Verificar cuántos préstamos hay realmente en la organización
SELECT 
  '1. TOTAL PRÉSTAMOS EN LA ORGANIZACIÓN' as diagnostico,
  COUNT(*) as total_prestamos,
  COUNT(*) FILTER (WHERE estado = 'activo') as prestamos_activos,
  COUNT(*) FILTER (WHERE estado = 'pagado') as prestamos_pagados,
  COUNT(*) FILTER (WHERE estado = 'pendiente') as prestamos_pendientes
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- PASO 2: Ver si hay préstamos sin user_id válido
SELECT 
  '2. PRÉSTAMOS HUÉRFANOS (sin user_id válido)' as diagnostico,
  COUNT(*) as prestamos_huerfanos
FROM prestamos pr
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = pr.user_id
);

-- PASO 3: Ver el conteo actual de la vista
SELECT 
  '3. CONTEO ACTUAL DE LA VISTA' as diagnostico,
  clientes_usados,
  prestamos_usados
FROM vista_organizacion_limites
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- =====================================================
-- SOLUCIÓN: Corregir la vista para contar correctamente
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
  
  -- Contar clientes de la organización (todos los de users en la org)
  (
    SELECT COUNT(DISTINCT c.id)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  ) as clientes_usados,
  
  -- Contar préstamos de la organización (todos los de users en la org)
  (
    SELECT COUNT(DISTINCT pr.id)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  ) as prestamos_usados,
  
  -- Cálculo de disponibles
  (
    pl.limite_clientes - (
      SELECT COUNT(DISTINCT c.id)
      FROM clientes c
      JOIN profiles p ON p.id = c.user_id
      WHERE p.organization_id = o.id
    )
  ) as clientes_disponibles,
  
  (
    pl.limite_prestamos - (
      SELECT COUNT(DISTINCT pr.id)
      FROM prestamos pr
      JOIN profiles p ON p.id = pr.user_id
      WHERE p.organization_id = o.id
    )
  ) as prestamos_disponibles,
  
  -- Porcentajes
  ROUND(
    (
      (SELECT COUNT(DISTINCT c.id) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id)::NUMERIC 
      / NULLIF(pl.limite_clientes, 0)
    ) * 100, 
    2
  ) as porcentaje_clientes,
  
  ROUND(
    (
      (SELECT COUNT(DISTINCT pr.id) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id)::NUMERIC 
      / NULLIF(pl.limite_prestamos, 0)
    ) * 100, 
    2
  ) as porcentaje_prestamos
  
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id;

COMMENT ON VIEW vista_organizacion_limites IS 'Vista corregida que cuenta todos los clientes/préstamos de una organización usando subqueries para evitar problemas de GROUP BY';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  '✅ VISTA ACTUALIZADA - VERIFICACIÓN' as resultado,
  organization_id,
  nombre_negocio,
  plan_nombre,
  limite_clientes,
  clientes_usados,
  limite_prestamos,
  prestamos_usados
FROM vista_organizacion_limites
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Comparar con conteo directo
SELECT 
  '✅ CONTEO DIRECTO (debe ser igual a la vista)' as resultado,
  COUNT(DISTINCT c.id) as clientes_totales,
  COUNT(DISTINCT pr.id) as prestamos_totales
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
WHERE o.id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- Ver detalle de préstamos por estado
SELECT 
  '✅ DETALLE POR ESTADO' as info,
  pr.estado,
  COUNT(*) as cantidad
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
GROUP BY pr.estado
ORDER BY COUNT(*) DESC;
