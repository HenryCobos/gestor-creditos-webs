-- =========================================================
-- SOLUCIÓN ALTERNATIVA: ELIMINAR VISTAS PROBLEMÁTICAS
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- ESTRATEGIA: Si Supabase Security Advisor sigue reportando errores
-- sobre las vistas, la mejor solución es ELIMINARLAS completamente
-- y usar SOLO funciones RPC para acceso a datos.
--
-- Las funciones RPC con SECURITY DEFINER son la forma correcta
-- de controlar acceso en Supabase (recomendado por documentación).
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔒 ELIMINANDO VISTAS CON SECURITY DEFINER' as " ";
SELECT '========================================' as " ";

-- PASO 1: Eliminar completamente las vistas problemáticas
DROP VIEW IF EXISTS public.vista_uso_por_usuario CASCADE;
DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;

SELECT '✓ Vistas eliminadas' as "Paso 1";

-- =========================================================
-- PASO 2: Asegurar que las FUNCIONES RPC existan y estén correctas
-- =========================================================

-- Función para obtener límites de organización (reemplaza la vista)
CREATE OR REPLACE FUNCTION public.get_limites_organizacion()
RETURNS TABLE (
  organization_id UUID,
  plan_nombre VARCHAR,
  plan_slug VARCHAR,
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  clientes_usados BIGINT,
  prestamos_usados BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  porcentaje_clientes NUMERIC,
  porcentaje_prestamos NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Obtener organización del usuario actual
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = auth.uid();
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin organización';
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    pl.nombre::VARCHAR as plan_nombre,
    pl.slug::VARCHAR as plan_slug,
    pl.limite_clientes,
    pl.limite_prestamos,
    
    -- Contar clientes
    (SELECT COUNT(*)
     FROM clientes c
     JOIN profiles p ON p.id = c.user_id
     WHERE p.organization_id = o.id
    )::BIGINT as clientes_usados,
    
    -- Contar préstamos
    (SELECT COUNT(*)
     FROM prestamos pr
     JOIN profiles p ON p.id = pr.user_id
     WHERE p.organization_id = o.id
    )::BIGINT as prestamos_usados,
    
    -- Calcular disponibles
    (pl.limite_clientes - (
      SELECT COUNT(*)
      FROM clientes c
      JOIN profiles p ON p.id = c.user_id
      WHERE p.organization_id = o.id
    ))::BIGINT as clientes_disponibles,
    
    (pl.limite_prestamos - (
      SELECT COUNT(*)
      FROM prestamos pr
      JOIN profiles p ON p.id = pr.user_id
      WHERE p.organization_id = o.id
    ))::BIGINT as prestamos_disponibles,
    
    -- Porcentajes
    CASE 
      WHEN pl.limite_clientes > 0 THEN
        ROUND((
          (SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id)::NUMERIC 
          / pl.limite_clientes
        ) * 100, 2)
      ELSE 0
    END as porcentaje_clientes,
    
    CASE 
      WHEN pl.limite_prestamos > 0 THEN
        ROUND((
          (SELECT COUNT(*) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id)::NUMERIC 
          / pl.limite_prestamos
        ) * 100, 2)
      ELSE 0
    END as porcentaje_prestamos
    
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  WHERE o.id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

SELECT '✓ Función get_limites_organizacion() recreada' as "Paso 2";

-- =========================================================
-- PASO 3: Función para obtener uso por usuario (solo admin)
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_uso_por_usuario()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  nombre_completo VARCHAR,
  organization_id UUID,
  role VARCHAR,
  limite_individual_clientes INTEGER,
  limite_individual_prestamos INTEGER,
  clientes_creados BIGINT,
  prestamos_creados BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  activo BOOLEAN
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
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden acceder a esta función';
  END IF;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin organización';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email::VARCHAR,
    p.nombre_completo::VARCHAR,
    p.organization_id,
    p.role::VARCHAR,
    p.limite_clientes as limite_individual_clientes,
    p.limite_prestamos as limite_individual_prestamos,
    
    -- Contar clientes creados
    (SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id)::BIGINT as clientes_creados,
    
    -- Contar préstamos creados
    (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id)::BIGINT as prestamos_creados,
    
    -- Calcular disponibles individuales
    CASE 
      WHEN p.limite_clientes IS NOT NULL THEN 
        (p.limite_clientes - (SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id))::BIGINT
      ELSE NULL 
    END as clientes_disponibles,
    
    CASE 
      WHEN p.limite_prestamos IS NOT NULL THEN 
        (p.limite_prestamos - (SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id))::BIGINT
      ELSE NULL 
    END as prestamos_disponibles,
    
    p.activo
    
  FROM profiles p
  WHERE p.organization_id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_uso_por_usuario() TO authenticated;

SELECT '✓ Función get_uso_por_usuario() recreada' as "Paso 3";

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

SELECT '========================================' as " ";
SELECT '✅ SOLUCIÓN APLICADA' as " ";
SELECT '========================================' as " ";

-- Verificar que las vistas YA NO EXISTEN
SELECT 
  COUNT(*) as vistas_restantes,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Vistas eliminadas correctamente'
    ELSE '❌ Aún existen vistas problemáticas'
  END as estado
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario');

-- Verificar que las funciones existen y tienen SECURITY DEFINER
SELECT 
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Correcto'
    ELSE '❌ Falta DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_limites_organizacion', 'get_uso_por_usuario')
ORDER BY routine_name;

SELECT '========================================' as " ";
SELECT '📋 SIGUIENTE PASO' as " ";
SELECT '========================================' as " ";
SELECT '1. Ve a Supabase > Advisors > Security Advisor' as " ";
SELECT '2. Haz clic en "Refresh" o espera 5-10 minutos' as " ";
SELECT '3. Los errores deberían desaparecer' as " ";
SELECT '4. Si persisten, contacta a soporte de Supabase' as " ";
SELECT '========================================' as " ";
SELECT '✅ Vistas eliminadas, funciones RPC correctas' as "Resultado";
SELECT '========================================' as " ";
