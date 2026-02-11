-- =========================================================
-- FIX FINAL - PARA MÚLTIPLES ORGANIZACIONES
-- =========================================================
-- Este script:
-- 1. Respeta todas las organizaciones existentes (clientes)
-- 2. Corrige usuarios mal asignados según user_roles
-- 3. Recrea TODAS las funciones necesarias
-- 4. Verifica que todo funcione correctamente
-- =========================================================

\echo '========================================'
\echo 'FIX FINAL - MÚLTIPLES ORGANIZACIONES'
\echo '========================================'

-- =========================================================
-- PASO 1: Corregir asignaciones de usuarios según user_roles
-- =========================================================

DO $$
DECLARE
  v_corregidos INTEGER := 0;
  v_user RECORD;
BEGIN
  \echo 'PASO 1: Corrigiendo asignaciones de usuarios...'
  
  FOR v_user IN
    SELECT 
      p.id as user_id,
      p.email,
      p.organization_id as org_actual,
      ur.organization_id as org_correcta,
      ur.role as rol_correcto
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.organization_id != ur.organization_id
       OR p.organization_id IS NULL
  LOOP
    -- Actualizar profile
    UPDATE profiles
    SET 
      organization_id = v_user.org_correcta,
      role = v_user.rol_correcto,
      plan_id = NULL,
      limite_clientes = NULL,
      limite_prestamos = NULL,
      updated_at = NOW()
    WHERE id = v_user.user_id;
    
    v_corregidos := v_corregidos + 1;
    RAISE NOTICE '✓ Corregido: % -> Org correcta', v_user.email;
  END LOOP;
  
  RAISE NOTICE 'PASO 1 COMPLETADO: % usuarios corregidos', v_corregidos;
END $$;

-- =========================================================
-- PASO 2: Asegurar que organizaciones tienen plan_id
-- =========================================================

\echo 'PASO 2: Asegurando que organizaciones tienen plan...'

UPDATE organizations o
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  updated_at = NOW()
WHERE plan_id IS NULL;

-- =========================================================
-- PASO 3: Recrear función get_limites_organizacion()
-- =========================================================

\echo 'PASO 3: Recreando función get_limites_organizacion()...'

DROP FUNCTION IF EXISTS public.get_limites_organizacion() CASCADE;

CREATE OR REPLACE FUNCTION public.get_limites_organizacion()
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
  
  -- Contar clientes de la organización
  SELECT COALESCE(COUNT(*), 0) INTO v_clientes_count
  FROM clientes c
  INNER JOIN profiles p ON p.id = c.user_id
  WHERE p.organization_id = v_org_id;
  
  -- Contar préstamos de la organización
  SELECT COALESCE(COUNT(*), 0) INTO v_prestamos_count
  FROM prestamos pr
  INNER JOIN profiles p ON p.id = pr.user_id
  WHERE p.organization_id = v_org_id;
  
  -- Retornar datos
  RETURN QUERY
  SELECT 
    o.id,
    COALESCE(pl.nombre, 'Sin Plan')::TEXT,
    COALESCE(pl.slug, 'unknown')::TEXT,
    COALESCE(pl.limite_clientes, 0),
    COALESCE(pl.limite_prestamos, 0),
    v_clientes_count,
    v_prestamos_count,
    GREATEST(0, COALESCE(pl.limite_clientes, 0) - v_clientes_count),
    GREATEST(0, COALESCE(pl.limite_prestamos, 0) - v_prestamos_count),
    CASE 
      WHEN COALESCE(pl.limite_clientes, 0) > 0 THEN
        ROUND((v_clientes_count::NUMERIC / pl.limite_clientes) * 100, 2)
      ELSE 0
    END,
    CASE 
      WHEN COALESCE(pl.limite_prestamos, 0) > 0 THEN
        ROUND((v_prestamos_count::NUMERIC / pl.limite_prestamos) * 100, 2)
      ELSE 0
    END,
    (v_clientes_count < COALESCE(pl.limite_clientes, 0)),
    (v_prestamos_count < COALESCE(pl.limite_prestamos, 0))
  FROM organizations o
  LEFT JOIN planes pl ON pl.id = o.plan_id
  WHERE o.id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

-- =========================================================
-- PASO 4: Recrear función get_uso_por_usuario()
-- =========================================================

\echo 'PASO 4: Recreando función get_uso_por_usuario()...'

DROP FUNCTION IF EXISTS public.get_uso_por_usuario() CASCADE;

CREATE OR REPLACE FUNCTION public.get_uso_por_usuario()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nombre_completo TEXT,
  role TEXT,
  clientes_count BIGINT,
  prestamos_count BIGINT,
  organization_id UUID
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
  
  -- Retornar uso por usuario de la organización
  RETURN QUERY
  SELECT 
    p.id,
    p.email::TEXT,
    COALESCE(p.nombre_completo, p.full_name, p.email)::TEXT,
    COALESCE(p.role, 'cobrador')::TEXT,
    COALESCE((SELECT COUNT(*) FROM clientes c WHERE c.user_id = p.id), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM prestamos pr WHERE pr.user_id = p.id), 0)::BIGINT,
    p.organization_id
  FROM profiles p
  WHERE p.organization_id = v_org_id
  ORDER BY p.role DESC, p.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_uso_por_usuario() TO authenticated;

-- =========================================================
-- PASO 5: Eliminar vistas que causan problemas
-- =========================================================

\echo 'PASO 5: Eliminando vistas problemáticas...'

DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;
DROP VIEW IF EXISTS public.vista_uso_por_usuario CASCADE;

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

\echo '========================================'
\echo 'VERIFICACIÓN FINAL'
\echo '========================================'

-- Ver resumen de organizaciones
SELECT 
  'ORGANIZACIONES:' as tipo,
  o.nombre_negocio,
  COALESCE(pl.nombre, 'Sin Plan') as plan,
  COALESCE(pl.limite_clientes, 0) as limite_clientes,
  COALESCE(pl.limite_prestamos, 0) as limite_prestamos,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as usuarios,
  (SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id) as clientes_totales,
  (SELECT COUNT(*) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id) as prestamos_totales
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY usuarios DESC;

-- Ver usuarios con problemas
SELECT 
  'USUARIOS CON PROBLEMAS:' as tipo,
  COUNT(*) as total
FROM profiles p
WHERE p.organization_id IS NULL
   OR p.plan_id IS NOT NULL;

\echo '========================================'
\echo '✅ FIX COMPLETADO'
\echo '========================================'
\echo 'SIGUIENTE PASO:'
\echo '1. Cierra sesión en el sistema'
\echo '2. Limpia caché del navegador (Ctrl+Shift+Del)'
\echo '3. Vuelve a iniciar sesión'
\echo '4. Ahora verás los límites correctos'
\echo '========================================'
