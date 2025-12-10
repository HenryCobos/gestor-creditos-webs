-- =====================================================
-- SCRIPT PARA ELIMINAR USUARIOS DE PRUEBA CORRECTAMENTE
-- =====================================================
-- Este script elimina usuarios de TODAS las tablas relacionadas
-- incluyendo auth.users, profiles, email_campaigns, etc.
-- =====================================================

-- PASO 1: Arreglar la foreign key de profiles para incluir ON DELETE CASCADE
-- Esto permitirá que cuando se elimine de auth.users, también se elimine de profiles

-- Primero, eliminar la constraint existente
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Recrear con ON DELETE CASCADE
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- =====================================================
-- PASO 2: Función para eliminar un usuario por email
-- =====================================================

CREATE OR REPLACE FUNCTION delete_user_by_email(user_email TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_user_id UUID
) AS $$
DECLARE
  v_user_id UUID;
  v_profile_exists BOOLEAN;
  v_email_campaign_exists BOOLEAN;
BEGIN
  -- Buscar el user_id en auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;

  -- Si no existe el usuario
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado con email: ' || user_email, NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si existe en profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;
  
  -- Verificar si existe en email_campaigns
  SELECT EXISTS(SELECT 1 FROM public.email_campaigns WHERE user_id = v_user_id) INTO v_email_campaign_exists;

  -- Eliminar de auth.users (esto eliminará en cascada de todas las tablas con ON DELETE CASCADE)
  DELETE FROM auth.users WHERE id = v_user_id;

  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    format('Usuario eliminado exitosamente. Email: %s, ID: %s, Profile: %s, Email Campaign: %s', 
           user_email, 
           v_user_id, 
           CASE WHEN v_profile_exists THEN 'Sí' ELSE 'No' END,
           CASE WHEN v_email_campaign_exists THEN 'Sí' ELSE 'No' END),
    v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 3: Limpiar usuarios huérfanos actuales
-- =====================================================

-- A) Encontrar registros en email_campaigns sin usuario correspondiente en auth.users
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.email_campaigns ec
  LEFT JOIN auth.users au ON ec.user_id = au.id
  WHERE au.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Se encontraron % registros huérfanos en email_campaigns', orphan_count;
    
    -- Eliminar registros huérfanos
    DELETE FROM public.email_campaigns
    WHERE user_id IN (
      SELECT ec.user_id
      FROM public.email_campaigns ec
      LEFT JOIN auth.users au ON ec.user_id = au.id
      WHERE au.id IS NULL
    );
    
    RAISE NOTICE 'Se eliminaron % registros huérfanos de email_campaigns', orphan_count;
  ELSE
    RAISE NOTICE 'No se encontraron registros huérfanos en email_campaigns';
  END IF;
END $$;

-- B) Encontrar registros en profiles sin usuario correspondiente en auth.users
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE au.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Se encontraron % registros huérfanos en profiles', orphan_count;
    
    -- Eliminar registros huérfanos
    DELETE FROM public.profiles
    WHERE id IN (
      SELECT p.id
      FROM public.profiles p
      LEFT JOIN auth.users au ON p.id = au.id
      WHERE au.id IS NULL
    );
    
    RAISE NOTICE 'Se eliminaron % registros huérfanos de profiles', orphan_count;
  ELSE
    RAISE NOTICE 'No se encontraron registros huérfanos en profiles';
  END IF;
END $$;

-- =====================================================
-- PASO 4: EJEMPLOS DE USO
-- =====================================================

-- Para ver todos los usuarios actuales:
SELECT 
  au.id,
  au.email,
  au.created_at,
  p.full_name,
  CASE WHEN ec.user_id IS NOT NULL THEN 'Sí' ELSE 'No' END as en_email_campaign
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.email_campaigns ec ON au.id = ec.user_id
ORDER BY au.created_at DESC;

-- =====================================================
-- PASO 5: PARA ELIMINAR UN USUARIO DE PRUEBA
-- =====================================================

-- Descomenta y reemplaza con el email que quieres eliminar:
-- SELECT * FROM delete_user_by_email('email-de-prueba@ejemplo.com');

-- Para eliminar múltiples usuarios de prueba a la vez:
-- SELECT * FROM delete_user_by_email('prueba1@test.com');
-- SELECT * FROM delete_user_by_email('prueba2@test.com');
-- SELECT * FROM delete_user_by_email('prueba3@test.com');

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver el estado actual de usuarios, profiles y email_campaigns
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'profiles' as tabla,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'email_campaigns' as tabla,
  COUNT(*) as total
FROM public.email_campaigns;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script ARREGLA la estructura de la base de datos
-- 2. Después de ejecutar PASO 1 y 2, puedes usar la función delete_user_by_email()
-- 3. Para eliminar usuarios manualmente desde Supabase Dashboard:
--    - Ve a Authentication > Users
--    - Encuentra el usuario y haz click en el botón de eliminar (trash icon)
--    - Esto eliminará automáticamente de TODAS las tablas relacionadas
-- 4. NUNCA más elimines solo de profiles, siempre elimina desde auth.users
-- =====================================================

