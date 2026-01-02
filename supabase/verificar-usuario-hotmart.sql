-- =====================================================
-- SCRIPT PARA VERIFICAR SUSCRIPCIÓN DE USUARIO CON HOTMART
-- =====================================================
-- Busca y muestra toda la información de suscripción del usuario
-- Email: angeldz1985.aidp@gmail.com

-- PASO 1: Buscar el usuario y su información completa
SELECT 
  -- Información del usuario
  u.id as user_id,
  u.email,
  u.created_at as usuario_creado,
  
  -- Información del perfil
  p.full_name,
  p.created_at as perfil_creado,
  p.updated_at as perfil_actualizado,
  
  -- Información del plan
  pl.id as plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.precio_mensual,
  pl.precio_anual,
  pl.limite_clientes,
  pl.limite_prestamos,
  pl.limite_usuarios,
  pl.caracteristicas as beneficios_plan,
  
  -- Estado de la suscripción
  p.subscription_status,
  p.subscription_period,
  p.subscription_start_date,
  p.subscription_end_date,
  p.hotmart_subscription_id,
  p.payment_method,
  
  -- Verificar si la suscripción está activa
  CASE 
    WHEN p.subscription_status = 'active' AND 
         (p.subscription_end_date IS NULL OR p.subscription_end_date > NOW()) 
    THEN '✅ ACTIVA'
    WHEN p.subscription_status = 'active' AND p.subscription_end_date <= NOW()
    THEN '⚠️ EXPIRADA'
    WHEN p.subscription_status = 'cancelled'
    THEN '❌ CANCELADA'
    ELSE '❓ DESCONOCIDO'
  END as estado_suscripcion,
  
  -- Días restantes (si aplica)
  CASE 
    WHEN p.subscription_end_date IS NOT NULL AND p.subscription_end_date > NOW()
    THEN EXTRACT(DAY FROM (p.subscription_end_date - NOW()))::INTEGER
    ELSE NULL
  END as dias_restantes

FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'angeldz1985.aidp@gmail.com';

-- PASO 2: Verificar pagos registrados en el historial
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
JOIN public.planes pl ON ps.plan_id = pl.id
WHERE u.email = 'angeldz1985.aidp@gmail.com'
ORDER BY ps.fecha_pago DESC;

-- PASO 3: Verificar uso actual vs límites del plan
SELECT 
  u.email,
  pl.nombre as plan_actual,
  pl.limite_clientes,
  pl.limite_prestamos,
  pl.limite_usuarios,
  
  -- Uso actual
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_actuales,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_actuales,
  
  -- Verificar si está dentro de los límites
  CASE 
    WHEN pl.limite_clientes = 0 THEN '✅ ILIMITADO'
    WHEN (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) < pl.limite_clientes 
    THEN '✅ DENTRO DEL LÍMITE'
    ELSE '⚠️ LÍMITE ALCANZADO'
  END as estado_clientes,
  
  CASE 
    WHEN pl.limite_prestamos = 0 THEN '✅ ILIMITADO'
    WHEN (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) < pl.limite_prestamos 
    THEN '✅ DENTRO DEL LÍMITE'
    ELSE '⚠️ LÍMITE ALCANZADO'
  END as estado_prestamos

FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'angeldz1985.aidp@gmail.com';

-- PASO 4: Resumen de verificación (TODO EN UNO)
SELECT 
  '=== RESUMEN DE VERIFICACIÓN ===' as seccion,
  u.email,
  CASE 
    WHEN pl.slug = 'pro' THEN '✅ Plan Profesional ($19/mes)'
    WHEN pl.slug = 'business' THEN '✅ Plan Business ($49/mes)'
    WHEN pl.slug = 'enterprise' THEN '✅ Plan Enterprise ($179/mes)'
    WHEN pl.slug = 'free' THEN '❌ Plan Gratuito (NO PAGÓ)'
    ELSE '❓ Plan Desconocido'
  END as plan_verificado,
  
  CASE 
    WHEN p.subscription_status = 'active' AND 
         (p.subscription_end_date IS NULL OR p.subscription_end_date > NOW()) 
    THEN '✅ SUSCRIPCIÓN ACTIVA'
    ELSE '❌ SUSCRIPCIÓN NO ACTIVA'
  END as estado_final,
  
  p.hotmart_subscription_id as id_suscripcion_hotmart,
  p.subscription_start_date as fecha_inicio,
  p.subscription_end_date as fecha_fin,
  
  CASE 
    WHEN p.payment_method = 'hotmart' THEN '✅ Método de pago: Hotmart'
    ELSE '⚠️ Método de pago: ' || COALESCE(p.payment_method, 'NO REGISTRADO')
  END as metodo_pago,
  
  (SELECT COUNT(*) FROM pagos_suscripcion WHERE user_id = u.id) as total_pagos_registrados,
  
  CASE 
    WHEN pl.slug = 'pro' AND p.subscription_status = 'active' 
    THEN '✅ TODO CORRECTO: Usuario tiene Plan Profesional activo'
    WHEN pl.slug != 'pro' 
    THEN '❌ PROBLEMA: Usuario NO tiene Plan Profesional'
    WHEN p.subscription_status != 'active'
    THEN '❌ PROBLEMA: Suscripción no está activa'
    ELSE '⚠️ REVISAR MANUALMENTE'
  END as conclusion

FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'angeldz1985.aidp@gmail.com';

