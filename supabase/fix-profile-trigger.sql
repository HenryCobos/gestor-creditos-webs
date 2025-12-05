-- Script para verificar y corregir el trigger que crea profiles automáticamente
-- Este trigger debe ejecutarse cuando un nuevo usuario se registra

-- Paso 1: Ver si existe el trigger
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%profile%' OR trigger_name LIKE '%user%';

-- Paso 2: Ver si existe la función que crea el profile
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%profile%' OR routine_name LIKE '%user%');

-- Paso 3: CREAR O REEMPLAZAR la función que crea profiles automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Obtener el ID del plan gratuito
  SELECT id INTO free_plan_id
  FROM public.planes
  WHERE slug = 'free'
  LIMIT 1;

  -- Si no existe el plan free, usar NULL (pero esto no debería pasar)
  IF free_plan_id IS NULL THEN
    RAISE WARNING 'Plan FREE no encontrado. Creando profile sin plan.';
  END IF;

  -- Crear el profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    plan_id,
    subscription_status,
    subscription_period,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    free_plan_id,
    'active',
    'monthly',
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando profile para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 4: ELIMINAR el trigger viejo si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Paso 5: CREAR el nuevo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Paso 6: Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Paso 7: Dar permisos necesarios
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

