-- Script para corregir la asignación automática del plan gratuito
-- Ejecuta esto en Supabase SQL Editor

-- 1. Actualizar el trigger para asignar el plan gratuito automáticamente
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
  
  -- Crear perfil con el plan gratuito asignado
  INSERT INTO public.profiles (id, email, full_name, plan_id, subscription_status)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    free_plan_id,
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurarse de que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Actualizar usuarios existentes que no tengan plan asignado
UPDATE profiles 
SET plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
    subscription_status = 'active'
WHERE plan_id IS NULL;

-- 4. Verificar que todos los usuarios tengan un plan asignado
-- Ejecuta esta query para verificar:
-- SELECT p.email, p.plan_id, pl.nombre as plan_nombre
-- FROM profiles p
-- LEFT JOIN planes pl ON p.plan_id = pl.id;

