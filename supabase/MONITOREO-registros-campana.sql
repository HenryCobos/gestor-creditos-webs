-- ============================================
-- 📊 MONITOREO DE REGISTROS - CAMPAÑA GOOGLE ADS
-- ============================================
-- Usa estas queries para monitorear tus registros en tiempo real
-- Ejecuta las que necesites en el SQL Editor de Supabase

-- ============================================
-- ✅ QUERY PRINCIPAL: SOLO REGISTROS EXITOSOS (SIN ERRORES)
-- ============================================
-- Esta query muestra SOLO los registros que están bien (los que funcionan correctamente)
-- Perfecto para verificar tus 13 registros de Google Ads
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  p.subscription_status as estado_suscripcion,
  -- Contar actividad del usuario
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  -- Estado (siempre será OK porque filtramos solo los que están bien)
  CASE 
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 🔥 QUERY ALTERNATIVA: TODOS LOS REGISTROS (INCLUYE ERRORES)
-- ============================================
-- Usa esta si quieres ver también los que tienen problemas
/*
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  p.subscription_status as estado_suscripcion,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR: Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ ERROR: Sin plan'
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 50;
*/

-- ============================================
-- 📈 ESTADÍSTICAS DE REGISTROS
-- ============================================
-- Ver cuántos registros tienes por día (útil para tu campaña)
SELECT 
  DATE(u.created_at) as fecha,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN p.id IS NOT NULL AND p.plan_id IS NOT NULL THEN 1 END) as registros_ok,
  COUNT(CASE WHEN p.id IS NULL OR p.plan_id IS NULL THEN 1 END) as registros_con_error,
  -- Actividad
  SUM((SELECT COUNT(*) FROM clientes WHERE user_id = u.id)) as total_clientes_creados,
  SUM((SELECT COUNT(*) FROM prestamos WHERE user_id = u.id)) as total_prestamos_creados
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(u.created_at)
ORDER BY fecha DESC;

-- ============================================
-- 🚨 DETECTAR PROBLEMAS
-- ============================================
-- Usuarios que se registraron pero tienen problemas
SELECT 
  u.email,
  u.created_at as fecha_registro,
  CASE 
    WHEN p.id IS NULL THEN '❌ Perfil no creado'
    WHEN p.plan_id IS NULL THEN '❌ Plan no asignado'
    ELSE 'Desconocido'
  END as problema
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL OR p.plan_id IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 📊 RESUMEN GENERAL
-- ============================================
SELECT 
  'Total Usuarios Registrados' as metrica,
  COUNT(*) as valor
FROM auth.users
UNION ALL
SELECT 
  'Usuarios con Perfil OK',
  COUNT(*)
FROM profiles
WHERE plan_id IS NOT NULL
UNION ALL
SELECT 
  'Usuarios con Problemas',
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL OR p.plan_id IS NULL)
UNION ALL
SELECT 
  'Usuarios Activos (con préstamos)',
  COUNT(DISTINCT user_id)
FROM prestamos
UNION ALL
SELECT 
  'Usuarios de Pago',
  COUNT(*)
FROM profiles p
JOIN planes pl ON p.plan_id = pl.id
WHERE pl.slug != 'free'
UNION ALL
SELECT 
  'Usuarios Gratuitos',
  COUNT(*)
FROM profiles p
JOIN planes pl ON p.plan_id = pl.id
WHERE pl.slug = 'free';

-- ============================================
-- 🎯 CONVERSIONES DE TU CAMPAÑA
-- ============================================
-- Ver qué porcentaje de usuarios realmente usa la plataforma
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN clientes > 0 THEN 1 END) as usuarios_que_crearon_clientes,
  COUNT(CASE WHEN prestamos > 0 THEN 1 END) as usuarios_que_crearon_prestamos,
  ROUND(
    100.0 * COUNT(CASE WHEN clientes > 0 THEN 1 END) / COUNT(*),
    2
  ) as porcentaje_activacion,
  ROUND(
    100.0 * COUNT(CASE WHEN prestamos > 0 THEN 1 END) / COUNT(*),
    2
  ) as porcentaje_conversion
FROM (
  SELECT 
    u.id,
    (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes,
    (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos
  FROM auth.users u
  WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
) stats;

-- ============================================
-- ⏰ REGISTROS EXITOSOS DE LAS ÚLTIMAS 24 HORAS
-- ============================================
-- Solo los registros que están bien (sin errores)
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name,
  pl.nombre as plan,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  '✅ OK' as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE u.created_at >= NOW() - INTERVAL '24 hours'
  AND p.id IS NOT NULL 
  AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 📊 CONTAR REGISTROS EXITOSOS TOTALES
-- ============================================
-- Cuenta cuántos registros tienes que están funcionando correctamente
SELECT 
  COUNT(*) as total_registros_exitosos,
  COUNT(CASE WHEN pl.slug = 'free' THEN 1 END) as usuarios_gratuitos,
  COUNT(CASE WHEN pl.slug != 'free' THEN 1 END) as usuarios_de_pago
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL;

-- ============================================
-- 💡 TIPS DE USO:
-- ============================================
-- 1. ✅ Usa la primera query (QUERY PRINCIPAL) para ver SOLO los registros exitosos
-- 2. ✅ Usa "CONTAR REGISTROS EXITOSOS TOTALES" para ver cuántos tienes funcionando
-- 3. ✅ Usa "REGISTROS EXITOSOS DE LAS ÚLTIMAS 24 HORAS" para monitorear tu campaña activa
-- 4. Si necesitas ver los que tienen errores, usa la query "DETECTAR PROBLEMAS"
-- 5. Si ves registros con "❌ ERROR", ejecuta el script de corrección
-- 6. Usa "ESTADÍSTICAS DE REGISTROS" para ver el rendimiento de tu campaña por día
-- 7. Revisa "CONVERSIONES DE TU CAMPAÑA" para ver qué % de usuarios realmente usa la app

-- ============================================
-- 🔄 AUTOMATIZAR MONITOREO (OPCIONAL)
-- ============================================
-- Si quieres recibir alertas cuando haya problemas, puedes crear esta función:
-- (Requiere configurar email notifications en Supabase)

/*
CREATE OR REPLACE FUNCTION check_registration_health()
RETURNS TABLE(problemas INTEGER, mensaje TEXT) AS $$
DECLARE
  problem_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO problem_count
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE p.id IS NULL OR p.plan_id IS NULL;
  
  IF problem_count > 0 THEN
    RETURN QUERY SELECT problem_count, 
      '⚠️ ALERTA: Hay ' || problem_count || ' usuarios con problemas de registro';
  ELSE
    RETURN QUERY SELECT 0, '✅ Todos los registros están OK';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Luego puedes ejecutar: SELECT * FROM check_registration_health();
*/

