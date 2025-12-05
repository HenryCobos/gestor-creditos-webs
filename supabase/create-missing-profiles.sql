-- Script para crear profiles faltantes de usuarios registrados
-- Ejecutar en Supabase SQL Editor

-- Paso 1: Ver cuántos usuarios NO tienen profile
SELECT 
  COUNT(*) as usuarios_sin_profile,
  'Usuarios en auth.users sin profile en public.profiles' as descripcion
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Paso 2: Ver la lista de usuarios sin profile (para verificar)
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Paso 3: Obtener el ID del plan gratuito (lo necesitamos para el INSERT)
SELECT id, slug, nombre FROM public.planes WHERE slug = 'free';

-- Paso 4: CREAR los profiles faltantes
-- IMPORTANTE: Reemplaza 'PLAN_FREE_ID_AQUI' con el ID real del plan free del paso 3
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  plan_id,
  subscription_status,
  subscription_period,
  payment_method,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  (SELECT id FROM public.planes WHERE slug = 'free' LIMIT 1) as plan_id,
  'active' as subscription_status,
  'monthly' as subscription_period,
  NULL as payment_method,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Paso 5: Verificar que se crearon correctamente
SELECT 
  COUNT(*) as profiles_creados,
  'Profiles ahora en la base de datos' as descripcion
FROM public.profiles;

-- Paso 6: Verificar que ya no hay usuarios sin profile
SELECT 
  COUNT(*) as usuarios_sin_profile_restantes
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

