-- Script SQL para activar manualmente el plan de un usuario
-- Ejecuta este script en Supabase SQL Editor
-- 
-- USO: Reemplaza 'credifast365@outlook.com' con el email del usuario
--      Ajusta el planSlug si es necesario ('pro', 'business', 'enterprise')
--      Ajusta el periodo si es necesario ('monthly', 'yearly')
--      Ajusta el monto si es necesario (9.5 para plan pro con 50% descuento)

DO $$
DECLARE
  target_email TEXT := 'credifast365@outlook.com';
  plan_slug TEXT := 'pro';
  period_var TEXT := 'monthly';
  payment_amount DECIMAL(10, 2) := 9.5;
  
  user_id_var UUID;
  plan_id_var UUID;
  start_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
  plan_nombre_var TEXT;
BEGIN
  -- Buscar el usuario por email
  SELECT id INTO user_id_var
  FROM profiles
  WHERE email = target_email;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado con email: %', target_email;
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado: %', user_id_var;
  
  -- Buscar el plan
  SELECT id, nombre INTO plan_id_var, plan_nombre_var
  FROM planes
  WHERE slug = plan_slug;
  
  IF plan_id_var IS NULL THEN
    RAISE EXCEPTION 'Plan no encontrado con slug: %', plan_slug;
  END IF;
  
  RAISE NOTICE '✅ Plan encontrado: % (%)', plan_nombre_var, plan_slug;
  
  -- Calcular fechas
  start_date := NOW();
  IF period_var = 'monthly' THEN
    end_date := start_date + INTERVAL '1 month';
  ELSE
    end_date := start_date + INTERVAL '1 year';
  END IF;
  
  RAISE NOTICE '📅 Fecha inicio: %', start_date;
  RAISE NOTICE '📅 Fecha fin: %', end_date;
  
  -- Actualizar perfil
  UPDATE profiles
  SET
    plan_id = plan_id_var,
    subscription_status = 'active',
    subscription_period = period_var,
    subscription_start_date = start_date,
    subscription_end_date = end_date,
    payment_method = 'hotmart',
    updated_at = NOW()
  WHERE id = user_id_var;
  
  RAISE NOTICE '✅ Perfil actualizado correctamente';
  
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
    user_id_var,
    plan_id_var,
    payment_amount,
    'USD',
    period_var,
    'hotmart',
    'manual_activation_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'completado',
    start_date
  );
  
  RAISE NOTICE '✅ Pago registrado: $% USD', payment_amount;
  
  -- Verificar actualización
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verificación:';
  
  PERFORM 
    p.id,
    pl.nombre as plan_nombre,
    p.subscription_status,
    p.subscription_end_date
  FROM profiles p
  JOIN planes pl ON p.plan_id = pl.id
  WHERE p.id = user_id_var;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Activación completada exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE '   Usuario: %', target_email;
  RAISE NOTICE '   Plan: % (%)', plan_nombre_var, period_var;
  RAISE NOTICE '   Monto: $% USD', payment_amount;
  RAISE NOTICE '   Válido hasta: %', end_date;
  
END $$;

-- Verificación final (opcional - descomenta para ver el resultado)
-- SELECT 
--   p.email,
--   pl.nombre as plan_actual,
--   p.subscription_status,
--   p.subscription_period,
--   p.subscription_end_date,
--   p.payment_method
-- FROM profiles p
-- JOIN planes pl ON p.plan_id = pl.id
-- WHERE p.email = 'credifast365@outlook.com';

