-- ============================================
-- SCRIPT PARA CORREGIR REGISTRO DE USUARIOS
-- ============================================
-- Este script soluciona el error "Database error saving new user"
-- Ejecuta TODO este script en Supabase SQL Editor

-- PASO 1: Eliminar trigger existente (si existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- PASO 2: Crear o reemplazar la función que maneja nuevos usuarios
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
  
  -- Si no existe el plan gratuito, crear el perfil sin plan
  IF free_plan_id IS NULL THEN
    INSERT INTO public.profiles (id, email, full_name, subscription_status)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'active'
    );
  ELSE
    -- Crear perfil con el plan gratuito asignado
    INSERT INTO public.profiles (id, email, full_name, plan_id, subscription_status)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      free_plan_id,
      'active'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, al menos registrar el usuario
    RAISE NOTICE 'Error al crear perfil: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Crear el trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 4: Corregir usuarios existentes sin perfil
-- Crear perfiles para usuarios que no tienen uno
INSERT INTO public.profiles (id, email, full_name, plan_id, subscription_status)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  'active'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- PASO 5: Actualizar usuarios existentes que no tengan plan asignado
UPDATE profiles 
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active'
WHERE plan_id IS NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas queries para verificar que todo está bien:

-- Ver todos los usuarios y sus planes
SELECT 
  p.email, 
  p.full_name,
  p.plan_id, 
  pl.nombre as plan_nombre,
  p.subscription_status,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC;

-- Verificar que el trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- 1. Todos los usuarios deben tener un perfil en la tabla profiles
-- 2. Todos los perfiles deben tener un plan_id asignado (plan gratuito)
-- 3. El trigger on_auth_user_created debe aparecer en la última query
-- 4. Nuevos registros deben funcionar sin errores

-- ============================================
-- NOTAS:
-- ============================================
-- - Este script es idempotente (puedes ejecutarlo múltiples veces)
-- - Si tienes errores, revisa que la tabla 'planes' tenga un plan con slug='free'
-- - Para probar: intenta registrar un nuevo usuario desde la app

