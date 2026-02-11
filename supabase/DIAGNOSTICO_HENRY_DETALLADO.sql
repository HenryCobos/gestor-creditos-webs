-- =========================================================
-- DIAGNÓSTICO DETALLADO - HENRY
-- =========================================================
-- Este script muestra EXACTAMENTE qué está pasando con tu cuenta
-- =========================================================

-- 1. Ver TU usuario específico
SELECT 
  '=== TU USUARIO ===' as seccion,
  p.email,
  p.organization_id,
  p.role,
  p.plan_id as plan_individual,
  o.nombre_negocio as organizacion_nombre,
  o.plan_id as org_plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes as limite_clientes_plan,
  pl.limite_prestamos as limite_prestamos_plan
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE p.email ILIKE '%henry%' OR p.email ILIKE '%hcobos%';

-- 2. Ver TODOS los planes disponibles
SELECT 
  '=== PLANES DISPONIBLES ===' as seccion,
  id,
  nombre,
  slug,
  limite_clientes,
  limite_prestamos,
  activo
FROM planes
ORDER BY orden;

-- 3. Ver tu organización específica
SELECT 
  '=== TU ORGANIZACIÓN ===' as seccion,
  o.id as org_id,
  o.nombre_negocio,
  o.owner_id,
  o.plan_id,
  o.subscription_status,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE o.owner_id IN (
  SELECT id FROM profiles WHERE email ILIKE '%henry%' OR email ILIKE '%hcobos%'
);

-- 4. Ver TODOS los usuarios de tu organización
SELECT 
  '=== USUARIOS DE TU ORG ===' as seccion,
  p.email,
  p.role,
  p.organization_id,
  p.plan_id as plan_individual
FROM profiles p
WHERE p.organization_id IN (
  SELECT organization_id FROM profiles WHERE email ILIKE '%henry%'
);

-- 5. Contar recursos de tu organización
SELECT 
  '=== CONTEO RECURSOS ===' as seccion,
  (SELECT COUNT(*) 
   FROM clientes c 
   JOIN profiles p ON p.id = c.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email ILIKE '%henry%' LIMIT 1)
  ) as total_clientes,
  (SELECT COUNT(*) 
   FROM prestamos pr 
   JOIN profiles p ON p.id = pr.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email ILIKE '%henry%' LIMIT 1)
  ) as total_prestamos;

-- 6. Verificar qué devuelve la función get_limites_organizacion para TU usuario
-- NOTA: Esta consulta puede fallar si no estás autenticado como Henry en Supabase
-- En ese caso, ignora el error y sigue con los resultados anteriores
