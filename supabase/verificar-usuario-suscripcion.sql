-- =====================================================
-- VERIFICAR ESTADO DE SUSCRIPCIÓN DE UN USUARIO
-- =====================================================
-- Script rápido para ver el estado de cualquier usuario
-- =====================================================

-- Reemplaza con el email del usuario que quieres verificar
\set email 'wilsonortiz.embperu@gmail.com'

-- =====================================================
-- INFORMACIÓN COMPLETA DEL USUARIO
-- =====================================================

SELECT 
  '========================================' as separador,
  '👤 INFORMACIÓN DEL USUARIO' as seccion;

SELECT 
  p.email,
  p.full_name as nombre,
  p.created_at as fecha_registro,
  au.email_confirmed_at as email_confirmado,
  au.last_sign_in_at as ultimo_login
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- SUSCRIPCIÓN ACTUAL
-- =====================================================

SELECT 
  '========================================' as separador,
  '💳 SUSCRIPCIÓN ACTUAL' as seccion;

SELECT 
  pl.nombre as plan,
  pl.slug as plan_slug,
  pl.precio_mensual as precio_mensual_normal,
  pl.precio_anual as precio_anual_normal,
  p.subscription_status as estado,
  CASE 
    WHEN p.subscription_status = 'active' THEN '✅ ACTIVA'
    WHEN p.subscription_status = 'inactive' THEN '❌ INACTIVA'
    WHEN p.subscription_status = 'cancelled' THEN '🚫 CANCELADA'
    ELSE '❓ DESCONOCIDO'
  END as estado_visual,
  p.subscription_period as periodo,
  p.subscription_start_date as fecha_inicio,
  p.subscription_end_date as fecha_fin,
  CASE 
    WHEN p.subscription_end_date > NOW() THEN '✅ VIGENTE'
    WHEN p.subscription_end_date < NOW() THEN '⚠️ EXPIRADA'
    ELSE '❓ SIN FECHA FIN'
  END as vigencia,
  p.payment_method as metodo_pago,
  p.paypal_subscription_id as paypal_sub_id
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- LÍMITES DEL PLAN
-- =====================================================

SELECT 
  '========================================' as separador,
  '📊 LÍMITES DEL PLAN' as seccion;

SELECT 
  pl.nombre as plan,
  pl.limite_clientes as limite_clientes,
  pl.limite_prestamos as limite_prestamos,
  pl.limite_usuarios as limite_usuarios,
  pl.caracteristicas
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- HISTORIAL DE PAGOS
-- =====================================================

SELECT 
  '========================================' as separador,
  '💰 HISTORIAL DE PAGOS' as seccion;

SELECT 
  ps.fecha_pago,
  pl.nombre as plan,
  ps.monto,
  ps.moneda,
  ps.periodo,
  ps.metodo_pago,
  ps.transaction_id,
  ps.estado,
  CASE 
    WHEN ps.estado = 'completado' THEN '✅'
    WHEN ps.estado = 'pendiente' THEN '⏳'
    WHEN ps.estado = 'fallido' THEN '❌'
    WHEN ps.estado = 'reembolsado' THEN '↩️'
    ELSE '❓'
  END as estado_visual
FROM pagos_suscripcion ps
LEFT JOIN planes pl ON ps.plan_id = pl.id
WHERE ps.user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')
ORDER BY ps.fecha_pago DESC;

-- =====================================================
-- USO ACTUAL (Clientes y Préstamos)
-- =====================================================

SELECT 
  '========================================' as separador,
  '📈 USO ACTUAL' as seccion;

SELECT 
  (SELECT COUNT(*) FROM clientes WHERE user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')) as prestamos_creados,
  pl.limite_clientes,
  pl.limite_prestamos,
  CASE 
    WHEN (SELECT COUNT(*) FROM clientes WHERE user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')) >= pl.limite_clientes 
    THEN '⚠️ LÍMITE ALCANZADO'
    ELSE '✅ DISPONIBLE'
  END as estado_clientes,
  CASE 
    WHEN (SELECT COUNT(*) FROM prestamos WHERE user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')) >= pl.limite_prestamos 
    THEN '⚠️ LÍMITE ALCANZADO'
    ELSE '✅ DISPONIBLE'
  END as estado_prestamos
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- RESUMEN
-- =====================================================

SELECT 
  '========================================' as separador,
  '📋 RESUMEN' as seccion;

WITH user_data AS (
  SELECT 
    p.email,
    p.full_name,
    pl.nombre as plan,
    p.subscription_status,
    p.subscription_end_date,
    (SELECT COUNT(*) FROM pagos_suscripcion WHERE user_id = p.id) as total_pagos,
    (SELECT SUM(monto) FROM pagos_suscripcion WHERE user_id = p.id AND estado = 'completado') as total_pagado
  FROM profiles p
  LEFT JOIN planes pl ON p.plan_id = pl.id
  WHERE p.email = 'wilsonortiz.embperu@gmail.com'
)
SELECT 
  email,
  full_name,
  plan,
  subscription_status,
  CASE 
    WHEN subscription_status = 'active' AND subscription_end_date > NOW() THEN '✅ TODO CORRECTO'
    WHEN subscription_status = 'active' AND subscription_end_date < NOW() THEN '⚠️ SUSCRIPCIÓN EXPIRADA'
    WHEN subscription_status = 'inactive' THEN '❌ NECESITA ACTIVAR PLAN'
    ELSE '❓ REVISAR MANUALMENTE'
  END as diagnostico,
  total_pagos,
  COALESCE(total_pagado, 0) as total_pagado
FROM user_data;

