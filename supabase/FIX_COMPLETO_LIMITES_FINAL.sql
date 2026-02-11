-- =========================================================
-- FIX COMPLETO: Restaurar sistema de límites de organización
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- Este script soluciona:
-- 1. Asegura que las organizaciones tengan plan_id asignado
-- 2. Verifica que la función get_limites_organizacion() existe
-- 3. Corrige usuarios sin organization_id
-- 4. Verifica que todo funciona correctamente
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 FIX COMPLETO DE LÍMITES' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: Verificar y asignar plan_id a organizaciones
-- =========================================================

-- Ver organizaciones sin plan
SELECT 
  'Organizaciones sin plan:' as info,
  COUNT(*) as total
FROM organizations
WHERE plan_id IS NULL;

-- Asignar plan profesional a organizaciones que no tienen plan
-- pero cuyos owners tienen el plan profesional en su perfil
UPDATE organizations o
SET plan_id = p.plan_id
FROM profiles p
WHERE o.owner_id = p.id
  AND o.plan_id IS NULL
  AND p.plan_id IS NOT NULL;

-- Si aún hay organizaciones sin plan, asignarles el plan del admin
UPDATE organizations o
SET plan_id = (
  SELECT pl.id
  FROM profiles p2
  JOIN user_roles ur ON ur.user_id = p2.id AND ur.organization_id = o.id
  LEFT JOIN plans pl ON pl.id = p2.plan_id
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

-- Si todavía hay organizaciones sin plan, buscar en la tabla planes
-- cual es el plan profesional y asignarlo
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

SELECT '✓ Paso 1: plan_id asignado a organizaciones' as " ";

-- =========================================================
-- PASO 2: Verificar función get_limites_organizacion()
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_limites_organizacion'
  ) THEN
    RAISE EXCEPTION '❌ Función get_limites_organizacion() NO EXISTE. Ejecuta FIX_SECURITY_FINAL_CORREGIDO.sql primero';
  END IF;
  RAISE NOTICE '✅ Función get_limites_organizacion() existe';
END $$;

SELECT '✓ Paso 2: Función verificada' as " ";

-- =========================================================
-- PASO 3: Limpiar plan_id de usuarios en organizaciones
-- =========================================================

-- Los usuarios en organizaciones NO deben tener plan_id individual
UPDATE profiles
SET 
  plan_id = NULL,
  limite_clientes = NULL,
  limite_prestamos = NULL
WHERE organization_id IS NOT NULL
  AND plan_id IS NOT NULL;

SELECT '✓ Paso 3: Limpieza de planes individuales' as " ";

-- =========================================================
-- PASO 4: Asignar usuarios sin org a una organización
-- =========================================================

-- Crear organizaciones para usuarios sin org (si los hay)
DO $$
DECLARE
  v_user RECORD;
  v_new_org_id UUID;
  v_free_plan_id UUID;
BEGIN
  -- Obtener plan gratuito
  SELECT id INTO v_free_plan_id FROM planes WHERE slug = 'free' LIMIT 1;
  
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
    
    RAISE NOTICE 'Organización creada para: %', v_user.email;
  END LOOP;
END $$;

SELECT '✓ Paso 4: Usuarios sin org corregidos' as " ";

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICACIÓN FINAL' as " ";
SELECT '========================================' as " ";

-- Ver organizaciones y sus planes
SELECT 
  o.id,
  o.nombre_negocio,
  pl.nombre as plan,
  pl.slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  o.subscription_status,
  COUNT(p.id) as total_usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre, pl.slug, pl.limite_clientes, pl.limite_prestamos, o.subscription_status
ORDER BY o.created_at DESC;

-- Ver usuarios por organización
SELECT 
  p.email,
  p.nombre_completo,
  o.nombre_negocio as organizacion,
  p.role,
  p.plan_id as plan_individual,
  CASE 
    WHEN p.plan_id IS NULL THEN '✅ OK'
    ELSE '❌ Tiene plan individual'
  END as estado
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY o.nombre_negocio, p.role DESC;

-- Verificar organizaciones sin plan
SELECT 
  COUNT(*) as orgs_sin_plan,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas las organizaciones tienen plan'
    ELSE '❌ Hay organizaciones sin plan'
  END as estado
FROM organizations
WHERE plan_id IS NULL;

-- Verificar usuarios sin org
SELECT 
  COUNT(*) as usuarios_sin_org,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos los usuarios tienen organización'
    ELSE '⚠️ Hay usuarios sin organización'
  END as estado
FROM profiles
WHERE organization_id IS NULL;

SELECT '========================================' as " ";
SELECT '✅ FIX COMPLETADO' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 SIGUIENTE PASO:' as " ";
SELECT 'Ejecuta DIAGNOSTICO_LIMITES_ORGANIZACION.sql para verificar' as " ";
SELECT 'que get_limites_organizacion() retorna datos correctos' as " ";
SELECT '========================================' as " ";
