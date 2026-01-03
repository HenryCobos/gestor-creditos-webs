-- =====================================================
-- VERIFICAR ESTADO DEL USUARIO: barriosyerson0@gmail.com
-- =====================================================

-- PASO 1: Información completa del usuario
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as usuario_creado,
  p.full_name,
  p.created_at as perfil_creado,
  p.updated_at as perfil_actualizado,
  pl.id as plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.precio_mensual,
  pl.precio_anual,
  p.subscription_status,
  p.subscription_period,
  p.subscription_start_date,
  p.subscription_end_date,
  p.hotmart_subscription_id,
  p.payment_method,
  CASE 
    WHEN p.subscription_status = 'active' AND 
         (p.subscription_end_date IS NULL OR p.subscription_end_date > NOW()) 
    THEN '✅ ACTIVA'
    WHEN p.subscription_status = 'active' AND p.subscription_end_date <= NOW()
    THEN '⚠️ EXPIRADA'
    WHEN p.subscription_status = 'cancelled'
    THEN '❌ CANCELADA'
    ELSE '❓ DESCONOCIDO'
  END as estado_suscripcion
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com';

-- PASO 2: Historial de pagos
SELECT 
  ps.id,
  ps.fecha_pago,
  ps.monto,
  ps.moneda,
  ps.periodo,
  ps.metodo_pago,
  ps.estado,
  ps.transaction_id,
  pl.nombre as plan_pagado,
  pl.slug as plan_slug
FROM pagos_suscripcion ps
JOIN auth.users u ON ps.user_id = u.id
LEFT JOIN public.planes pl ON ps.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com'
ORDER BY ps.fecha_pago DESC;

-- PASO 3: Resumen y diagnóstico
SELECT 
  '=== DIAGNÓSTICO ===' as seccion,
  u.email,
  CASE 
    WHEN pl.slug = 'pro' THEN '✅ Plan Profesional'
    WHEN pl.slug = 'business' THEN 'Plan Business'
    WHEN pl.slug = 'enterprise' THEN 'Plan Enterprise'
    WHEN pl.slug = 'free' THEN '❌ Plan Gratuito (PROBLEMA)'
    ELSE '❓ Plan Desconocido'
  END as plan_actual,
  p.subscription_status as estado,
  p.hotmart_subscription_id,
  (SELECT COUNT(*) FROM pagos_suscripcion WHERE user_id = u.id) as total_pagos,
  CASE 
    WHEN pl.slug != 'pro' THEN '❌ NECESITA ACTUALIZACIÓN: Usuario debe tener Plan Profesional'
    WHEN p.subscription_status != 'active' THEN '❌ NECESITA ACTIVACIÓN: Suscripción no está activa'
    ELSE '✅ TODO CORRECTO'
  END as accion_requerida
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com';

