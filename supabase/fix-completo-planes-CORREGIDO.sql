-- =====================================================
-- SCRIPT COMPLETO Y DEFINITIVO PARA ARREGLAR PLANES
-- =====================================================
-- Version CORREGIDA - Sin errores de sintaxis
-- Ejecuta TODO este script de una sola vez en Supabase SQL Editor

-- PASO 1: Verificar que existe el plan gratuito
DO $$
DECLARE
  free_plan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO free_plan_count FROM planes WHERE slug = 'free';
  
  IF free_plan_count = 0 THEN
    RAISE EXCEPTION 'ERROR: No existe el plan gratuito. Crea un plan con slug=free primero.';
  ELSE
    RAISE NOTICE 'Plan gratuito encontrado';
  END IF;
END $$;

-- PASO 2: Eliminar trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- PASO 3: Crear función mejorada del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan gratuito
  SELECT id INTO free_plan_id
  FROM planes
  WHERE slug = 'free'
  LIMIT 1;
  
  -- Si no existe el plan gratuito, registrar error
  IF free_plan_id IS NULL THEN
    RAISE WARNING 'No se encontró el plan gratuito (slug: free)';
    RETURN NEW;
  END IF;

  -- Crear o actualizar perfil con plan gratuito
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    plan_id, 
    subscription_status,
    subscription_period,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    free_plan_id,
    'active',
    'monthly',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    plan_id = COALESCE(profiles.plan_id, EXCLUDED.plan_id),
    subscription_status = COALESCE(profiles.subscription_status, 'active'),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al crear perfil para usuario %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 5: Crear perfiles faltantes para usuarios sin perfil
INSERT INTO public.profiles (id, email, full_name, plan_id, subscription_status, subscription_period, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  'active',
  'monthly',
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- PASO 6: Actualizar perfiles existentes sin plan al plan gratuito
UPDATE profiles 
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active',
  subscription_period = 'monthly',
  updated_at = NOW()
WHERE plan_id IS NULL 
   OR plan_id NOT IN (SELECT id FROM planes);

-- PASO 7: Actualizar perfiles que tienen plan incorrecto (sin método de pago)
UPDATE profiles
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active',
  subscription_period = 'monthly',
  updated_at = NOW()
WHERE 
  (payment_method IS NULL OR payment_method = '') 
  AND (paypal_subscription_id IS NULL OR paypal_subscription_id = '')
  AND plan_id != (SELECT id FROM planes WHERE slug = 'free' LIMIT 1);

-- =====================================================
-- VERIFICACION COMPLETA
-- =====================================================

-- Ver todos los usuarios y sus planes
SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  p.subscription_status,
  p.payment_method,
  p.paypal_subscription_id,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC
LIMIT 20;

-- Estadisticas
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(plan_id) as usuarios_con_plan,
  COUNT(*) - COUNT(plan_id) as usuarios_sin_plan,
  COUNT(CASE WHEN pl.slug = 'free' THEN 1 END) as usuarios_plan_gratuito,
  COUNT(CASE WHEN pl.slug != 'free' THEN 1 END) as usuarios_plan_pago
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id;

-- Verificar trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Todos los usuarios deben tener plan_nombre
-- Usuarios sin payment_method deben tener plan "Gratuito"
-- usuarios_sin_plan debe ser 0
-- Trigger debe aparecer en la ultima query
-- =====================================================

