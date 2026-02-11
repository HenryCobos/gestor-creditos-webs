-- =========================================================
-- DIAGNÓSTICO: Verificar sistema de límites de organización
-- =========================================================
-- Ejecuta este script mientras estás autenticado como ADMIN
-- para ver qué está pasando con los límites
-- =========================================================

SELECT '========================================' as " ";
SELECT '📊 DIAGNÓSTICO DE LÍMITES' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: Ver tu organización y su plan
-- =========================================================
SELECT 
  o.id as org_id,
  o.nombre_negocio,
  o.owner_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  o.subscription_status
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY o.created_at DESC
LIMIT 5;

SELECT '✓ Paso 1: Organizaciones y sus planes' as " ";

-- =========================================================
-- PASO 2: Ver usuarios de tu organización
-- =========================================================
SELECT 
  p.id as user_id,
  p.email,
  p.nombre_completo,
  p.organization_id,
  p.role,
  p.plan_id as plan_individual,
  CASE 
    WHEN p.plan_id IS NULL THEN '✅ Correcto (usa plan de org)'
    ELSE '❌ ERROR (tiene plan individual)'
  END as estado_plan
FROM profiles p
WHERE p.organization_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

SELECT '✓ Paso 2: Usuarios y sus configuraciones' as " ";

-- =========================================================
-- PASO 3: Contar recursos de la organización
-- =========================================================
-- Obtener tu organization_id
DO $$
DECLARE
  v_org_id UUID;
  v_total_clientes BIGINT;
  v_total_prestamos BIGINT;
BEGIN
  -- Obtener org del usuario actual
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = auth.uid();
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ Usuario actual no tiene organización';
    RETURN;
  END IF;
  
  -- Contar clientes
  SELECT COUNT(*) INTO v_total_clientes
  FROM clientes c
  JOIN profiles p ON p.id = c.user_id
  WHERE p.organization_id = v_org_id;
  
  -- Contar préstamos
  SELECT COUNT(*) INTO v_total_prestamos
  FROM prestamos pr
  JOIN profiles p ON p.id = pr.user_id
  WHERE p.organization_id = v_org_id;
  
  RAISE NOTICE '✓ Organización: %', v_org_id;
  RAISE NOTICE '✓ Total Clientes: %', v_total_clientes;
  RAISE NOTICE '✓ Total Préstamos: %', v_total_prestamos;
END $$;

SELECT '✓ Paso 3: Recursos de la organización' as " ";

-- =========================================================
-- PASO 4: Probar función get_limites_organizacion()
-- =========================================================
SELECT 
  '✓ Función get_limites_organizacion() existe' as status
FROM pg_proc 
WHERE proname = 'get_limites_organizacion';

-- Ejecutar la función
SELECT 
  organization_id,
  plan_nombre,
  plan_slug,
  limite_clientes,
  limite_prestamos,
  clientes_usados,
  prestamos_usados,
  clientes_disponibles,
  prestamos_disponibles,
  puede_crear_cliente,
  puede_crear_prestamo
FROM get_limites_organizacion();

SELECT '✓ Paso 4: Resultado de get_limites_organizacion()' as " ";

-- =========================================================
-- PASO 5: Ver perfiles sin organización
-- =========================================================
SELECT 
  COUNT(*) as usuarios_sin_org,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen organización'
    ELSE '⚠️ Hay usuarios sin organización'
  END as estado
FROM profiles
WHERE organization_id IS NULL;

SELECT '✓ Paso 5: Usuarios huérfanos' as " ";

-- =========================================================
-- RESUMEN
-- =========================================================
SELECT '========================================' as " ";
SELECT '📋 RESULTADO ESPERADO:' as " ";
SELECT '========================================' as " ";
SELECT '1. Tu organización debe tener plan_nombre = "Plan Profesional"' as " ";
SELECT '2. Todos los usuarios deben tener plan_individual = NULL' as " ";
SELECT '3. get_limites_organizacion() debe retornar:' as " ";
SELECT '   - plan_nombre: Plan Profesional' as " ";
SELECT '   - limite_clientes: 50' as " ";
SELECT '   - limite_prestamos: 50' as " ";
SELECT '   - clientes_usados: [tu número real]' as " ";
SELECT '   - prestamos_usados: [tu número real]' as " ";
SELECT '========================================' as " ";
