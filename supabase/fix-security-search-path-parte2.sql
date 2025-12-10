-- =====================================================
-- CORREGIR ISSUES DE SEGURIDAD - SEARCH_PATH (PARTE 2)
-- =====================================================
-- Corrige las 3 funciones restantes con search_path vulnerable
-- =====================================================

-- =====================================================
-- 1. CORREGIR: delete_user_by_email
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_user_by_email(user_email TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- =====================================================
-- 2. CORREGIR: handle_new_user
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    RAISE WARNING '❌ No se encontró el plan gratuito (slug: free)';
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
    RAISE WARNING 'Error al crear perfil para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Asegurarse de que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. CORREGIR: update_updated_at_column
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recrear los triggers que usan esta función
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at 
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prestamos_updated_at ON public.prestamos;
CREATE TRIGGER update_prestamos_updated_at 
  BEFORE UPDATE ON public.prestamos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cuotas_updated_at ON public.cuotas;
CREATE TRIGGER update_cuotas_updated_at 
  BEFORE UPDATE ON public.cuotas
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_garantias_updated_at ON public.garantias;
CREATE TRIGGER update_garantias_updated_at 
  BEFORE UPDATE ON public.garantias
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las 3 funciones fueron actualizadas correctamente
SELECT 
  proname as funcion,
  CASE 
    WHEN prosrc LIKE '%SET search_path%' OR proconfig::text LIKE '%search_path%' THEN '✅ CORREGIDO'
    ELSE '❌ FALTA CORREGIR'
  END as estado
FROM pg_proc
WHERE proname IN (
  'delete_user_by_email',
  'handle_new_user',
  'update_updated_at_column'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Corrección de search_path completada (Parte 2)';
  RAISE NOTICE '🔒 3 funciones adicionales corregidas';
  RAISE NOTICE '📊 Total de funciones con search_path seguro: 9';
  RAISE NOTICE '🎉 Todos los warnings de seguridad deberían estar resueltos';
END $$;

