-- =====================================================
-- ACTIVAR PLAN PROFESIONAL PARA: barriosyerson0@gmail.com
-- =====================================================
-- Este script actualiza manualmente la suscripción del usuario
-- al Plan Profesional ($19/mes) con cupón de descuento del 50%
-- Fecha de activación: Hoy
-- Fecha de vencimiento: 1 mes desde hoy

-- PASO 1: Verificar que el usuario existe
DO $$
DECLARE
  user_uuid UUID;
  pro_plan_id UUID;
  free_plan_id UUID;
BEGIN
  -- Buscar el ID del usuario
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'barriosyerson0@gmail.com';
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado con email: barriosyerson0@gmail.com';
  END IF;
  
  RAISE NOTICE 'Usuario encontrado: %', user_uuid;
  
  -- Buscar el ID del plan Profesional
  SELECT id INTO pro_plan_id
  FROM planes
  WHERE slug = 'pro'
  LIMIT 1;
  
  IF pro_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan Profesional no encontrado en la base de datos';
  END IF;
  
  RAISE NOTICE 'Plan Profesional encontrado: %', pro_plan_id;
  
  -- Buscar el ID del plan gratuito (por si acaso)
  SELECT id INTO free_plan_id
  FROM planes
  WHERE slug = 'free'
  LIMIT 1;
  
  -- PASO 2: Actualizar el perfil del usuario
  -- Calcular fechas de suscripción
  -- Inicio: Hoy
  -- Fin: 1 mes desde hoy (suscripción mensual)
  
  UPDATE profiles
  SET 
    plan_id = pro_plan_id,
    subscription_status = 'active',
    subscription_period = 'monthly',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '1 month',
    payment_method = 'hotmart',
    hotmart_subscription_id = COALESCE(
      hotmart_subscription_id, 
      'MANUAL_' || user_uuid::text || '_' || EXTRACT(EPOCH FROM NOW())::bigint
    ),
    updated_at = NOW()
  WHERE id = user_uuid;
  
  IF FOUND THEN
    RAISE NOTICE 'Perfil actualizado correctamente';
  ELSE
    -- Si no existe el perfil, crearlo
    INSERT INTO profiles (
      id,
      email,
      full_name,
      plan_id,
      subscription_status,
      subscription_period,
      subscription_start_date,
      subscription_end_date,
      payment_method,
      hotmart_subscription_id,
      created_at,
      updated_at
    )
    VALUES (
      user_uuid,
      'barriosyerson0@gmail.com',
      'barriosyerson0',
      pro_plan_id,
      'active',
      'monthly',
      NOW(),
      NOW() + INTERVAL '1 month',
      'hotmart',
      'MANUAL_' || user_uuid::text || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Perfil creado correctamente';
  END IF;
  
  -- PASO 3: Registrar el pago en el historial
  -- Monto: $9.50 (50% de descuento sobre $19)
  INSERT INTO pagos_suscripcion (
    user_id,
    plan_id,
    monto,
    moneda,
    periodo,
    metodo_pago,
    transaction_id,
    estado,
    fecha_pago,
    created_at
  )
  VALUES (
    user_uuid,
    pro_plan_id,
    9.50,  -- Monto con descuento del 50%
    'USD',
    'monthly',
    'hotmart',
    'COUPON_50_' || user_uuid::text || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    'completado',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Pago registrado: 9.50 USD (con cupon 50 por ciento descuento)';
  RAISE NOTICE 'Plan Profesional activado correctamente para barriosyerson0@gmail.com';
  
END $$;

-- PASO 4: Verificar que la actualización fue exitosa
SELECT 
  '=== VERIFICACIÓN POST-ACTIVACIÓN ===' as seccion,
  u.email,
  pl.nombre as plan_actual,
  pl.slug as plan_slug,
  p.subscription_status,
  p.subscription_start_date,
  p.subscription_end_date,
  p.payment_method,
  p.hotmart_subscription_id,
  CASE 
    WHEN pl.slug = 'pro' AND p.subscription_status = 'active'
    THEN 'ACTIVACION EXITOSA'
    ELSE 'REVISAR MANUALMENTE'
  END as resultado
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
JOIN public.planes pl ON p.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com';

-- PASO 5: Mostrar el último pago registrado
SELECT 
  '=== ÚLTIMO PAGO REGISTRADO ===' as seccion,
  ps.fecha_pago,
  ps.monto,
  ps.moneda,
  ps.periodo,
  ps.metodo_pago,
  ps.estado,
  pl.nombre as plan
FROM pagos_suscripcion ps
JOIN auth.users u ON ps.user_id = u.id
JOIN public.planes pl ON ps.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com'
ORDER BY ps.fecha_pago DESC
LIMIT 1;

