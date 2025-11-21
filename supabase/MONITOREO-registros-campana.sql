-- ============================================
-- 📊 MONITOREO DE REGISTROS - CAMPAÑA GOOGLE ADS
-- ============================================
-- Usa estas queries para monitorear tus registros en tiempo real
-- Ejecuta las que necesites en el SQL Editor de Supabase

-- ============================================
-- 🔥 QUERY PRINCIPAL: VER TODOS LOS REGISTROS RECIENTES
-- ============================================
-- Esta query muestra los últimos registros con toda la información importante
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  p.subscription_status as estado_suscripcion,
  -- Contar actividad del usuario
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  -- Estado general
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
-- ⏰ REGISTROS DE LAS ÚLTIMAS 24 HORAS
-- ============================================
-- Perfecto para monitorear tu campaña activa
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name,
  pl.nombre as plan,
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR'
    WHEN p.plan_id IS NULL THEN '❌ ERROR'
    ELSE '✅ OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE u.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;

-- ============================================
-- 💡 TIPS DE USO:
-- ============================================
-- 1. Ejecuta la primera query (QUERY PRINCIPAL) regularmente para ver todos los registros
-- 2. Si ves algún registro con "❌ ERROR", ejecuta el script de corrección
-- 3. Usa "ESTADÍSTICAS DE REGISTROS" para ver el rendimiento de tu campaña por día
-- 4. Revisa "CONVERSIONES DE TU CAMPAÑA" para ver qué % de usuarios realmente usa la app
-- 5. Monitorea "REGISTROS DE LAS ÚLTIMAS 24 HORAS" cuando tengas campaña activa

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

