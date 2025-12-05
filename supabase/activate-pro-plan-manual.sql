-- Script para activar manualmente el plan Pro después de crear profiles
-- REEMPLAZA 'tu_email@gmail.com' con tu email real

-- Paso 1: Buscar tu usuario y verificar que existe en profiles
SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan_actual,
  p.subscription_status
FROM public.profiles p
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE p.email = 'cobosx4@gmail.com';  -- REEMPLAZA con tu email

-- Paso 2: Obtener el ID del plan Pro
SELECT id, slug, nombre, limite_clientes, limite_prestamos
FROM public.planes
WHERE slug = 'pro';

-- Paso 3: ACTIVAR el plan Pro para tu usuario
-- IMPORTANTE: Esto activará el plan Pro mensual con 1 mes de duración
UPDATE public.profiles
SET 
  plan_id = (SELECT id FROM public.planes WHERE slug = 'pro' LIMIT 1),
  subscription_status = 'active',
  subscription_period = 'monthly',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '1 month',
  payment_method = 'hotmart',
  updated_at = NOW()
WHERE email = 'cobosx4@gmail.com';  -- REEMPLAZA con tu email

-- Paso 4: Verificar que se activó correctamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan_actual,
  pl.slug as plan_slug,
  p.subscription_status,
  p.subscription_period,
  p.subscription_start_date,
  p.subscription_end_date,
  p.payment_method
FROM public.profiles p
LEFT JOIN public.planes pl ON p.plan_id = pl.id
WHERE p.email = 'cobosx4@gmail.com';  -- REEMPLAZA con tu email

