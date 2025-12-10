-- =====================================================
-- ACTIVAR SUSCRIPCIÓN MANUALMENTE
-- =====================================================
-- Para usuarios que compraron pero no se activó automáticamente
-- =====================================================

-- PASO 1: Buscar el usuario
SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan_actual,
  p.subscription_status,
  p.subscription_period,
  p.subscription_start_date,
  p.payment_method,
  p.paypal_subscription_id
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- PASO 2: Ver los planes disponibles
-- =====================================================

SELECT 
  id,
  nombre,
  slug,
  precio_mensual,
  precio_anual,
  activo
FROM planes
ORDER BY orden;

-- =====================================================
-- PASO 3: ACTIVAR PLAN PROFESIONAL MENSUAL
-- =====================================================
-- Usuario compró Plan Pro Mensual con 50% OFF
-- Precio normal: $19/mes → Con descuento: $9.50/mes

DO $$
DECLARE
  v_user_id UUID;
  v_plan_pro_id UUID;
  v_fecha_inicio TIMESTAMP WITH TIME ZONE;
  v_fecha_fin TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener el user_id
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'wilsonortiz.embperu@gmail.com';

  -- Obtener el ID del plan Pro
  SELECT id INTO v_plan_pro_id
  FROM planes
  WHERE slug = 'pro';

  -- Fechas
  v_fecha_inicio := NOW();
  v_fecha_fin := NOW() + INTERVAL '1 month'; -- Válido por 1 mes

  -- Actualizar el perfil del usuario
  UPDATE profiles
  SET 
    plan_id = v_plan_pro_id,
    subscription_status = 'active',
    subscription_period = 'monthly',
    subscription_start_date = v_fecha_inicio,
    subscription_end_date = v_fecha_fin,
    payment_method = 'paypal',
    paypal_subscription_id = 'MANUAL_ACTIVATION_' || v_user_id::text,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Registrar el pago en el historial
  INSERT INTO pagos_suscripcion (
    user_id,
    plan_id,
    monto,
    moneda,
    periodo,
    metodo_pago,
    transaction_id,
    estado,
    fecha_pago
  ) VALUES (
    v_user_id,
    v_plan_pro_id,
    9.50, -- Precio con 50% OFF
    'USD',
    'monthly',
    'paypal',
    'MANUAL_' || EXTRACT(EPOCH FROM NOW())::text,
    'completado',
    NOW()
  );

  RAISE NOTICE '✅ Suscripción activada correctamente para: wilsonortiz.embperu@gmail.com';
  RAISE NOTICE 'Plan: Profesional Mensual';
  RAISE NOTICE 'Precio pagado: $9.50 (50%% OFF)';
  RAISE NOTICE 'Fecha inicio: %', v_fecha_inicio;
  RAISE NOTICE 'Fecha fin: %', v_fecha_fin;
END $$;

-- =====================================================
-- PASO 4: VERIFICAR QUE SE ACTIVÓ CORRECTAMENTE
-- =====================================================

SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan,
  pl.precio_mensual as precio_normal,
  p.subscription_status as estado,
  p.subscription_period as periodo,
  p.subscription_start_date as inicio,
  p.subscription_end_date as fin,
  p.payment_method as metodo_pago,
  pl.limite_clientes,
  pl.limite_prestamos
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.email = 'wilsonortiz.embperu@gmail.com';

-- =====================================================
-- PASO 5: VER EL HISTORIAL DE PAGOS
-- =====================================================

SELECT 
  ps.id,
  ps.monto,
  ps.moneda,
  ps.periodo,
  ps.metodo_pago,
  ps.transaction_id,
  ps.estado,
  ps.fecha_pago,
  pl.nombre as plan
FROM pagos_suscripcion ps
LEFT JOIN planes pl ON ps.plan_id = pl.id
WHERE ps.user_id = (SELECT id FROM profiles WHERE email = 'wilsonortiz.embperu@gmail.com')
ORDER BY ps.fecha_pago DESC;

-- =====================================================
-- INFORMACIÓN ADICIONAL
-- =====================================================

-- El usuario ahora tiene:
-- ✅ Plan Profesional Mensual activo
-- ✅ Límite de 50 clientes
-- ✅ Límite de 50 préstamos
-- ✅ Exportar PDF
-- ✅ Sin marca de agua
-- ✅ Soporte 24h
-- ✅ Válido por 1 mes desde hoy

-- La suscripción expira en 1 mes
-- Después de eso, necesitará renovar

-- =====================================================
-- PARA ACTIVAR OTRO USUARIO
-- =====================================================

-- Simplemente reemplaza el email en los pasos anteriores:
-- WHERE email = 'nuevo-email@ejemplo.com'

-- Y ajusta el plan según lo que compró:
-- - Plan Pro: slug = 'pro'
-- - Plan Business: slug = 'business'
-- - Plan Enterprise: slug = 'enterprise'

-- Y el período:
-- - Mensual: 'monthly', duración 1 month
-- - Anual: 'yearly', duración 1 year

