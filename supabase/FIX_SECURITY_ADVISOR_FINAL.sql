-- =========================================================
-- FIX FINAL: Security Advisor - Eliminar SECURITY DEFINER de Vistas
-- =========================================================
-- Fecha: 11 Feb 2026
-- Problema: Supabase Security Advisor reporta 2 errores críticos:
--   1. vista_uso_por_usuario tiene SECURITY DEFINER
--   2. vista_organizacion_limites tiene SECURITY DEFINER
--
-- Solución: Las VISTAS no deben tener SECURITY DEFINER.
--           Solo las FUNCIONES RPC deben tenerlo.
--           El acceso a las vistas se controla mediante funciones RPC.
-- =========================================================

-- PASO 1: Eliminar vistas existentes con SECURITY DEFINER
DROP VIEW IF EXISTS public.vista_uso_por_usuario CASCADE;
DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;

SELECT '✓ Vistas antiguas eliminadas' as "Paso 1";

-- =========================================================
-- PASO 2: Recrear vista_organizacion_limites SIN SECURITY DEFINER
-- =========================================================

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
   JOIN profiles p ON p.id = pr.user_id
   WHERE p.organization_id = o.id
  ) as prestamos_usados,
  
  -- Calcular disponibles
  (pl.limite_clientes - (
    SELECT COUNT(*)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  )) as clientes_disponibles,
  
  (pl.limite_prestamos - (
    SELECT COUNT(*)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  )) as prestamos_disponibles,
  
  -- Calcular porcentajes
  CASE 
    WHEN pl.limite_clientes > 0 THEN
      ROUND(((SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id)::NUMERIC / pl.limite_clientes) * 100, 2)
    ELSE 0
  END as porcentaje_clientes,
  
  CASE 
    WHEN pl.limite_prestamos > 0 THEN
      ROUND(((SELECT COUNT(*) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id)::NUMERIC / pl.limite_prestamos) * 100, 2)
    ELSE 0
  END as porcentaje_prestamos,
  
  o.subscription_status,
  o.created_at,
  o.updated_at

FROM organizations o
JOIN planes pl ON pl.id = o.plan_id;

-- Otorgar permisos de SELECT a usuarios autenticados
GRANT SELECT ON public.vista_organizacion_limites TO authenticated;

SELECT '✓ Vista vista_organizacion_limites recreada SIN SECURITY DEFINER' as "Paso 2";

-- =========================================================
-- PASO 3: Recrear vista_uso_por_usuario SIN SECURITY DEFINER
-- =========================================================

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
   WHERE pr.user_id = p.id
  ) as prestamos_creados,
  
  -- Calcular disponibles individuales (si tiene límites)
  CASE 
    WHEN p.limite_clientes IS NOT NULL THEN 
      (p.limite_clientes - (SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id))
    ELSE NULL 
  END as clientes_disponibles,
  
  CASE 
    WHEN p.limite_prestamos IS NOT NULL THEN 
      (p.limite_prestamos - (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id))
    ELSE NULL 
  END as prestamos_disponibles,
  
  p.activo,
  p.created_at

FROM profiles p;

-- Otorgar permisos de SELECT a usuarios autenticados
GRANT SELECT ON public.vista_uso_por_usuario TO authenticated;

SELECT '✓ Vista vista_uso_por_usuario recreada SIN SECURITY DEFINER' as "Paso 3";

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

SELECT '========================================' as " ";
SELECT '✅ CORRECCIONES DE SEGURIDAD APLICADAS' as " ";
SELECT '========================================' as " ";

-- Verificar que las vistas YA NO tienen SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
ORDER BY viewname;

-- Verificar funciones RPC (estas SÍ deben tener SECURITY DEFINER)
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_usuarios_organizacion',
    'getClientesInteligente',
    'getPrestamosInteligente',
    'getCuotasSegunRol'
  )
ORDER BY routine_name;

SELECT '========================================' as " ";
SELECT '📋 SIGUIENTE PASO' as " ";
SELECT '========================================' as " ";
SELECT 'Ve a Supabase Dashboard > Advisors > Security Advisor' as "Acción 1";
SELECT 'Haz clic en "Refresh" o "Rerun Analysis"' as "Acción 2";
SELECT 'Verifica que los 2 errores están resueltos ✅' as "Acción 3";
SELECT '========================================' as " ";
