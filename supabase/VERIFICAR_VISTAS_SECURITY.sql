-- =========================================================
-- DIAGNÓSTICO: Verificar estado de vistas con SECURITY DEFINER
-- =========================================================

SELECT '========================================' as " ";
SELECT '📋 VERIFICACIÓN DE VISTAS' as " ";
SELECT '========================================' as " ";

-- Verificar si las vistas existen
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
ORDER BY viewname;

-- Verificar definición completa de las vistas para detectar SECURITY DEFINER
SELECT 
  viewname,
  CASE 
    WHEN definition ILIKE '%security definer%' THEN '❌ SÍ tiene SECURITY DEFINER'
    ELSE '✅ NO tiene SECURITY DEFINER'
  END as tiene_security_definer,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('vista_organizacion_limites', 'vista_uso_por_usuario')
ORDER BY viewname;

-- Verificar funciones (estas SÍ deben tener SECURITY DEFINER)
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Correcto (función debe tener DEFINER)'
    ELSE '⚠️ Revisar (función debería tener DEFINER)'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_usuarios_organizacion',
    'getClientesInteligente',
    'getPrestamosInteligente',
    'getCuotasSegunRol',
    'get_limites_organizacion',
    'get_uso_por_usuario'
  )
ORDER BY routine_name;

SELECT '========================================' as " ";
SELECT '💡 INTERPRETACIÓN' as " ";
SELECT '========================================' as " ";
SELECT 'Si las vistas TIENEN "SECURITY DEFINER", necesitamos otra estrategia' as "Nota 1";
SELECT 'Si las vistas NO tienen "SECURITY DEFINER", el Security Advisor necesita refrescar' as "Nota 2";
SELECT 'Las funciones SÍ deben tener SECURITY DEFINER' as "Nota 3";
SELECT '========================================' as " ";
