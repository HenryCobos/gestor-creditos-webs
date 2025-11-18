-- ⚠️ URGENTE: Corregir usuarios con plan incorrecto
-- Este script corrige usuarios que tienen el plan "Profesional" asignado sin haber pagado

-- PASO 1: Ver cuál es el problema actual
SELECT 
  p.id,
  p.email,
  p.full_name,
  pl.nombre as plan_actual,
  pl.slug as plan_slug,
  p.payment_method,
  p.paypal_subscription_id,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE p.payment_method IS NULL OR p.paypal_subscription_id IS NULL
ORDER BY p.created_at DESC;

-- PASO 2: Corregir TODOS los usuarios sin método de pago al plan gratuito
-- (Estos usuarios nunca pagaron, así que deben estar en plan gratuito)
UPDATE profiles
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active',
  subscription_period = 'monthly'
WHERE (payment_method IS NULL OR paypal_subscription_id IS NULL)
  AND plan_id != (SELECT id FROM planes WHERE slug = 'free' LIMIT 1);

-- PASO 3: Verificar la corrección
SELECT 
  p.id,
  p.email,
  pl.nombre as plan_corregido,
  pl.slug as plan_slug
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC
LIMIT 10;

-- PASO 4: Recrear el trigger para asegurar que funcione correctamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recrear la función del trigger
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

  -- Si no existe el plan gratuito, loguear error
  IF free_plan_id IS NULL THEN
    RAISE WARNING 'No se encontró el plan gratuito (slug: free)';
    RETURN NEW;
  END IF;

  -- Crear perfil con el plan gratuito asignado
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    plan_id, 
    subscription_status,
    subscription_period
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    free_plan_id,  -- ✅ SIEMPRE plan gratuito
    'active',
    'monthly'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    plan_id = COALESCE(profiles.plan_id, free_plan_id),
    subscription_status = COALESCE(profiles.subscription_status, 'active');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al crear perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 5: Verificar que el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- PASO 6: Verificar que todos los usuarios tienen plan asignado
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(plan_id) as usuarios_con_plan,
  COUNT(*) - COUNT(plan_id) as usuarios_sin_plan
FROM profiles;

-- ✅ RESULTADO ESPERADO:
-- - Todos los usuarios nuevos (sin payment_method) deben tener plan "Gratuito"
-- - El trigger debe estar activo
-- - usuarios_sin_plan debe ser 0

