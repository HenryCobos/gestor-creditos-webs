-- ============================================
-- 🚀 SCRIPT COMPLETO: CORREGIR REGISTROS DE USUARIOS
-- ============================================
-- Este script asegura que todos los registros funcionen correctamente
-- Especialmente para usuarios que llegan de Google Ads
-- Ejecuta TODO este script en Supabase SQL Editor

-- ============================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ============================================
-- Ver usuarios sin perfil (PROBLEMA)
SELECT 
  'Usuarios sin perfil' as problema,
  COUNT(*) as cantidad
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Ver perfiles sin plan asignado (PROBLEMA)
SELECT 
  'Perfiles sin plan' as problema,
  COUNT(*) as cantidad
FROM profiles
WHERE plan_id IS NULL;

-- ============================================
-- PASO 2: VERIFICAR QUE EXISTE PLAN GRATUITO
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM planes WHERE slug = 'free') THEN
    RAISE EXCEPTION 'ERROR CRÍTICO: No existe el plan gratuito. Ejecuta schema-subscriptions.sql primero';
  END IF;
  RAISE NOTICE '✅ Plan gratuito existe correctamente';
END $$;

-- ============================================
-- PASO 3: ELIMINAR TRIGGER VIEJO Y CREAR NUEVO
-- ============================================
-- Eliminar trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear función mejorada que SIEMPRE asigna plan gratuito
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
  
  -- Si no existe el plan gratuito, lanzar error
  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan gratuito no encontrado. No se puede crear el perfil.';
  END IF;
  
  -- Crear perfil con el plan gratuito asignado
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    plan_id, 
    subscription_status,
    subscription_period
  ) VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    free_plan_id,
    'active',
    'monthly'
  );
  
  RAISE NOTICE '✅ Perfil creado correctamente para: %', NEW.email;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Si el perfil ya existe, no hacer nada
    RAISE NOTICE '⚠️ Perfil ya existe para: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Registrar cualquier otro error pero permitir que el usuario se cree
    RAISE WARNING '❌ Error al crear perfil para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 4: CORREGIR USUARIOS EXISTENTES
-- ============================================
-- Obtener el ID del plan gratuito
DO $$
DECLARE
  free_plan_id UUID;
  fixed_count INTEGER := 0;
BEGIN
  SELECT id INTO free_plan_id FROM planes WHERE slug = 'free' LIMIT 1;
  
  -- Crear perfiles para usuarios que no tienen uno
  INSERT INTO public.profiles (id, email, full_name, plan_id, subscription_status, subscription_period)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    free_plan_id,
    'active',
    'monthly'
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Creados % perfiles faltantes', fixed_count;
  
  -- Actualizar perfiles existentes que no tengan plan asignado
  UPDATE profiles 
  SET 
    plan_id = free_plan_id,
    subscription_status = 'active',
    subscription_period = 'monthly'
  WHERE plan_id IS NULL;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Actualizados % perfiles sin plan', fixed_count;
END $$;

-- ============================================
-- PASO 5: VERIFICACIÓN FINAL
-- ============================================
-- Verificar que NO haya usuarios sin perfil
DO $$
DECLARE
  users_without_profile INTEGER;
  profiles_without_plan INTEGER;
BEGIN
  -- Contar usuarios sin perfil
  SELECT COUNT(*) INTO users_without_profile
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  -- Contar perfiles sin plan
  SELECT COUNT(*) INTO profiles_without_plan
  FROM profiles
  WHERE plan_id IS NULL;
  
  -- Mostrar resultados
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ VERIFICACIÓN FINAL';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Usuarios sin perfil: %', users_without_profile;
  RAISE NOTICE 'Perfiles sin plan: %', profiles_without_plan;
  
  IF users_without_profile = 0 AND profiles_without_plan = 0 THEN
    RAISE NOTICE '✅✅✅ TODO CORRECTO - Sistema listo para registros';
  ELSE
    RAISE WARNING '⚠️ AÚN HAY PROBLEMAS - Revisar logs arriba';
  END IF;
END $$;

-- Ver todos los usuarios con sus planes (para verificación manual)
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name,
  pl.nombre as plan,
  p.subscription_status,
  CASE 
    WHEN p.id IS NULL THEN '❌ Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ Sin plan'
    ELSE '✅ OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 20;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Usuarios sin perfil: 0
-- ✅ Perfiles sin plan: 0
-- ✅ Todos los usuarios deben mostrar estado "✅ OK"
-- ✅ Todos deben tener el plan "Gratuito" asignado

-- ============================================
-- SIGUIENTE PASO:
-- ============================================
-- Probar registrando un nuevo usuario desde tu landing page
-- El usuario debe:
-- 1. Registrarse exitosamente
-- 2. Poder iniciar sesión
-- 3. Ver el dashboard con límites del plan gratuito (5 clientes, 5 préstamos)

