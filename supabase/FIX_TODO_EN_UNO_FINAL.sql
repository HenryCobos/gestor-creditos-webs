-- =========================================================
-- FIX TODO-EN-UNO: Solución completa de organizaciones y límites
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- Este script hace TODO en el orden correcto:
-- 1. Asigna organizaciones a usuarios sin org
-- 2. Asigna plan_id a organizaciones
-- 3. Limpia plan_id de usuarios individuales
-- 4. Recrea función get_limites_organizacion()
-- 5. Verifica que todo funciona
-- =========================================================

SELECT '========================================' as " ";
SELECT '🚀 INICIANDO FIX COMPLETO' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: Asignar organización a usuarios sin org
-- =========================================================

DO $$
DECLARE
  v_user RECORD;
  v_new_org_id UUID;
  v_free_plan_id UUID;
  v_usuarios_sin_org INTEGER;
BEGIN
  -- Contar usuarios sin org
  SELECT COUNT(*) INTO v_usuarios_sin_org FROM profiles WHERE organization_id IS NULL;
  
  IF v_usuarios_sin_org = 0 THEN
    RAISE NOTICE '✅ Todos los usuarios tienen organización';
  ELSE
    RAISE NOTICE '⚠️ Creando organizaciones para % usuarios', v_usuarios_sin_org;
    
    -- Obtener plan gratuito
    SELECT id INTO v_free_plan_id FROM planes WHERE slug = 'free' LIMIT 1;
    
    IF v_free_plan_id IS NULL THEN
      RAISE WARNING '❌ No existe plan gratuito con slug "free"';
    ELSE
      -- Crear org para cada usuario sin org
      FOR v_user IN 
        SELECT id, email, nombre_completo 
        FROM profiles 
        WHERE organization_id IS NULL
      LOOP
        -- Crear organización
        INSERT INTO organizations (
          owner_id,
          nombre_negocio,
          plan_id,
          subscription_status,
          created_at,
          updated_at
        ) VALUES (
          v_user.id,
          COALESCE(v_user.nombre_completo, v_user.email) || '''s Organization',
          v_free_plan_id,
          'active',
          NOW(),
          NOW()
        )
        RETURNING id INTO v_new_org_id;
        
        -- Actualizar usuario
        UPDATE profiles
        SET organization_id = v_new_org_id
        WHERE id = v_user.id;
        
        -- Crear user_role
        INSERT INTO user_roles (user_id, organization_id, role, created_at)
        VALUES (v_user.id, v_new_org_id, 'admin', NOW())
        ON CONFLICT (user_id, organization_id) DO NOTHING;
        
        RAISE NOTICE '✓ Organización creada para: %', v_user.email;
      END LOOP;
    END IF;
  END IF;
END $$;

SELECT '✓ Paso 1: Usuarios asignados a organizaciones' as " ";

-- =========================================================
-- PASO 2: Asignar plan_id a organizaciones sin plan
-- =========================================================

-- 2.1: Intentar obtener plan del owner
UPDATE organizations o
SET plan_id = p.plan_id
FROM profiles p
WHERE o.owner_id = p.id
  AND o.plan_id IS NULL
  AND p.plan_id IS NOT NULL;

-- 2.2: Intentar obtener plan de algún admin de la org
UPDATE organizations o
SET plan_id = (
  SELECT pl.id
  FROM profiles p2
  JOIN user_roles ur ON ur.user_id = p2.id AND ur.organization_id = o.id
  LEFT JOIN planes pl ON pl.id = p2.plan_id
  WHERE ur.role = 'admin'
    AND p2.plan_id IS NOT NULL
  LIMIT 1
)
WHERE o.plan_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM profiles p3
    JOIN user_roles ur2 ON ur2.user_id = p3.id AND ur2.organization_id = o.id
    WHERE ur2.role = 'admin' AND p3.plan_id IS NOT NULL
  );

-- 2.3: Asignar plan profesional a org específicas (si aplica)
UPDATE organizations o
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'pro' OR slug = 'profesional' OR nombre ILIKE '%profesional%' LIMIT 1),
  subscription_status = 'active'
WHERE plan_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.organization_id = o.id 
      AND (p.email LIKE '%henry%' OR p.email LIKE '%financebusiness%')
  );

SELECT '✓ Paso 2: plan_id asignado a organizaciones' as " ";

-- =========================================================
-- PASO 3: Limpiar plan_id de usuarios en organizaciones
-- =========================================================

UPDATE profiles
SET 
  plan_id = NULL,
  limite_clientes = NULL,
  limite_prestamos = NULL
WHERE organization_id IS NOT NULL
  AND plan_id IS NOT NULL;

SELECT '✓ Paso 3: Planes individuales limpiados' as " ";

-- =========================================================
-- PASO 4: Recrear función get_limites_organizacion()
-- =========================================================

DROP FUNCTION IF EXISTS public.get_limites_organizacion() CASCADE;

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
    
    (pl.limite_clientes - v_clientes_count) as clientes_disponibles,
    (pl.limite_prestamos - v_prestamos_count) as prestamos_disponibles,
    
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
    
    (v_clientes_count < pl.limite_clientes) as puede_crear_cliente,
    (v_prestamos_count < pl.limite_prestamos) as puede_crear_prestamo
    
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  WHERE o.id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

SELECT '✓ Paso 4: Función get_limites_organizacion() recreada' as " ";

-- =========================================================
-- VERIFICACIÓN COMPLETA
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICACIÓN FINAL' as " ";
SELECT '========================================' as " ";

-- Ver organizaciones y sus planes
SELECT 
  'Organizaciones:' as info,
  o.id,
  o.nombre_negocio,
  pl.nombre as plan,
  pl.slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  COUNT(p.id) as total_usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre, pl.slug, pl.limite_clientes, pl.limite_prestamos
ORDER BY o.created_at DESC
LIMIT 5;

-- Ver usuarios sin org (debería ser 0)
SELECT 
  'Usuarios sin org:' as info,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen organización'
    ELSE '❌ Hay usuarios sin organización'
  END as estado
FROM profiles
WHERE organization_id IS NULL;

-- Ver organizaciones sin plan (debería ser 0)
SELECT 
  'Organizaciones sin plan:' as info,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas tienen plan'
    ELSE '❌ Hay organizaciones sin plan'
  END as estado
FROM organizations
WHERE plan_id IS NULL;

-- Ver usuarios en org con plan individual (debería ser 0)
SELECT 
  'Usuarios con plan individual en org:' as info,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Ninguno tiene plan individual'
    ELSE '❌ Hay usuarios con plan individual'
  END as estado
FROM profiles
WHERE organization_id IS NOT NULL
  AND plan_id IS NOT NULL;

SELECT '========================================' as " ";
SELECT '✅ FIX COMPLETO FINALIZADO' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 SIGUIENTE PASO:' as " ";
SELECT '1. Refresca tu navegador (Ctrl+F5)' as " ";
SELECT '2. Ve al Dashboard de tu aplicación' as " ";
SELECT '3. Verifica que muestre el plan correcto' as " ";
SELECT '4. Admin y cobradores deben ver el mismo plan' as " ";
SELECT '' as " ";
SELECT '⚠️ NOTA: La función get_limites_organizacion() solo se puede' as " ";
SELECT 'probar desde la aplicación (no desde SQL Editor)' as " ";
SELECT '========================================' as " ";
