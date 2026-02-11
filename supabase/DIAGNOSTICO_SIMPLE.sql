-- =========================================================
-- DIAGNÓSTICO SIMPLE - VER ESTADO REAL DE LA BASE DE DATOS
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 DIAGNÓSTICO COMPLETO' as " ";
SELECT '========================================' as " ";

-- 1. Ver TODOS los usuarios y su organización
SELECT 
  '1. USUARIOS:' as seccion,
  p.email,
  p.nombre_completo,
  p.organization_id,
  o.nombre_negocio as organizacion,
  p.role,
  p.plan_id as plan_individual
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.email
LIMIT 10;

-- 2. Ver TODAS las organizaciones y sus planes
SELECT 
  '2. ORGANIZACIONES:' as seccion,
  o.id,
  o.nombre_negocio,
  o.owner_id,
  o.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY o.created_at DESC
LIMIT 10;

-- 3. Ver función get_limites_organizacion
SELECT 
  '3. FUNCIÓN:' as seccion,
  proname as nombre_funcion,
  prosecdef as tiene_security_definer
FROM pg_proc
WHERE proname = 'get_limites_organizacion';

-- 4. Contar recursos
SELECT 
  '4. RECURSOS TOTALES:' as seccion,
  (SELECT COUNT(*) FROM clientes) as total_clientes,
  (SELECT COUNT(*) FROM prestamos) as total_prestamos;

SELECT '========================================' as " ";
SELECT '📋 COMPARTE ESTE RESULTADO' as " ";
SELECT '========================================' as " ";
