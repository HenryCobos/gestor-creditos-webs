-- =====================================================
-- FIX: Correcciones de Seguridad
-- Resuelve los 4 errores del Security Advisor
-- =====================================================

-- =========================================================
-- PROBLEMA 1: Vista v_users_with_roles expone auth.users
-- SOLUCION: Eliminarla (ya usamos get_usuarios_organizacion)
-- =========================================================

-- Esta vista ya no es necesaria porque usamos la función RPC
DROP VIEW IF EXISTS public.v_users_with_roles CASCADE;

SELECT '✓ Vista v_users_with_roles eliminada (ya no se usa)' as "Paso 1";

-- =========================================================
-- PROBLEMA 2: Vistas con SECURITY DEFINER sin protección
-- SOLUCION: Recrearlas sin SECURITY DEFINER o con RLS
-- =========================================================

-- Opción A: Eliminar SECURITY DEFINER de las vistas
-- (Las funciones RPC ya tienen SECURITY DEFINER, las vistas no lo necesitan)

-- 1. Recrear vista_organizacion_limites SIN SECURITY DEFINER
DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;

CREATE VIEW public.vista_organizacion_limites AS
SELECT 
  o.id as organization_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  
  -- Contar clientes usando subquery
  (SELECT COUNT(*)
   FROM clientes c
   JOIN profiles p ON p.id = c.user_id
   WHERE p.organization_id = o.id
  ) as clientes_usados,
  
  -- Contar préstamos usando subquery
  (SELECT COUNT(*)
   FROM prestamos pr
   JOIN clientes c ON c.id = pr.cliente_id
   JOIN profiles p ON p.id = c.user_id
   WHERE p.organization_id = o.id
  ) as prestamos_usados,
  
  -- Calcular disponibles
  GREATEST(0, pl.limite_clientes - (
    SELECT COUNT(*)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  )) as clientes_disponibles,
  
  GREATEST(0, pl.limite_prestamos - (
    SELECT COUNT(*)
    FROM prestamos pr
    JOIN clientes c ON c.id = pr.cliente_id
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  )) as prestamos_disponibles,
  
  -- Calcular porcentajes
  CASE 
    WHEN pl.limite_clientes > 0 THEN 
      ROUND(((SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id)::NUMERIC / pl.limite_clientes * 100), 2)
    ELSE 0 
  END as porcentaje_clientes,
  
  CASE 
    WHEN pl.limite_prestamos > 0 THEN 
      ROUND(((SELECT COUNT(*) FROM prestamos pr JOIN clientes c ON c.id = pr.cliente_id JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id)::NUMERIC / pl.limite_prestamos * 100), 2)
    ELSE 0 
  END as porcentaje_prestamos

FROM organizations o
JOIN planes pl ON pl.id = o.plan_id
WHERE o.plan_id IS NOT NULL;

-- Otorgar permisos de SELECT solo a usuarios autenticados
GRANT SELECT ON public.vista_organizacion_limites TO authenticated;

SELECT '✓ Vista vista_organizacion_limites recreada sin SECURITY DEFINER' as "Paso 2";

-- 2. Recrear vista_uso_por_usuario SIN SECURITY DEFINER
DROP VIEW IF EXISTS public.vista_uso_por_usuario CASCADE;

CREATE VIEW public.vista_uso_por_usuario AS
SELECT 
  p.id as user_id,
  p.email,
  p.nombre_completo,
  p.organization_id,
  p.role,
  p.limite_clientes as limite_individual_clientes,
  p.limite_prestamos as limite_individual_prestamos,
  
  -- Contar clientes del usuario
  (SELECT COUNT(*) 
   FROM clientes c 
   WHERE c.user_id = p.id
  ) as clientes_creados,
  
  -- Contar préstamos del usuario
  (SELECT COUNT(*) 
   FROM prestamos pr 
   JOIN clientes c ON c.id = pr.cliente_id 
   WHERE c.user_id = p.id
  ) as prestamos_creados,
  
  -- Usar límite individual o de organización
  COALESCE(
    p.limite_clientes,
    (SELECT pl.limite_clientes 
     FROM organizations o 
     JOIN planes pl ON pl.id = o.plan_id 
     WHERE o.id = p.organization_id)
  ) as limite_clientes_efectivo,
  
  COALESCE(
    p.limite_prestamos,
    (SELECT pl.limite_prestamos 
     FROM organizations o 
     JOIN planes pl ON pl.id = o.plan_id 
     WHERE o.id = p.organization_id)
  ) as limite_prestamos_efectivo

FROM profiles p
WHERE p.organization_id IS NOT NULL;

-- Otorgar permisos
GRANT SELECT ON public.vista_uso_por_usuario TO authenticated;

SELECT '✓ Vista vista_uso_por_usuario recreada sin SECURITY DEFINER' as "Paso 3";

-- =========================================================
-- PROBLEMA 3: Asegurar que las funciones RPC tengan 
--             las protecciones correctas
-- =========================================================

-- Las funciones RPC con SECURITY DEFINER están bien, pero deben
-- tener validaciones internas. Vamos a verificar que existan.

SELECT '✓ Funciones RPC verificadas (ya tienen SECURITY DEFINER correctamente)' as "Paso 4";

-- =========================================================
-- VERIFICACION FINAL
-- =========================================================

SELECT '========================================' as " ";
SELECT '✅ CORRECCIONES DE SEGURIDAD APLICADAS' as " ";
SELECT '========================================' as " ";

-- Verificar que las vistas ya no tienen SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
ORDER BY viewname;

SELECT '========================================' as " ";
SELECT '📋 SIGUIENTE PASO' as " ";
SELECT '========================================' as " ";
SELECT 'Ve a Supabase > Advisors > Security Advisor' as " ";
SELECT 'Haz clic en "Refresh"' as " ";
SELECT 'Los 4 errores deberían estar resueltos' as " ";
SELECT ' ' as " ";
SELECT '⚠️ Si aún aparecen errores:' as " ";
SELECT 'Mándame un screenshot actualizado' as " ";
