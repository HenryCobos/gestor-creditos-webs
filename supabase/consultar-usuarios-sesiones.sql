-- ============================================
-- CONSULTAR ESTADÍSTICAS DE USUARIOS Y SESIONES
-- ============================================
-- Ejecuta este script en Supabase SQL Editor para ver información de tus usuarios

-- ====================================
-- 1. RESUMEN GENERAL
-- ====================================
SELECT 
  '📊 RESUMEN GENERAL' as seccion,
  (SELECT COUNT(*) FROM auth.users) as total_usuarios_registrados,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at IS NOT NULL) as usuarios_con_sesion,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at IS NULL) as usuarios_sin_sesion,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours') as sesiones_ultimas_24h,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= NOW() - INTERVAL '7 days') as sesiones_ultima_semana,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= NOW() - INTERVAL '30 days') as sesiones_ultimo_mes;

-- ====================================
-- 2. USUARIOS CON INFORMACIÓN DETALLADA
-- ====================================
SELECT 
  '👥 USUARIOS DETALLADO' as seccion,
  au.email,
  p.full_name,
  au.created_at as fecha_registro,
  au.last_sign_in_at as ultimo_inicio_sesion,
  CASE 
    WHEN au.last_sign_in_at IS NULL THEN '❌ Nunca ha iniciado sesión'
    WHEN au.last_sign_in_at >= NOW() - INTERVAL '24 hours' THEN '🟢 Activo hoy'
    WHEN au.last_sign_in_at >= NOW() - INTERVAL '7 days' THEN '🟡 Activo esta semana'
    WHEN au.last_sign_in_at >= NOW() - INTERVAL '30 days' THEN '🟠 Activo este mes'
    ELSE '⚪ Inactivo más de 30 días'
  END as estado_actividad,
  au.confirmation_sent_at IS NOT NULL as email_verificado,
  pl.nombre as plan_actual,
  p.subscription_status as estado_suscripcion
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- ====================================
-- 3. ACTIVIDAD POR DÍAS
-- ====================================
SELECT 
  '📅 ACTIVIDAD POR DÍA' as seccion,
  DATE(last_sign_in_at) as fecha,
  COUNT(*) as inicios_sesion
FROM auth.users
WHERE last_sign_in_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_sign_in_at)
ORDER BY fecha DESC;

-- ====================================
-- 4. USUARIOS POR PLAN
-- ====================================
SELECT 
  '💼 USUARIOS POR PLAN' as seccion,
  COALESCE(pl.nombre, 'Sin plan') as plan,
  COUNT(*) as cantidad_usuarios,
  COUNT(CASE WHEN au.last_sign_in_at IS NOT NULL THEN 1 END) as usuarios_con_sesion,
  COUNT(CASE WHEN au.last_sign_in_at >= NOW() - INTERVAL '30 days' THEN 1 END) as activos_ultimo_mes
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
GROUP BY pl.nombre
ORDER BY cantidad_usuarios DESC;

-- ====================================
-- 5. USUARIOS INACTIVOS (Nunca iniciaron sesión)
-- ====================================
SELECT 
  '⚠️ USUARIOS QUE NUNCA INICIARON SESIÓN' as seccion,
  au.email,
  p.full_name,
  au.created_at as fecha_registro,
  NOW()::date - au.created_at::date as dias_desde_registro
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.last_sign_in_at IS NULL
ORDER BY au.created_at DESC;

-- ====================================
-- 6. USUARIOS MÁS ACTIVOS
-- ====================================
SELECT 
  '🏆 USUARIOS MÁS ACTIVOS (Últimos inicios de sesión)' as seccion,
  au.email,
  p.full_name,
  au.last_sign_in_at as ultimo_inicio,
  NOW() - au.last_sign_in_at as tiempo_desde_ultima_sesion,
  pl.nombre as plan
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE au.last_sign_in_at IS NOT NULL
ORDER BY au.last_sign_in_at DESC
LIMIT 20;

