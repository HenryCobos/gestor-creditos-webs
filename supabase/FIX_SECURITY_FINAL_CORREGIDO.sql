-- =========================================================
-- SOLUCIÓN FINAL CORREGIDA: ELIMINAR VISTAS Y RECREAR FUNCIONES
-- =========================================================
-- Fecha: 11 Feb 2026
-- Corrige error: "cannot change return type of existing function"
-- 
-- Este script elimina completamente funciones y vistas existentes
-- antes de recrearlas con la definición correcta.
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 INICIANDO CORRECCIÓN SECURITY ADVISOR' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: ELIMINAR FUNCIONES EXISTENTES (con CASCADE)
-- =========================================================

DROP FUNCTION IF EXISTS public.get_limites_organizacion() CASCADE;
DROP FUNCTION IF EXISTS public.get_uso_por_usuario() CASCADE;

SELECT '✓ Funciones antiguas eliminadas' as "Paso 1";

-- =========================================================
-- PASO 2: ELIMINAR VISTAS PROBLEMÁTICAS
-- =========================================================

DROP VIEW IF EXISTS public.vista_uso_por_usuario CASCADE;
DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;

SELECT '✓ Vistas problemáticas eliminadas' as "Paso 2";

-- =========================================================
-- PASO 3: RECREAR FUNCIÓN get_limites_organizacion()
-- =========================================================

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
  -- Obtener organización del usuario actual
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = auth.uid();
  
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

SELECT '✓ Función get_limites_organizacion() recreada correctamente' as "Paso 3";

-- =========================================================
-- PASO 4: RECREAR FUNCIÓN get_uso_por_usuario()
-- =========================================================

CREATE FUNCTION public.get_uso_por_usuario()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nombre_completo TEXT,
  organization_id UUID,
  role TEXT,
  limite_individual_clientes INTEGER,
  limite_individual_prestamos INTEGER,
  clientes_creados BIGINT,
  prestamos_creados BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  activo BOOLEAN,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
BEGIN
  -- Obtener rol y organización del usuario actual
  SELECT p.role, p.organization_id INTO v_role, v_org_id
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Solo admin puede ver esto
  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden acceder a esta función';
  END IF;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin organización';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.nombre_completo,
    p.organization_id,
    p.role,
    p.limite_clientes as limite_individual_clientes,
    p.limite_prestamos as limite_individual_prestamos,
    
    -- Contar recursos creados por este usuario
    (SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id) as clientes_creados,
    (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id) as prestamos_creados,
    
    -- Calcular disponibles individuales (si tiene límites propios)
    CASE 
      WHEN p.limite_clientes IS NOT NULL THEN 
        GREATEST(0, p.limite_clientes - (SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id))
      ELSE NULL 
    END as clientes_disponibles,
    
    CASE 
      WHEN p.limite_prestamos IS NOT NULL THEN 
        GREATEST(0, p.limite_prestamos - (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id))
      ELSE NULL 
    END as prestamos_disponibles,
    
    p.activo,
    p.created_at
    
  FROM profiles p
  WHERE p.organization_id = v_org_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_uso_por_usuario() TO authenticated;

SELECT '✓ Función get_uso_por_usuario() recreada correctamente' as "Paso 4";

-- =========================================================
-- PASO 5: VERIFICACIÓN COMPLETA
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICANDO RESULTADO' as " ";
SELECT '========================================' as " ";

-- Verificar que las vistas YA NO EXISTEN
SELECT 
  COALESCE(
    (SELECT COUNT(*) FROM pg_views 
     WHERE schemaname = 'public' 
       AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
    ), 0
  ) as vistas_restantes,
  CASE 
    WHEN COALESCE(
      (SELECT COUNT(*) FROM pg_views 
       WHERE schemaname = 'public' 
         AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
      ), 0
    ) = 0 THEN '✅ Vistas eliminadas correctamente'
    ELSE '❌ Aún existen vistas problemáticas'
  END as estado_vistas;

-- Verificar que las funciones EXISTEN y tienen SECURITY DEFINER
SELECT 
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Correcto (SECURITY DEFINER)'
    ELSE '❌ Falta SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_limites_organizacion', 'get_uso_por_usuario')
ORDER BY routine_name;

-- Verificar que las funciones RETORNAN datos correctamente
DO $$
BEGIN
  -- Test get_limites_organizacion()
  IF EXISTS (
    SELECT 1 FROM get_limites_organizacion() LIMIT 1
  ) THEN
    RAISE NOTICE '✅ get_limites_organizacion() funciona correctamente';
  ELSE
    RAISE WARNING '⚠️ get_limites_organizacion() no retorna datos (puede ser normal si no hay org)';
  END IF;
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al probar get_limites_organizacion(): %', SQLERRM;
END $$;

SELECT '========================================' as " ";
SELECT '✅ CORRECCIÓN COMPLETADA' as " ";
SELECT '========================================' as " ";
SELECT '📋 SIGUIENTE PASO:' as " ";
SELECT '1. Ve a Supabase Dashboard > Advisors > Security Advisor' as " ";
SELECT '2. Haz clic en "Refresh" o "Rerun Analysis"' as " ";
SELECT '3. Espera 5-10 minutos para que actualice el caché' as " ";
SELECT '4. Los 2 errores deberían desaparecer' as " ";
SELECT '========================================' as " ";
SELECT '🎯 Resultado: Vistas eliminadas, funciones RPC con SECURITY DEFINER correctas' as " ";
SELECT '========================================' as " ";
